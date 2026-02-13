package service

import (
	"context"
	"errors"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/repository"
	"github.com/jackc/pgx/v5"
)

var ErrLactacaoNotFound = errors.New("lactacao nao encontrada")

type LactacaoService struct {
	repo        *repository.LactacaoRepository
	animalRepo  *repository.AnimalRepository
	fazendaRepo *repository.FazendaRepository
}

func NewLactacaoService(repo *repository.LactacaoRepository, animalRepo *repository.AnimalRepository, fazendaRepo *repository.FazendaRepository) *LactacaoService {
	return &LactacaoService{repo: repo, animalRepo: animalRepo, fazendaRepo: fazendaRepo}
}

func (s *LactacaoService) Create(ctx context.Context, l *models.Lactacao) error {
	if l.AnimalID <= 0 || l.FazendaID <= 0 || l.NumeroLactacao <= 0 {
		return errors.New("animal_id, fazenda_id e numero_lactacao sao obrigatorios")
	}
	animal, err := s.animalRepo.GetByID(ctx, l.AnimalID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrAnimalNotFound
		}
		return err
	}
	if animal.FazendaID != l.FazendaID {
		return errors.New("animal deve ser da mesma fazenda")
	}
	if l.Status != nil && *l.Status != "" {
		valid := false
		for _, st := range models.ValidStatusLactacao() {
			if st == *l.Status {
				valid = true
				break
			}
		}
		if !valid {
			return errors.New("status invalido")
		}
	}
	return s.repo.Create(ctx, l)
}

func (s *LactacaoService) GetByID(ctx context.Context, id int64) (*models.Lactacao, error) {
	l, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrLactacaoNotFound
		}
		return nil, err
	}
	return l, nil
}

func (s *LactacaoService) GetByAnimalID(ctx context.Context, animalID int64) ([]*models.Lactacao, error) {
	return s.repo.GetByAnimalID(ctx, animalID)
}

func (s *LactacaoService) GetByFazendaID(ctx context.Context, fazendaID int64) ([]*models.Lactacao, error) {
	return s.repo.GetByFazendaID(ctx, fazendaID)
}

func (s *LactacaoService) Update(ctx context.Context, l *models.Lactacao) error {
	if l.ID <= 0 {
		return errors.New("id invalido")
	}
	_, err := s.repo.GetByID(ctx, l.ID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrLactacaoNotFound
		}
		return err
	}
	return s.repo.Update(ctx, l)
}

func (s *LactacaoService) GetEmAndamentoByAnimalID(ctx context.Context, animalID int64) (*models.Lactacao, error) {
	return s.repo.GetEmAndamentoByAnimalID(ctx, animalID)
}
