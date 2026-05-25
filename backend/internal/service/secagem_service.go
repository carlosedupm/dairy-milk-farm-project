package service

import (
	"context"
	"errors"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/repository"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrSecagemNotFound = errors.New("secagem nao encontrada")

type SecagemService struct {
	pool        *pgxpool.Pool
	repo        *repository.SecagemRepository
	lactacaoRepo *repository.LactacaoRepository
	animalRepo  *repository.AnimalRepository
	fazendaRepo *repository.FazendaRepository
}

func NewSecagemService(
	pool *pgxpool.Pool,
	repo *repository.SecagemRepository,
	lactacaoRepo *repository.LactacaoRepository,
	animalRepo *repository.AnimalRepository,
	fazendaRepo *repository.FazendaRepository,
) *SecagemService {
	return &SecagemService{
		pool:         pool,
		repo:         repo,
		lactacaoRepo: lactacaoRepo,
		animalRepo:   animalRepo,
		fazendaRepo:  fazendaRepo,
	}
}

func (s *SecagemService) Create(ctx context.Context, sec *models.Secagem) error {
	if sec.AnimalID <= 0 || sec.FazendaID <= 0 {
		return errors.New("animal_id e fazenda_id sao obrigatorios")
	}
	if sec.Motivo != nil && *sec.Motivo != "" {
		valid := false
		for _, m := range models.ValidMotivosSecagem() {
			if m == *sec.Motivo {
				valid = true
				break
			}
		}
		if !valid {
			return errors.New("motivo invalido")
		}
	}
	animal, err := s.animalRepo.GetByID(ctx, sec.AnimalID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrAnimalNotFound
		}
		return err
	}
	if animal.FazendaID != sec.FazendaID {
		return errors.New("animal deve ser da mesma fazenda")
	}
	if animal.Sexo != nil && *animal.Sexo != "F" {
		return errors.New("apenas femeas podem ter secagem")
	}
	if err := EnsureAnimalNoRebanho(animal); err != nil {
		return err
	}
	if err := ValidateEventoDataCivilTemporal(animal, sec.DataSecagem); err != nil {
		return err
	}
	if err := ValidateSecagemAposInicioLactacao(ctx, s.lactacaoRepo, sec); err != nil {
		return err
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	committed := false
	defer func() {
		if !committed {
			_ = tx.Rollback(ctx)
		}
	}()

	if err := s.repo.CreateTx(ctx, tx, sec); err != nil {
		return err
	}

	if err := s.encerrarLactacaoAtivaSeExistirTx(ctx, tx, sec); err != nil {
		return err
	}

	status := models.StatusReprodutivoSeca
	if err := s.animalRepo.UpdateStatusReprodutivoTx(ctx, tx, sec.AnimalID, &status); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return err
	}
	committed = true
	return nil
}

func (s *SecagemService) encerrarLactacaoAtivaSeExistirTx(ctx context.Context, tx pgx.Tx, sec *models.Secagem) error {
	return EncerrarLactacaoAtivaTx(ctx, tx, s.lactacaoRepo, sec.AnimalID, sec.DataSecagem)
}

func (s *SecagemService) GetByID(ctx context.Context, id int64) (*models.Secagem, error) {
	sec, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrSecagemNotFound
		}
		return nil, err
	}
	return sec, nil
}

func (s *SecagemService) GetByAnimalID(ctx context.Context, animalID int64) ([]*models.Secagem, error) {
	return s.repo.GetByAnimalID(ctx, animalID)
}

func (s *SecagemService) GetByFazendaID(ctx context.Context, fazendaID int64) ([]*models.Secagem, error) {
	return s.repo.GetByFazendaID(ctx, fazendaID)
}

func (s *SecagemService) Delete(ctx context.Context, id int64) error {
	_, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrSecagemNotFound
		}
		return err
	}
	return s.repo.Delete(ctx, id)
}
