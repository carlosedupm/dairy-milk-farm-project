package service

import (
	"context"
	"errors"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/repository"
)

var ErrProducaoAgricolaNotFound = errors.New("produção agrícola não encontrada")

type ProducaoAgricolaService struct {
	repo *repository.ProducaoAgricolaRepository
}

func NewProducaoAgricolaService(repo *repository.ProducaoAgricolaRepository) *ProducaoAgricolaService {
	return &ProducaoAgricolaService{repo: repo}
}

func (s *ProducaoAgricolaService) Create(ctx context.Context, p *models.ProducaoAgricola) error {
	if p.SafraCulturaID <= 0 {
		return errors.New("safra_cultura_id é obrigatório")
	}
	if p.Destino == "" {
		return errors.New("destino é obrigatório")
	}
	if p.QuantidadeKg <= 0 {
		return errors.New("quantidade_kg deve ser maior que zero")
	}
	return s.repo.Create(ctx, p)
}

func (s *ProducaoAgricolaService) GetByID(ctx context.Context, id int64) (*models.ProducaoAgricola, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *ProducaoAgricolaService) GetBySafraCulturaID(ctx context.Context, safraCulturaID int64) ([]*models.ProducaoAgricola, error) {
	return s.repo.GetBySafraCulturaID(ctx, safraCulturaID)
}
