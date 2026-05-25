package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/repository"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrAnimalJaBaixado     = errors.New("animal ja possui baixa registrada")
	ErrMotivoBaixaPerfil   = errors.New("perfil nao autorizado para este motivo de baixa")
	ErrAnimalSemBaixa      = errors.New("animal nao possui baixa para reverter")
)

type AnimalBaixaService struct {
	pool            *pgxpool.Pool
	animalRepo      *repository.AnimalRepository
	lactacaoRepo    *repository.LactacaoRepository
	gestacaoRepo    *repository.GestacaoRepository
	restricaoRepo   *repository.RestricaoLeiteRepository
}

func NewAnimalBaixaService(
	pool *pgxpool.Pool,
	animalRepo *repository.AnimalRepository,
	lactacaoRepo *repository.LactacaoRepository,
	gestacaoRepo *repository.GestacaoRepository,
	restricaoRepo *repository.RestricaoLeiteRepository,
) *AnimalBaixaService {
	return &AnimalBaixaService{
		pool:          pool,
		animalRepo:    animalRepo,
		lactacaoRepo:  lactacaoRepo,
		gestacaoRepo:  gestacaoRepo,
		restricaoRepo: restricaoRepo,
	}
}

func (s *AnimalBaixaService) RegistrarBaixa(
	ctx context.Context,
	animalID int64,
	dataSaida time.Time,
	motivo string,
	observacao *string,
	actorPerfil string,
	actorUserID int64,
) (*models.Animal, error) {
	if !models.IsValidMotivoSaida(motivo) {
		return nil, errors.New("motivo de saida invalido")
	}
	if actorPerfil == models.PerfilFuncionario && motivo != models.MotivoSaidaMorte {
		return nil, ErrMotivoBaixaPerfil
	}

	animal, err := s.animalRepo.GetByID(ctx, animalID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrAnimalNotFound
		}
		return nil, err
	}
	if models.IsDataSaidaEfetiva(animal.DataSaida) {
		return nil, ErrAnimalJaBaixado
	}
	if animal.DataEntrada != nil {
		ent := time.Date(animal.DataEntrada.Year(), animal.DataEntrada.Month(), animal.DataEntrada.Day(), 0, 0, 0, 0, animal.DataEntrada.Location())
		sd := time.Date(dataSaida.Year(), dataSaida.Month(), dataSaida.Day(), 0, 0, 0, 0, dataSaida.Location())
		if sd.Before(ent) {
			return nil, errors.New("data de saida nao pode ser anterior a data de entrada")
		}
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	committed := false
	defer func() {
		if !committed {
			_ = tx.Rollback(ctx)
		}
	}()

	if err := s.animalRepo.UpdateSaidaTx(ctx, tx, animalID, dataSaida, motivo, observacao, actorUserID); err != nil {
		return nil, err
	}
	if err := EncerrarLactacaoAtivaTx(ctx, tx, s.lactacaoRepo, animalID, dataSaida); err != nil {
		return nil, err
	}
	if err := s.gestacaoRepo.CloseConfirmadaComoPerdaTx(ctx, tx, animalID); err != nil {
		return nil, err
	}
	if err := s.restricaoRepo.CancelAguardandoByAnimalTx(ctx, tx, animalID); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	committed = true

	return s.animalRepo.GetByID(ctx, animalID)
}

func (s *AnimalBaixaService) ReverterBaixa(ctx context.Context, animalID int64, actorUserID int64) (*models.Animal, error) {
	animal, err := s.animalRepo.GetByID(ctx, animalID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrAnimalNotFound
		}
		return nil, err
	}
	if animal.DataSaida == nil || animal.MotivoSaida == nil || *animal.MotivoSaida == "" {
		return nil, ErrAnimalSemBaixa
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	committed := false
	defer func() {
		if !committed {
			_ = tx.Rollback(ctx)
		}
	}()

	if err := s.animalRepo.ClearSaidaTx(ctx, tx, animalID, actorUserID); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	committed = true

	return s.animalRepo.GetByID(ctx, animalID)
}

// MotivoBaixaLabel retorna rótulo PT para API/UI.
func MotivoBaixaLabel(motivo string) string {
	switch motivo {
	case models.MotivoSaidaMorte:
		return "Morte"
	case models.MotivoSaidaVenda:
		return "Venda"
	case models.MotivoSaidaDoacao:
		return "Doação"
	case models.MotivoSaidaDescarte:
		return "Descarte (saída do animal)"
	default:
		return motivo
	}
}

// SaidaResumo monta resumo de saída para contexto do animal.
func SaidaResumo(animal *models.Animal) map[string]interface{} {
	if animal == nil || !models.IsDataSaidaEfetiva(animal.DataSaida) {
		return nil
	}
	out := map[string]interface{}{
		"data_saida": animal.DataSaida.Format("2006-01-02"),
	}
	if animal.MotivoSaida != nil {
		out["motivo_saida"] = *animal.MotivoSaida
		out["motivo_label"] = MotivoBaixaLabel(*animal.MotivoSaida)
	}
	if animal.ObservacaoSaida != nil && *animal.ObservacaoSaida != "" {
		out["observacao_saida"] = *animal.ObservacaoSaida
	}
	return out
}

func ValidateBaixaRequest(dataSaidaStr, motivo string) (time.Time, error) {
	if motivo == "" {
		return time.Time{}, errors.New("motivo de saida e obrigatorio")
	}
	if dataSaidaStr == "" {
		return time.Time{}, errors.New("data de saida e obrigatoria")
	}
	t, err := time.Parse("2006-01-02", dataSaidaStr)
	if err != nil {
		return time.Time{}, fmt.Errorf("data de saida invalida: %w", err)
	}
	return t, nil
}
