package service

import (
	"context"
	"errors"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/repository"
	"github.com/jackc/pgx/v5"
)

var ErrAreaNotFound = errors.New("área não encontrada")

type AreaService struct {
	repo *repository.AreaRepository
}

func NewAreaService(repo *repository.AreaRepository) *AreaService {
	return &AreaService{repo: repo}
}

func (s *AreaService) Create(ctx context.Context, a *models.Area) error {
	if a.Nome == "" {
		return errors.New("nome é obrigatório")
	}
	if a.Hectares <= 0 {
		return errors.New("hectares deve ser maior que zero")
	}
	return s.repo.Create(ctx, a)
}

func (s *AreaService) GetByID(ctx context.Context, id int64) (*models.Area, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *AreaService) GetByFazendaID(ctx context.Context, fazendaID int64) ([]*models.Area, error) {
	return s.repo.GetByFazendaID(ctx, fazendaID)
}

func (s *AreaService) Update(ctx context.Context, a *models.Area) error {
	_, err := s.repo.GetByID(ctx, a.ID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrAreaNotFound
		}
		return err
	}
	if a.Nome == "" {
		return errors.New("nome é obrigatório")
	}
	if a.Hectares <= 0 {
		return errors.New("hectares deve ser maior que zero")
	}
	return s.repo.Update(ctx, a)
}

func (s *AreaService) Delete(ctx context.Context, id int64) error {
	_, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrAreaNotFound
		}
		return err
	}
	return s.repo.Delete(ctx, id)
}
