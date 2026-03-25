package service

import (
	"context"
	"errors"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/repository"
)

var ErrReceitaAgricolaNotFound = errors.New("receita agrícola não encontrada")

type ReceitaAgricolaService struct {
	repo *repository.ReceitaAgricolaRepository
}

func NewReceitaAgricolaService(repo *repository.ReceitaAgricolaRepository) *ReceitaAgricolaService {
	return &ReceitaAgricolaService{repo: repo}
}

func (s *ReceitaAgricolaService) Create(ctx context.Context, r *models.ReceitaAgricola) error {
	if r.SafraCulturaID <= 0 {
		return errors.New("safra_cultura_id é obrigatório")
	}
	if r.Valor < 0 {
		return errors.New("valor não pode ser negativo")
	}
	return s.repo.Create(ctx, r)
}

func (s *ReceitaAgricolaService) GetByID(ctx context.Context, id int64) (*models.ReceitaAgricola, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *ReceitaAgricolaService) GetBySafraCulturaID(ctx context.Context, safraCulturaID int64) ([]*models.ReceitaAgricola, error) {
	return s.repo.GetBySafraCulturaID(ctx, safraCulturaID)
}
