package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/repository"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

var (
	ErrFolgasConfigNotFound     = repository.ErrFolgasConfigNotFound
	ErrFolgasSemPermissao       = errors.New("sem permissão para esta operação")
	ErrFolgasSlotsInvalidos     = errors.New("os três usuários do rodízio devem ser distintos e vinculados à fazenda")
	ErrFolgasConflitoFolgaDupla = errors.New("mais de um funcionário de folga neste dia: registre exceção do dia (motivo) ou justifique")
	ErrFolgasNaoEFolga          = errors.New("você não está de folga nesta data")
	ErrFolgasUsuarioJaFolgaDia = errors.New("já existe folga registrada para este usuário nesta data")
)

type FolgasService struct {
	repo       *repository.FolgasRepository
	fazendaSvc *FazendaService
}

func NewFolgasService(repo *repository.FolgasRepository, fazendaSvc *FazendaService) *FolgasService {
	return &FolgasService{repo: repo, fazendaSvc: fazendaSvc}
}

// FazendaService retorna o serviço de fazendas (validação de acesso nos handlers).
func (s *FolgasService) FazendaService() *FazendaService {
	return s.fazendaSvc
}

func truncateDateUTC(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC)
}

func isEscalaFolgasUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	if !errors.As(err, &pgErr) {
		return false
	}
	if pgErr.Code != "23505" { // unique_violation
		return false
	}
	// Postgres cria um nome padrão para constraint única, mas pode variar
	// (ex.: sufixos de migrações reaplicadas). Então, em vez de comparar
	// o nome exato, validamos por tabela/colunas no nome ou na mensagem.
	if pgErr.TableName != "" && strings.ToLower(pgErr.TableName) != "escala_folgas" {
		return false
	}

	constraint := strings.ToLower(pgErr.ConstraintName)
	if constraint == "" {
		// Fallback: quando ConstraintName não vem preenchida, usamos a mensagem.
		msg := strings.ToLower(pgErr.Message)
		return strings.Contains(msg, "duplicate key") &&
			strings.Contains(msg, "escala_folgas") &&
			strings.Contains(msg, "usuario_id")
	}

	// Ex.: "escala_folgas_fazenda_id_data_usuario_id_key" ou variações com sufixo.
	return strings.Contains(constraint, "escala_folgas") &&
		strings.Contains(constraint, "fazenda_id") &&
		strings.Contains(constraint, "data") &&
		strings.Contains(constraint, "usuario_id")
}

// UsuarioParaDia calcula quem folga no dia (rodízio 5x1 com 3 pessoas).
func UsuarioParaDia(cfg *models.FolgasEscalaConfig, d time.Time) (usuarioID int64, temFolga bool) {
	a := truncateDateUTC(cfg.DataAnchor)
	b := truncateDateUTC(d)
	days := int(b.Sub(a).Hours() / 24)
	idx := ((days % 6) + 6) % 6
	switch idx {
	case 0:
		return cfg.UsuarioSlot0, true
	case 1:
		return cfg.UsuarioSlot1, true
	case 2:
		return cfg.UsuarioSlot2, true
	default:
		return 0, false
	}
}

func (s *FolgasService) validarAcessoFazenda(ctx context.Context, fazendaID int64, perfil string, userID int64) error {
	if models.PodeGerenciarFolgas(perfil) {
		_, err := s.fazendaSvc.GetByID(ctx, fazendaID)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return fmt.Errorf("fazenda não encontrada")
			}
			return err
		}
		return nil
	}
	ok, err := s.repo.UsuarioTemFazenda(ctx, userID, fazendaID)
	if err != nil {
		return err
	}
	if !ok {
		return ErrFolgasSemPermissao
	}
	return nil
}

func (s *FolgasService) validarSlotsFazenda(ctx context.Context, fazendaID, s0, s1, s2 int64) error {
	if s0 == s1 || s0 == s2 || s1 == s2 {
		return ErrFolgasSlotsInvalidos
	}
	for _, uid := range []int64{s0, s1, s2} {
		ok, err := s.repo.UsuarioTemFazenda(ctx, uid, fazendaID)
		if err != nil {
			return err
		}
		if !ok {
			return ErrFolgasSlotsInvalidos
		}
	}
	return nil
}

// PutConfig cria/atualiza configuração da escala (gestão/admin/dev).
func (s *FolgasService) PutConfig(ctx context.Context, fazendaID int64, dataAnchor time.Time, s0, s1, s2 int64, actorID int64, perfil string) error {
	if !models.PodeGerenciarFolgas(perfil) {
		return ErrFolgasSemPermissao
	}
	if err := s.validarAcessoFazenda(ctx, fazendaID, perfil, actorID); err != nil {
		return err
	}
	if err := s.validarSlotsFazenda(ctx, fazendaID, s0, s1, s2); err != nil {
		return err
	}
	cfg := &models.FolgasEscalaConfig{
		FazendaID:    fazendaID,
		DataAnchor:   truncateDateUTC(dataAnchor),
		UsuarioSlot0: s0,
		UsuarioSlot1: s1,
		UsuarioSlot2: s2,
	}
	if err := s.repo.UpsertConfig(ctx, cfg); err != nil {
		return err
	}
	_ = s.repo.InsertAlteracao(ctx, &models.FolgaAlteracao{
		FazendaID: fazendaID,
		ActorID:   &actorID,
		Tipo:      "CONFIG",
		Detalhes: map[string]any{
			"data_anchor": cfg.DataAnchor.Format("2006-01-02"),
			"slot0":       s0, "slot1": s1, "slot2": s2,
		},
	})
	return nil
}

func (s *FolgasService) GetConfig(ctx context.Context, fazendaID int64, perfil string, userID int64) (*models.FolgasEscalaConfig, error) {
	if err := s.validarAcessoFazenda(ctx, fazendaID, perfil, userID); err != nil {
		return nil, err
	}
	c, err := s.repo.GetConfig(ctx, fazendaID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrFolgasConfigNotFound
		}
		return nil, err
	}
	return c, nil
}

// Gerar preenche dias com AUTO no intervalo (preserva dias com MANUAL).
func (s *FolgasService) Gerar(ctx context.Context, fazendaID int64, inicio, fim time.Time, actorID int64, perfil string) error {
	if !models.PodeGerenciarFolgas(perfil) {
		return ErrFolgasSemPermissao
	}
	if err := s.validarAcessoFazenda(ctx, fazendaID, perfil, actorID); err != nil {
		return err
	}
	cfg, err := s.repo.GetConfigOrErr(ctx, fazendaID)
	if err != nil {
		return err
	}
	inicio = truncateDateUTC(inicio)
	fim = truncateDateUTC(fim)
	if fim.Before(inicio) {
		return fmt.Errorf("data fim anterior à início")
	}
	if err := s.repo.DeleteAutoInRange(ctx, fazendaID, inicio, fim); err != nil {
		return err
	}
	for d := inicio; !d.After(fim); d = d.AddDate(0, 0, 1) {
		manual, err := s.repo.HasManualOnDate(ctx, fazendaID, d)
		if err != nil {
			return err
		}
		if manual {
			continue
		}
		uid, ok := UsuarioParaDia(cfg, d)
		if !ok {
			continue
		}
		e := &models.EscalaFolga{
			FazendaID: fazendaID,
			Data:      d,
			UsuarioID: uid,
			Origem:    models.FolgaOrigemAuto,
		}
		if err := s.repo.InsertEscala(ctx, e); err != nil {
			return err
		}
	}
	_ = s.repo.InsertAlteracao(ctx, &models.FolgaAlteracao{
		FazendaID: fazendaID,
		ActorID:   &actorID,
		Tipo:      "GERAR",
		Detalhes: map[string]any{
			"inicio": inicio.Format("2006-01-02"),
			"fim":    fim.Format("2006-01-02"),
		},
	})
	return nil
}

type AlterarDiaModo string

const (
	AlterarDiaSubstituir AlterarDiaModo = "substituir"
	AlterarDiaAdicionar  AlterarDiaModo = "adicionar"
)

// AlterarDia ajusta folga(s) em uma data (gestão).
func (s *FolgasService) AlterarDia(ctx context.Context, fazendaID int64, d time.Time, usuarioID int64, motivo string, modo AlterarDiaModo, excecaoDiaMotivo string, actorID int64, perfil string) error {
	if !models.PodeGerenciarFolgas(perfil) {
		return ErrFolgasSemPermissao
	}
	if err := s.validarAcessoFazenda(ctx, fazendaID, perfil, actorID); err != nil {
		return err
	}
	if motivo == "" {
		return fmt.Errorf("motivo é obrigatório")
	}
	if _, err := s.repo.GetConfigOrErr(ctx, fazendaID); err != nil {
		return err
	}
	okSlot, err := s.repo.UsuarioTemFazenda(ctx, usuarioID, fazendaID)
	if err != nil {
		return err
	}
	if !okSlot {
		return fmt.Errorf("usuário não vinculado à fazenda")
	}
	d = truncateDateUTC(d)

	if modo == AlterarDiaSubstituir || modo == "" {
		if err := s.repo.DeleteAllForDate(ctx, fazendaID, d); err != nil {
			return err
		}
		e := &models.EscalaFolga{
			FazendaID: fazendaID,
			Data:      d,
			UsuarioID: usuarioID,
			Origem:    models.FolgaOrigemManual,
			Motivo:    &motivo,
			CreatedBy: &actorID,
		}
		if err := s.repo.InsertEscala(ctx, e); err != nil {
			if isEscalaFolgasUniqueViolation(err) {
				return ErrFolgasUsuarioJaFolgaDia
			}
			return err
		}
	} else if modo == AlterarDiaAdicionar {
		e := &models.EscalaFolga{
			FazendaID: fazendaID,
			Data:      d,
			UsuarioID: usuarioID,
			Origem:    models.FolgaOrigemManual,
			Motivo:    &motivo,
			CreatedBy: &actorID,
		}
		if err := s.repo.InsertEscala(ctx, e); err != nil {
			if isEscalaFolgasUniqueViolation(err) {
				return ErrFolgasUsuarioJaFolgaDia
			}
			return err
		}
		n, err := s.repo.CountFolgasOnDate(ctx, fazendaID, d)
		if err != nil {
			return err
		}
		if n > 1 {
			_, exErr := s.repo.GetExcecaoDia(ctx, fazendaID, d)
			if exErr != nil && errors.Is(exErr, pgx.ErrNoRows) {
				if excecaoDiaMotivo == "" {
					return ErrFolgasConflitoFolgaDupla
				}
				ex := &models.FolgaExcecaoDia{
					FazendaID: fazendaID,
					Data:      d,
					Motivo:    excecaoDiaMotivo,
					CreatedBy: &actorID,
				}
				if err := s.repo.UpsertExcecaoDia(ctx, ex); err != nil {
					return err
				}
			}
		}
	} else {
		return fmt.Errorf("modo inválido")
	}

	_ = s.repo.InsertAlteracao(ctx, &models.FolgaAlteracao{
		FazendaID: fazendaID,
		ActorID:   &actorID,
		Tipo:      "ALTERAR_DIA",
		Detalhes: map[string]any{
			"data":       d.Format("2006-01-02"),
			"usuario_id": usuarioID,
			"motivo":     motivo,
			"modo":       string(modo),
		},
	})
	return nil
}

// AddJustificativa funcionário marca justificativa no próprio dia de folga.
func (s *FolgasService) AddJustificativa(ctx context.Context, fazendaID int64, d time.Time, usuarioLogado int64, motivo string, perfil string) error {
	if perfil != models.PerfilFuncionario {
		return ErrFolgasSemPermissao
	}
	if err := s.validarAcessoFazenda(ctx, fazendaID, perfil, usuarioLogado); err != nil {
		return err
	}
	if motivo == "" {
		return fmt.Errorf("motivo é obrigatório")
	}
	d = truncateDateUTC(d)
	rows, err := s.repo.ListFolgasUsuarioOnDate(ctx, fazendaID, d)
	if err != nil {
		return err
	}
	var meu bool
	for _, r := range rows {
		if r.UsuarioID == usuarioLogado {
			meu = true
			break
		}
	}
	if !meu {
		return ErrFolgasNaoEFolga
	}
	j := &models.FolgaJustificativa{
		FazendaID: fazendaID,
		Data:      d,
		UsuarioID: usuarioLogado,
		Motivo:    motivo,
		CreatedBy: usuarioLogado,
	}
	if err := s.repo.InsertJustificativa(ctx, j); err != nil {
		return err
	}
	m := motivo
	if err := s.repo.UpdateEscalaJustificada(ctx, fazendaID, d, usuarioLogado, true, &m); err != nil {
		return err
	}
	return nil
}

// ListEscala retorna linhas da escala no intervalo + previsto do rodízio por dia (inclusive dias sem registro).
func (s *FolgasService) ListEscala(ctx context.Context, fazendaID int64, inicio, fim time.Time, perfil string, userID int64) (*models.FolgasEscalaListResponse, error) {
	if err := s.validarAcessoFazenda(ctx, fazendaID, perfil, userID); err != nil {
		return nil, err
	}
	inicio = truncateDateUTC(inicio)
	fim = truncateDateUTC(fim)
	list, err := s.repo.ListEscalaRange(ctx, fazendaID, inicio, fim)
	if err != nil {
		return nil, err
	}
	out := &models.FolgasEscalaListResponse{Linhas: list, RodizioPorDia: nil}
	cfg, err := s.repo.GetConfig(ctx, fazendaID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return out, nil
		}
		return nil, err
	}
	nomes, err := s.repo.LookupNomesUsuarios(ctx, []int64{cfg.UsuarioSlot0, cfg.UsuarioSlot1, cfg.UsuarioSlot2})
	if err != nil {
		return nil, err
	}
	for d := inicio; !d.After(fim); d = d.AddDate(0, 0, 1) {
		uid, tem := UsuarioParaDia(cfg, d)
		rd := models.FolgasRodizioDia{Data: d, TemFolga: tem}
		if tem {
			u := uid
			rd.UsuarioID = &u
			if nm, ok := nomes[uid]; ok {
				n := nm
				rd.UsuarioNome = &n
			}
		}
		out.RodizioPorDia = append(out.RodizioPorDia, rd)
	}
	for i := range out.Linhas {
		uid, tem := UsuarioParaDia(cfg, out.Linhas[i].Data)
		out.Linhas[i].RodizioEsperadoTemFolga = tem
		if tem {
			u := uid
			out.Linhas[i].RodizioEsperadoUsuarioID = &u
			if nm, ok := nomes[uid]; ok {
				n := nm
				out.Linhas[i].RodizioEsperadoUsuarioNome = &n
			}
		}
	}
	return out, nil
}

// ResumoEquidade compara folgas registradas vs dias em que o rodízio prevê folga para cada um dos três slots (gestão).
func (s *FolgasService) ResumoEquidade(ctx context.Context, fazendaID int64, inicio, fim time.Time, perfil string, userID int64) ([]models.FolgaEquidadeResumo, error) {
	if !models.PodeGerenciarFolgas(perfil) {
		return nil, ErrFolgasSemPermissao
	}
	if err := s.validarAcessoFazenda(ctx, fazendaID, perfil, userID); err != nil {
		return nil, err
	}
	cfg, err := s.repo.GetConfigOrErr(ctx, fazendaID)
	if err != nil {
		return nil, err
	}
	inicio = truncateDateUTC(inicio)
	fim = truncateDateUTC(fim)
	if fim.Before(inicio) {
		return nil, fmt.Errorf("data fim anterior à início")
	}
	nomes, err := s.repo.LookupNomesUsuarios(ctx, []int64{cfg.UsuarioSlot0, cfg.UsuarioSlot1, cfg.UsuarioSlot2})
	if err != nil {
		return nil, err
	}
	slots := []int64{cfg.UsuarioSlot0, cfg.UsuarioSlot1, cfg.UsuarioSlot2}
	out := make([]models.FolgaEquidadeResumo, 0, len(slots))
	for _, uid := range slots {
		reg, err := s.repo.CountDistinctFolgasUsuarioRange(ctx, fazendaID, uid, inicio, fim)
		if err != nil {
			return nil, err
		}
		teo := 0
		for d := inicio; !d.After(fim); d = d.AddDate(0, 0, 1) {
			u, tem := UsuarioParaDia(cfg, d)
			if tem && u == uid {
				teo++
			}
		}
		r := int(reg)
		out = append(out, models.FolgaEquidadeResumo{
			UsuarioID:          uid,
			UsuarioNome:        nomes[uid],
			FolgasRegistradas:  r,
			FolgasTeoricasAuto: teo,
			Delta:              r - teo,
		})
	}
	return out, nil
}

func (s *FolgasService) ListAlteracoes(ctx context.Context, fazendaID int64, limit int, perfil string, userID int64) ([]models.FolgaAlteracao, error) {
	if err := s.validarAcessoFazenda(ctx, fazendaID, perfil, userID); err != nil {
		return nil, err
	}
	return s.repo.ListAlteracoes(ctx, fazendaID, limit)
}

func (s *FolgasService) ListAlertas(ctx context.Context, fazendaID int64, inicio, fim time.Time, perfil string, userID int64) ([]models.FolgaAlertaDia, error) {
	if err := s.validarAcessoFazenda(ctx, fazendaID, perfil, userID); err != nil {
		return nil, err
	}
	inicio = truncateDateUTC(inicio)
	fim = truncateDateUTC(fim)
	var alertas []models.FolgaAlertaDia
	for d := inicio; !d.After(fim); d = d.AddDate(0, 0, 1) {
		n, err := s.repo.CountFolgasOnDate(ctx, fazendaID, d)
		if err != nil {
			return nil, err
		}
		if n <= 1 {
			continue
		}
		if _, err := s.repo.GetExcecaoDia(ctx, fazendaID, d); err == nil {
			continue
		}
		rows, err := s.repo.ListFolgasUsuarioOnDate(ctx, fazendaID, d)
		if err != nil {
			return nil, err
		}
		allJust := true
		for _, r := range rows {
			if !r.Justificada {
				allJust = false
				break
			}
		}
		if allJust {
			continue
		}
		alertas = append(alertas, models.FolgaAlertaDia{
			Data:            d,
			QuantidadeFolga: int(n),
			MotivoAlerta:    "Mais de um funcionário de folga sem exceção do dia registrada ou sem todas as justificativas",
		})
	}
	return alertas, nil
}
