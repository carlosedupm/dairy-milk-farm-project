package service

import (
	"context"
	"errors"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/repository"
	"github.com/jackc/pgx/v5"
)

var ErrGestacaoNotFound = errors.New("gestacao nao encontrada")

type GestacaoService struct {
	repo        *repository.GestacaoRepository
	animalRepo  *repository.AnimalRepository
	fazendaRepo *repository.FazendaRepository
}

func NewGestacaoService(repo *repository.GestacaoRepository, animalRepo *repository.AnimalRepository, fazendaRepo *repository.FazendaRepository) *GestacaoService {
	return &GestacaoService{repo: repo, animalRepo: animalRepo, fazendaRepo: fazendaRepo}
}

func (s *GestacaoService) Create(ctx context.Context, g *models.Gestacao) error {
	if g.AnimalID <= 0 || g.CoberturaID <= 0 || g.FazendaID <= 0 {
		return errors.New("animal_id, cobertura_id e fazenda_id sao obrigatorios")
	}
	valid := false
	for _, st := range models.ValidStatusGestacao() {
		if st == g.Status {
			valid = true
			break
		}
	}
	if !valid {
		return errors.New("status invalido")
	}
	animal, err := s.animalRepo.GetByID(ctx, g.AnimalID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrAnimalNotFound
		}
		return err
	}
	if animal.FazendaID != g.FazendaID {
		return errors.New("animal deve ser da mesma fazenda")
	}
	return s.repo.Create(ctx, g)
}

func (s *GestacaoService) GetByID(ctx context.Context, id int64) (*models.Gestacao, error) {
	g, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrGestacaoNotFound
		}
		return nil, err
	}
	return g, nil
}

func (s *GestacaoService) GetByAnimalID(ctx context.Context, animalID int64) ([]*models.Gestacao, error) {
	return s.repo.GetByAnimalID(ctx, animalID)
}

func (s *GestacaoService) GetByFazendaID(ctx context.Context, fazendaID int64) ([]*models.Gestacao, error) {
	return s.repo.GetByFazendaID(ctx, fazendaID)
}

func (s *GestacaoService) Update(ctx context.Context, g *models.Gestacao) error {
	if g.ID <= 0 {
		return errors.New("id invalido")
	}
	_, err := s.repo.GetByID(ctx, g.ID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrGestacaoNotFound
		}
		return err
	}
	return s.repo.Update(ctx, g)
}
