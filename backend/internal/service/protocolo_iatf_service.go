package service

import (
	"context"
	"errors"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/repository"
	"github.com/jackc/pgx/v5"
)

var ErrProtocoloIATFNotFound = errors.New("protocolo IATF nao encontrado")

type ProtocoloIATFService struct {
	repo        *repository.ProtocoloIATFRepository
	fazendaRepo *repository.FazendaRepository
}

func NewProtocoloIATFService(repo *repository.ProtocoloIATFRepository, fazendaRepo *repository.FazendaRepository) *ProtocoloIATFService {
	return &ProtocoloIATFService{repo: repo, fazendaRepo: fazendaRepo}
}

func (s *ProtocoloIATFService) Create(ctx context.Context, p *models.ProtocoloIATF) error {
	if p.Nome == "" {
		return errors.New("nome e obrigatorio")
	}
	if p.FazendaID <= 0 {
		return errors.New("fazenda_id e obrigatorio")
	}
	_, err := s.fazendaRepo.GetByID(ctx, p.FazendaID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrFazendaNotFound
		}
		return err
	}
	return s.repo.Create(ctx, p)
}

func (s *ProtocoloIATFService) GetByID(ctx context.Context, id int64) (*models.ProtocoloIATF, error) {
	p, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrProtocoloIATFNotFound
		}
		return nil, err
	}
	return p, nil
}

func (s *ProtocoloIATFService) GetByFazendaID(ctx context.Context, fazendaID int64) ([]*models.ProtocoloIATF, error) {
	return s.repo.GetByFazendaID(ctx, fazendaID)
}

func (s *ProtocoloIATFService) Update(ctx context.Context, p *models.ProtocoloIATF) error {
	if p.ID <= 0 {
		return errors.New("id invalido")
	}
	_, err := s.repo.GetByID(ctx, p.ID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrProtocoloIATFNotFound
		}
		return err
	}
	return s.repo.Update(ctx, p)
}

func (s *ProtocoloIATFService) Delete(ctx context.Context, id int64) error {
	_, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrProtocoloIATFNotFound
		}
		return err
	}
	return s.repo.Delete(ctx, id)
}
