package service

import (
	"context"
	"errors"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/repository"
	"github.com/jackc/pgx/v5"
)

var ErrFornecedorNotFound = errors.New("fornecedor não encontrado")

type FornecedorService struct {
	repo *repository.FornecedorRepository
}

func NewFornecedorService(repo *repository.FornecedorRepository) *FornecedorService {
	return &FornecedorService{repo: repo}
}

func (s *FornecedorService) Create(ctx context.Context, f *models.Fornecedor) error {
	if f.Nome == "" {
		return errors.New("nome é obrigatório")
	}
	if f.Tipo == "" {
		f.Tipo = models.FornecedorTipoCooperativa
	}
	return s.repo.Create(ctx, f)
}

func (s *FornecedorService) GetByID(ctx context.Context, id int64) (*models.Fornecedor, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *FornecedorService) GetByFazendaID(ctx context.Context, fazendaID int64) ([]*models.Fornecedor, error) {
	return s.repo.GetByFazendaID(ctx, fazendaID)
}

func (s *FornecedorService) Update(ctx context.Context, f *models.Fornecedor) error {
	_, err := s.repo.GetByID(ctx, f.ID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrFornecedorNotFound
		}
		return err
	}
	if f.Nome == "" {
		return errors.New("nome é obrigatório")
	}
	return s.repo.Update(ctx, f)
}

func (s *FornecedorService) Delete(ctx context.Context, id int64) error {
	_, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrFornecedorNotFound
		}
		return err
	}
	return s.repo.Delete(ctx, id)
}
