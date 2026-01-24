package service

import (
	"context"
	"errors"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/repository"
	"github.com/jackc/pgx/v5"
)

var ErrFazendaNotFound = errors.New("fazenda não encontrada")

type FazendaService struct {
	repo *repository.FazendaRepository
}

func NewFazendaService(repo *repository.FazendaRepository) *FazendaService {
	return &FazendaService{repo: repo}
}

func (s *FazendaService) Create(ctx context.Context, fazenda *models.Fazenda) error {
	if fazenda.Nome == "" {
		return errors.New("nome é obrigatório")
	}
	return s.repo.Create(ctx, fazenda)
}

func (s *FazendaService) GetByID(ctx context.Context, id int64) (*models.Fazenda, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *FazendaService) GetAll(ctx context.Context) ([]*models.Fazenda, error) {
	return s.repo.GetAll(ctx)
}

func (s *FazendaService) Update(ctx context.Context, fazenda *models.Fazenda) error {
	if fazenda.Nome == "" {
		return errors.New("nome é obrigatório")
	}

	// Verificar se existe
	_, err := s.repo.GetByID(ctx, fazenda.ID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrFazendaNotFound
		}
		return err
	}

	return s.repo.Update(ctx, fazenda)
}

func (s *FazendaService) Delete(ctx context.Context, id int64) error {
	// Verificar se existe
	_, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrFazendaNotFound
		}
		return err
	}

	return s.repo.Delete(ctx, id)
}

func (s *FazendaService) SearchByNome(ctx context.Context, nome string) ([]*models.Fazenda, error) {
	return s.repo.SearchByNome(ctx, nome)
}

func (s *FazendaService) SearchByLocalizacao(ctx context.Context, loc string) ([]*models.Fazenda, error) {
	return s.repo.SearchByLocalizacao(ctx, loc)
}

func (s *FazendaService) SearchByVacasMin(ctx context.Context, qty int) ([]*models.Fazenda, error) {
	return s.repo.SearchByVacasMin(ctx, qty)
}

func (s *FazendaService) SearchByVacasRange(ctx context.Context, min, max int) ([]*models.Fazenda, error) {
	return s.repo.SearchByVacasRange(ctx, min, max)
}

func (s *FazendaService) Count(ctx context.Context) (int64, error) {
	return s.repo.Count(ctx)
}

func (s *FazendaService) ExistsByNome(ctx context.Context, nome string) (bool, error) {
	return s.repo.ExistsByNome(ctx, nome)
}
