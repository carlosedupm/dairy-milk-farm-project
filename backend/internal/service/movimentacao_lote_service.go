package service

import (
	"context"
	"errors"
	"time"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/repository"
	"github.com/jackc/pgx/v5"
)

type MovimentacaoLoteService struct {
	repo       *repository.MovimentacaoLoteRepository
	animalRepo *repository.AnimalRepository
	loteRepo   *repository.LoteRepository
}

func NewMovimentacaoLoteService(repo *repository.MovimentacaoLoteRepository, animalRepo *repository.AnimalRepository, loteRepo *repository.LoteRepository) *MovimentacaoLoteService {
	return &MovimentacaoLoteService{repo: repo, animalRepo: animalRepo, loteRepo: loteRepo}
}

func (s *MovimentacaoLoteService) Create(ctx context.Context, m *models.MovimentacaoLote) error {
	if m.AnimalID <= 0 || m.LoteDestinoID <= 0 || m.UsuarioID <= 0 {
		return errors.New("animal_id, lote_destino_id e usuario_id sao obrigatorios")
	}
	animal, err := s.animalRepo.GetByID(ctx, m.AnimalID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrAnimalNotFound
		}
		return err
	}
	loteDest, err := s.loteRepo.GetByID(ctx, m.LoteDestinoID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrLoteNotFound
		}
		return err
	}
	if loteDest.FazendaID != animal.FazendaID {
		return errors.New("lote de destino deve ser da mesma fazenda do animal")
	}
	if m.Data.IsZero() {
		m.Data = time.Now()
	}
	if err := s.repo.Create(ctx, m); err != nil {
		return err
	}
	return s.animalRepo.UpdateLoteID(ctx, m.AnimalID, &m.LoteDestinoID)
}

func (s *MovimentacaoLoteService) GetByAnimalID(ctx context.Context, animalID int64) ([]*models.MovimentacaoLote, error) {
	return s.repo.GetByAnimalID(ctx, animalID)
}
