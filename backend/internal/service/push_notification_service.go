package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/SherClockHolmes/webpush-go"
	"github.com/ceialmilk/api/internal/config"
	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/repository"
	"github.com/jackc/pgx/v5"
)

var (
	ErrPushNotConfigured     = errors.New("web push não configurado")
	ErrFazendaAtivaSemVinculo = errors.New("fazenda não vinculada ao utilizador")
)

type PushSubscriptionInput struct {
	Endpoint  string
	P256dh    string
	Auth      string
	UserAgent *string
}

type pushPayload struct {
	Title string `json:"title"`
	Body  string `json:"body"`
	Icon  string `json:"icon"`
	Badge string `json:"badge"`
	Data  struct {
		URL        string `json:"url"`
		BadgeCount int64  `json:"badgeCount"`
	} `json:"data"`
}

type PushNotificationService struct {
	cfg        *config.Config
	subRepo    *repository.PushSubscriptionRepository
	fazendaRepo *repository.FazendaRepository
	alertaRepo *repository.AlertaRepository
	enabled    bool
}

func NewPushNotificationService(
	cfg *config.Config,
	subRepo *repository.PushSubscriptionRepository,
	fazendaRepo *repository.FazendaRepository,
	alertaRepo *repository.AlertaRepository,
) *PushNotificationService {
	enabled := cfg.VAPIDPublicKey != "" && cfg.VAPIDPrivateKey != ""
	if !enabled {
		slog.Warn("Web Push desabilitado: VAPID_PUBLIC_KEY ou VAPID_PRIVATE_KEY ausente")
	}
	return &PushNotificationService{
		cfg:         cfg,
		subRepo:     subRepo,
		fazendaRepo: fazendaRepo,
		alertaRepo:  alertaRepo,
		enabled:     enabled,
	}
}

func (s *PushNotificationService) Enabled() bool {
	return s.enabled
}

func (s *PushNotificationService) GetVapidPublicKey() (string, error) {
	if !s.enabled {
		return "", ErrPushNotConfigured
	}
	return s.cfg.VAPIDPublicKey, nil
}

func (s *PushNotificationService) UpsertSubscription(ctx context.Context, usuarioID int64, in PushSubscriptionInput) error {
	endpoint := strings.TrimSpace(in.Endpoint)
	p256dh := strings.TrimSpace(in.P256dh)
	auth := strings.TrimSpace(in.Auth)
	if endpoint == "" || p256dh == "" || auth == "" {
		return errors.New("subscription inválida")
	}
	return s.subRepo.Upsert(ctx, &models.PushSubscription{
		UsuarioID: usuarioID,
		Endpoint:  endpoint,
		P256dh:    p256dh,
		Auth:      auth,
		UserAgent: in.UserAgent,
	})
}

func (s *PushNotificationService) DeleteSubscription(ctx context.Context, usuarioID int64, endpoint string) error {
	endpoint = strings.TrimSpace(endpoint)
	if endpoint == "" {
		return errors.New("endpoint é obrigatório")
	}
	err := s.subRepo.DeleteByEndpoint(ctx, usuarioID, endpoint)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil
	}
	return err
}

func (s *PushNotificationService) UpdateFazendaAtiva(ctx context.Context, usuarioID, fazendaID int64) error {
	err := s.fazendaRepo.UpdateUsuarioFazendaAtiva(ctx, usuarioID, fazendaID)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrFazendaAtivaSemVinculo
	}
	return err
}

func (s *PushNotificationService) NotifyAlertaCreated(alerta *models.AlertaWithNames) {
	if alerta == nil || !s.enabled {
		return
	}
	if !models.ShouldNotifyPushForSeveridade(alerta.Severidade) {
		return
	}
	go s.dispatchAlertaPush(alerta)
}

func (s *PushNotificationService) dispatchAlertaPush(alerta *models.AlertaWithNames) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	userIDs, err := s.fazendaRepo.ListUsuarioIDsForAlertaPush(ctx, alerta.FazendaID)
	if err != nil {
		slog.Warn("push: listar destinatários", "error", err, "fazenda_id", alerta.FazendaID)
		return
	}
	if len(userIDs) == 0 {
		return
	}

	badgeCount, err := s.alertaRepo.CountCriticosAbertosByFazenda(ctx, alerta.FazendaID)
	if err != nil {
		slog.Warn("push: contar críticos abertos", "error", err)
		badgeCount = 0
	}

	payload, err := s.buildPayload(alerta, badgeCount)
	if err != nil {
		slog.Warn("push: montar payload", "error", err)
		return
	}

	for _, uid := range userIDs {
		subs, err := s.subRepo.ListByUsuarioID(ctx, uid)
		if err != nil {
			slog.Warn("push: listar subscriptions", "error", err, "usuario_id", uid)
			continue
		}
		for _, sub := range subs {
			s.sendOne(ctx, sub, payload)
		}
	}
}

func (s *PushNotificationService) buildPayload(alerta *models.AlertaWithNames, badgeCount int64) ([]byte, error) {
	prefix := models.SeveridadePushPrefix(alerta.Severidade)
	title := alerta.Titulo
	if prefix != "" {
		title = prefix + " " + title
	}

	body := models.LabelTipoAlerta(alerta.Tipo)
	if alerta.AnimalIdentificacao != nil && strings.TrimSpace(*alerta.AnimalIdentificacao) != "" {
		body = body + " — " + strings.TrimSpace(*alerta.AnimalIdentificacao)
	}

	var p pushPayload
	p.Title = title
	p.Body = body
	p.Icon = "/icons/icon-192.svg"
	p.Badge = "/icons/icon-192.svg"
	p.Data.URL = fmt.Sprintf("/alertas?tipo=%s", alerta.Tipo)
	p.Data.BadgeCount = badgeCount
	return json.Marshal(p)
}

func (s *PushNotificationService) sendOne(ctx context.Context, sub models.PushSubscription, payload []byte) {
	subscription := &webpush.Subscription{
		Endpoint: sub.Endpoint,
		Keys: webpush.Keys{
			P256dh: sub.P256dh,
			Auth:   sub.Auth,
		},
	}

	resp, err := webpush.SendNotification(payload, subscription, &webpush.Options{
		Subscriber:      s.cfg.VAPIDSubject,
		VAPIDPublicKey:  s.cfg.VAPIDPublicKey,
		VAPIDPrivateKey: s.cfg.VAPIDPrivateKey,
		TTL:             86400,
	})
	if err != nil {
		slog.Warn("push: envio falhou", "error", err, "endpoint", sub.Endpoint)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusGone || resp.StatusCode == http.StatusNotFound {
		if err := s.subRepo.DeleteByEndpointOnly(ctx, sub.Endpoint); err != nil {
			slog.Warn("push: remover subscription expirada", "error", err)
		}
		return
	}
	if resp.StatusCode >= 400 {
		slog.Warn("push: resposta inesperada", "status", resp.StatusCode, "endpoint", sub.Endpoint)
	}
}
