package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/repository"
	"github.com/jackc/pgx/v5"
)

var (
	ErrAlertaNotFound           = errors.New("alerta não encontrado")
	ErrAlertaTipoInvalido       = errors.New("tipo de alerta inválido")
	ErrAlertaSeveridadeInvalida = errors.New("severidade inválida")
	ErrAlertaStatusInvalido     = errors.New("status inválido")
	ErrAlertaTransicaoInvalida  = errors.New("transição de status inválida")
	ErrAlertaSomenteManual      = errors.New("apenas alertas manuais podem ser excluídos")
	ErrAlertaAnimalFazenda      = errors.New("animal não pertence à fazenda informada")
	ErrAlertaForbidden          = errors.New("perfil não autorizado para esta operação")
	ErrAlertaTituloObrigatorio  = errors.New("título é obrigatório")
	ErrAlertaSomenteManualCreate = errors.New("apenas alertas manuais podem ser criados via API")
)

type alertaStore interface {
	ListByFazenda(ctx context.Context, fazendaID int64, f repository.AlertaListFilters) ([]models.AlertaWithNames, int64, error)
	GetByID(ctx context.Context, fazendaID, alertaID int64) (*models.AlertaWithNames, error)
	Create(ctx context.Context, row *models.Alerta) error
	UpdateStatus(ctx context.Context, fazendaID, alertaID int64, status string, resolvidoPor *int64, resolvidoEm *time.Time) error
	Delete(ctx context.Context, fazendaID, alertaID int64) error
}

type alertaAnimalStore interface {
	GetByID(ctx context.Context, id int64) (*models.Animal, error)
}

type AlertaService struct {
	repo       alertaStore
	animalRepo alertaAnimalStore
	pushSvc    *PushNotificationService
}

func NewAlertaService(repo *repository.AlertaRepository, animalRepo *repository.AnimalRepository) *AlertaService {
	return &AlertaService{repo: repo, animalRepo: animalRepo}
}

func (s *AlertaService) SetPushNotificationService(pushSvc *PushNotificationService) {
	s.pushSvc = pushSvc
}

type AlertaListQuery struct {
	Status     string
	Tipo       string
	Severidade string
	Limit      int
	Offset     int
}

func (s *AlertaService) ListByFazenda(ctx context.Context, fazendaID int64, q AlertaListQuery) ([]models.AlertaWithNames, int64, error) {
	if q.Status != "" && !models.IsValidAlertaStatus(q.Status) {
		return nil, 0, ErrAlertaStatusInvalido
	}
	if q.Tipo != "" && !models.IsValidAlertaTipo(q.Tipo) {
		return nil, 0, ErrAlertaTipoInvalido
	}
	if q.Severidade != "" && !models.IsValidAlertaSeveridade(q.Severidade) {
		return nil, 0, ErrAlertaSeveridadeInvalida
	}

	limit := q.Limit
	if limit <= 0 {
		limit = 25
	}
	if limit > 100 {
		limit = 100
	}
	offset := q.Offset
	if offset < 0 {
		offset = 0
	}

	return s.repo.ListByFazenda(ctx, fazendaID, repository.AlertaListFilters{
		Status:     q.Status,
		Tipo:       q.Tipo,
		Severidade: q.Severidade,
		Limit:      limit,
		Offset:     offset,
	})
}

func (s *AlertaService) GetByID(ctx context.Context, fazendaID, alertaID int64) (*models.AlertaWithNames, error) {
	row, err := s.repo.GetByID(ctx, fazendaID, alertaID)
	if err != nil {
		return nil, err
	}
	if row == nil {
		return nil, ErrAlertaNotFound
	}
	return row, nil
}

type CreateAlertaInput struct {
	FazendaID    int64
	Tipo         string
	Titulo       string
	Descricao    *string
	AnimalID     *int64
	DataPrevista *time.Time
	Severidade   string
	CreatedBy    int64
}

func (s *AlertaService) Create(ctx context.Context, in CreateAlertaInput, perfil string) (*models.AlertaWithNames, error) {
	if !models.PodeCriarAlertaManual(perfil) {
		return nil, ErrAlertaForbidden
	}
	if in.Tipo != models.AlertaTipoManual {
		return nil, ErrAlertaSomenteManualCreate
	}
	titulo := strings.TrimSpace(in.Titulo)
	if titulo == "" {
		return nil, ErrAlertaTituloObrigatorio
	}
	if !models.IsValidAlertaSeveridade(in.Severidade) {
		return nil, ErrAlertaSeveridadeInvalida
	}

	if in.AnimalID != nil {
		animal, err := s.animalRepo.GetByID(ctx, *in.AnimalID)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, ErrAnimalNotFound
			}
			return nil, err
		}
		if animal.FazendaID != in.FazendaID {
			return nil, ErrAlertaAnimalFazenda
		}
		if err := EnsureAnimalNoRebanho(animal); err != nil {
			return nil, err
		}
	}

	row := &models.Alerta{
		FazendaID:    in.FazendaID,
		AnimalID:     in.AnimalID,
		Tipo:         models.AlertaTipoManual,
		Severidade:   in.Severidade,
		Titulo:       titulo,
		Descricao:    in.Descricao,
		DataPrevista: in.DataPrevista,
		Status:       models.AlertaStatusAberto,
		CreatedBy:    in.CreatedBy,
	}

	if err := s.repo.Create(ctx, row); err != nil {
		return nil, err
	}
	created, err := s.repo.GetByID(ctx, in.FazendaID, row.ID)
	if err != nil {
		return nil, err
	}
	if s.pushSvc != nil {
		s.pushSvc.NotifyAlertaCreated(created)
	}
	return created, nil
}

type UpdateAlertaStatusInput struct {
	Status      string
	ActorUserID int64
	Perfil      string
}

func (s *AlertaService) UpdateStatus(ctx context.Context, fazendaID, alertaID int64, in UpdateAlertaStatusInput) (*models.AlertaWithNames, error) {
	if !models.IsValidAlertaStatus(in.Status) {
		return nil, ErrAlertaStatusInvalido
	}

	existing, err := s.repo.GetByID(ctx, fazendaID, alertaID)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		return nil, ErrAlertaNotFound
	}

	if !models.IsTransicaoAlertaStatusValida(existing.Status, in.Status) {
		return nil, ErrAlertaTransicaoInvalida
	}

	if err := s.validateStatusTransitionPermission(existing.Status, in.Status, in.Perfil); err != nil {
		return nil, err
	}

	var resolvidoPor *int64
	var resolvidoEm *time.Time
	if in.Status == models.AlertaStatusResolvido || in.Status == models.AlertaStatusIgnorado {
		resolvidoPor = &in.ActorUserID
		now := time.Now().UTC()
		resolvidoEm = &now
	}

	if err := s.repo.UpdateStatus(ctx, fazendaID, alertaID, in.Status, resolvidoPor, resolvidoEm); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrAlertaNotFound
		}
		return nil, err
	}
	return s.repo.GetByID(ctx, fazendaID, alertaID)
}

func (s *AlertaService) validateStatusTransitionPermission(from, to, perfil string) error {
	if to == models.AlertaStatusEmAndamento {
		if !models.PodeMarcarAlertaEmAndamento(perfil) {
			return ErrAlertaForbidden
		}
		if from != models.AlertaStatusAberto {
			return ErrAlertaTransicaoInvalida
		}
		return nil
	}
	if to == models.AlertaStatusResolvido || to == models.AlertaStatusIgnorado {
		if !models.PodeResolverOuIgnorarAlerta(perfil) {
			return ErrAlertaForbidden
		}
		return nil
	}
	return ErrAlertaTransicaoInvalida
}

func (s *AlertaService) Delete(ctx context.Context, fazendaID, alertaID int64, perfil string) error {
	if !models.PodeExcluirAlerta(perfil) {
		return ErrAlertaForbidden
	}

	existing, err := s.repo.GetByID(ctx, fazendaID, alertaID)
	if err != nil {
		return err
	}
	if existing == nil {
		return ErrAlertaNotFound
	}
	if existing.Tipo != models.AlertaTipoManual {
		return ErrAlertaSomenteManual
	}

	if err := s.repo.Delete(ctx, fazendaID, alertaID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrAlertaNotFound
		}
		return err
	}
	return nil
}
