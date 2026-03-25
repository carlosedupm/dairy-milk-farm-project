package service

import (
	"context"
	"errors"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/repository"
	"github.com/jackc/pgx/v5"
)

var ErrSafraCulturaNotFound = errors.New("safra/cultura não encontrada")

type SafraCulturaService struct {
	repo     *repository.SafraCulturaRepository
	areaRepo *repository.AreaRepository
}

func NewSafraCulturaService(repo *repository.SafraCulturaRepository, areaRepo *repository.AreaRepository) *SafraCulturaService {
	return &SafraCulturaService{repo: repo, areaRepo: areaRepo}
}

func (s *SafraCulturaService) Create(ctx context.Context, sc *models.SafraCultura) error {
	if sc.AreaID <= 0 {
		return errors.New("area_id é obrigatório")
	}
	if sc.Ano <= 0 {
		return errors.New("ano é obrigatório")
	}
	if sc.Cultura == "" {
		return errors.New("cultura é obrigatória")
	}
	if sc.Status == "" {
		sc.Status = models.SafraCulturaStatusPlantada
	}
	return s.repo.Create(ctx, sc)
}

func (s *SafraCulturaService) GetByID(ctx context.Context, id int64) (*models.SafraCultura, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *SafraCulturaService) GetByAreaIDAndAno(ctx context.Context, areaID int64, ano int) ([]*models.SafraCultura, error) {
	return s.repo.GetByAreaIDAndAno(ctx, areaID, ano)
}

func (s *SafraCulturaService) Update(ctx context.Context, sc *models.SafraCultura) error {
	_, err := s.repo.GetByID(ctx, sc.ID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrSafraCulturaNotFound
		}
		return err
	}
	return s.repo.Update(ctx, sc)
}

func (s *SafraCulturaService) Delete(ctx context.Context, id int64) error {
	_, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrSafraCulturaNotFound
		}
		return err
	}
	return s.repo.Delete(ctx, id)
}
