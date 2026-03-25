package service

import (
	"context"
	"errors"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/repository"
	"github.com/jackc/pgx/v5"
)

var ErrAnaliseSoloNotFound = errors.New("análise de solo não encontrada")

type AnaliseSoloService struct {
	repo *repository.AnaliseSoloRepository
}

func NewAnaliseSoloService(repo *repository.AnaliseSoloRepository) *AnaliseSoloService {
	return &AnaliseSoloService{repo: repo}
}

func (s *AnaliseSoloService) Create(ctx context.Context, a *models.AnaliseSolo) error {
	if a.AreaID <= 0 {
		return errors.New("area_id é obrigatório")
	}
	return s.repo.Create(ctx, a)
}

func (s *AnaliseSoloService) GetByID(ctx context.Context, id int64) (*models.AnaliseSolo, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *AnaliseSoloService) GetByAreaID(ctx context.Context, areaID int64) ([]*models.AnaliseSolo, error) {
	return s.repo.GetByAreaID(ctx, areaID)
}

func (s *AnaliseSoloService) Update(ctx context.Context, a *models.AnaliseSolo) error {
	_, err := s.repo.GetByID(ctx, a.ID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrAnaliseSoloNotFound
		}
		return err
	}
	return s.repo.Update(ctx, a)
}

func (s *AnaliseSoloService) Delete(ctx context.Context, id int64) error {
	_, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrAnaliseSoloNotFound
		}
		return err
	}
	return s.repo.Delete(ctx, id)
}
