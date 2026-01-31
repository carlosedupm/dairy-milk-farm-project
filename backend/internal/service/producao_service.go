package service

import (
	"context"
	"errors"
	"time"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/repository"
	"github.com/jackc/pgx/v5"
)

var ErrProducaoNotFound = errors.New("registro de produção não encontrado")

type ProducaoService struct {
	repo       *repository.ProducaoRepository
	animalRepo *repository.AnimalRepository
}

func NewProducaoService(repo *repository.ProducaoRepository, animalRepo *repository.AnimalRepository) *ProducaoService {
	return &ProducaoService{repo: repo, animalRepo: animalRepo}
}

func (s *ProducaoService) Create(ctx context.Context, producao *models.ProducaoLeite) error {
	// Validações básicas
	if producao.AnimalID <= 0 {
		return errors.New("animal_id é obrigatório")
	}
	if producao.Quantidade <= 0 {
		return errors.New("quantidade deve ser maior que zero")
	}
	if producao.DataHora.IsZero() {
		producao.DataHora = time.Now()
	}

	// Verificar se o animal existe
	_, err := s.animalRepo.GetByID(ctx, producao.AnimalID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return errors.New("animal não encontrado")
		}
		return err
	}

	// Validar qualidade se fornecida (1-10)
	if producao.Qualidade != nil && (*producao.Qualidade < 1 || *producao.Qualidade > 10) {
		return errors.New("qualidade deve estar entre 1 e 10")
	}

	return s.repo.Create(ctx, producao)
}

func (s *ProducaoService) GetByID(ctx context.Context, id int64) (*models.ProducaoLeite, error) {
	producao, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrProducaoNotFound
		}
		return nil, err
	}
	return producao, nil
}

func (s *ProducaoService) GetAll(ctx context.Context) ([]*models.ProducaoLeite, error) {
	return s.repo.GetAll(ctx)
}

func (s *ProducaoService) GetByAnimalID(ctx context.Context, animalID int64) ([]*models.ProducaoLeite, error) {
	// Verificar se o animal existe
	_, err := s.animalRepo.GetByID(ctx, animalID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrAnimalNotFound
		}
		return nil, err
	}

	return s.repo.GetByAnimalID(ctx, animalID)
}

func (s *ProducaoService) GetByDateRange(ctx context.Context, startDate, endDate time.Time) ([]*models.ProducaoLeite, error) {
	if startDate.After(endDate) {
		return nil, errors.New("data inicial não pode ser posterior à data final")
	}
	return s.repo.GetByDateRange(ctx, startDate, endDate)
}

func (s *ProducaoService) GetByAnimalAndDateRange(ctx context.Context, animalID int64, startDate, endDate time.Time) ([]*models.ProducaoLeite, error) {
	if startDate.After(endDate) {
		return nil, errors.New("data inicial não pode ser posterior à data final")
	}
	return s.repo.GetByAnimalAndDateRange(ctx, animalID, startDate, endDate)
}

func (s *ProducaoService) Update(ctx context.Context, producao *models.ProducaoLeite) error {
	// Validações básicas
	if producao.AnimalID <= 0 {
		return errors.New("animal_id é obrigatório")
	}
	if producao.Quantidade <= 0 {
		return errors.New("quantidade deve ser maior que zero")
	}

	// Verificar se a produção existe
	_, err := s.repo.GetByID(ctx, producao.ID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrProducaoNotFound
		}
		return err
	}

	// Verificar se o animal existe
	_, err = s.animalRepo.GetByID(ctx, producao.AnimalID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return errors.New("animal não encontrado")
		}
		return err
	}

	// Validar qualidade se fornecida (1-10)
	if producao.Qualidade != nil && (*producao.Qualidade < 1 || *producao.Qualidade > 10) {
		return errors.New("qualidade deve estar entre 1 e 10")
	}

	return s.repo.Update(ctx, producao)
}

func (s *ProducaoService) Delete(ctx context.Context, id int64) error {
	// Verificar se existe
	_, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrProducaoNotFound
		}
		return err
	}

	return s.repo.Delete(ctx, id)
}

func (s *ProducaoService) Count(ctx context.Context) (int64, error) {
	return s.repo.Count(ctx)
}

func (s *ProducaoService) CountByAnimal(ctx context.Context, animalID int64) (int64, error) {
	return s.repo.CountByAnimal(ctx, animalID)
}

func (s *ProducaoService) GetResumoByAnimal(ctx context.Context, animalID int64) (*models.ProducaoResumo, error) {
	// Verificar se o animal existe
	_, err := s.animalRepo.GetByID(ctx, animalID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrAnimalNotFound
		}
		return nil, err
	}

	return s.repo.GetResumoByAnimal(ctx, animalID)
}
