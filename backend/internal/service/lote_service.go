package service

import (
	"context"
	"errors"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/repository"
	"github.com/jackc/pgx/v5"
)

var ErrLoteNotFound = errors.New("lote nao encontrado")

type LoteService struct {
	repo        *repository.LoteRepository
	fazendaRepo *repository.FazendaRepository
}

func NewLoteService(repo *repository.LoteRepository, fazendaRepo *repository.FazendaRepository) *LoteService {
	return &LoteService{repo: repo, fazendaRepo: fazendaRepo}
}

func (s *LoteService) Create(ctx context.Context, lote *models.Lote) error {
	if lote.Nome == "" {
		return errors.New("nome e obrigatorio")
	}
	if lote.FazendaID <= 0 {
		return errors.New("fazenda_id e obrigatorio")
	}
	if lote.Tipo != nil && *lote.Tipo != "" && !models.IsValidTipoLote(*lote.Tipo) {
		return errors.New("tipo de lote invalido")
	}
	_, err := s.fazendaRepo.GetByID(ctx, lote.FazendaID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrFazendaNotFound
		}
		return err
	}
	return s.repo.Create(ctx, lote)
}

func (s *LoteService) GetByID(ctx context.Context, id int64) (*models.Lote, error) {
	lote, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrLoteNotFound
		}
		return nil, err
	}
	return lote, nil
}

func (s *LoteService) GetByFazendaID(ctx context.Context, fazendaID int64) ([]*models.Lote, error) {
	_, err := s.fazendaRepo.GetByID(ctx, fazendaID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrFazendaNotFound
		}
		return nil, err
	}
	return s.repo.GetByFazendaID(ctx, fazendaID)
}

func (s *LoteService) Update(ctx context.Context, lote *models.Lote) error {
	if lote.ID <= 0 {
		return errors.New("id invalido")
	}
	if lote.Nome == "" {
		return errors.New("nome e obrigatorio")
	}
	if lote.Tipo != nil && *lote.Tipo != "" && !models.IsValidTipoLote(*lote.Tipo) {
		return errors.New("tipo de lote invalido")
	}
	_, err := s.repo.GetByID(ctx, lote.ID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrLoteNotFound
		}
		return err
	}
	return s.repo.Update(ctx, lote)
}

func (s *LoteService) Delete(ctx context.Context, id int64) error {
	_, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrLoteNotFound
		}
		return err
	}
	return s.repo.Delete(ctx, id)
}
