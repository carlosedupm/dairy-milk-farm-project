package service

import (
	"context"
	"errors"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/repository"
)

var ErrCustoAgricolaNotFound = errors.New("custo agrícola não encontrado")

type CustoAgricolaService struct {
	repo *repository.CustoAgricolaRepository
}

func NewCustoAgricolaService(repo *repository.CustoAgricolaRepository) *CustoAgricolaService {
	return &CustoAgricolaService{repo: repo}
}

func (s *CustoAgricolaService) Create(ctx context.Context, c *models.CustoAgricola) error {
	if c.SafraCulturaID <= 0 {
		return errors.New("safra_cultura_id é obrigatório")
	}
	if c.Tipo == "" {
		return errors.New("tipo é obrigatório")
	}
	if c.Valor < 0 {
		return errors.New("valor não pode ser negativo")
	}
	return s.repo.Create(ctx, c)
}

func (s *CustoAgricolaService) GetByID(ctx context.Context, id int64) (*models.CustoAgricola, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *CustoAgricolaService) GetBySafraCulturaID(ctx context.Context, safraCulturaID int64) ([]*models.CustoAgricola, error) {
	return s.repo.GetBySafraCulturaID(ctx, safraCulturaID)
}
