package service

import (
	"context"
	"errors"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/repository"
	"github.com/jackc/pgx/v5"
)

var ErrSecagemNotFound = errors.New("secagem nao encontrada")

type SecagemService struct {
	repo        *repository.SecagemRepository
	animalRepo  *repository.AnimalRepository
	fazendaRepo *repository.FazendaRepository
}

func NewSecagemService(repo *repository.SecagemRepository, animalRepo *repository.AnimalRepository, fazendaRepo *repository.FazendaRepository) *SecagemService {
	return &SecagemService{repo: repo, animalRepo: animalRepo, fazendaRepo: fazendaRepo}
}

func (s *SecagemService) Create(ctx context.Context, sec *models.Secagem) error {
	if sec.AnimalID <= 0 || sec.FazendaID <= 0 {
		return errors.New("animal_id e fazenda_id sao obrigatorios")
	}
	if sec.Motivo != nil && *sec.Motivo != "" {
		valid := false
		for _, m := range models.ValidMotivosSecagem() {
			if m == *sec.Motivo {
				valid = true
				break
			}
		}
		if !valid {
			return errors.New("motivo invalido")
		}
	}
	animal, err := s.animalRepo.GetByID(ctx, sec.AnimalID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrAnimalNotFound
		}
		return err
	}
	if animal.FazendaID != sec.FazendaID {
		return errors.New("animal deve ser da mesma fazenda")
	}
	if animal.Sexo != nil && *animal.Sexo != "F" {
		return errors.New("apenas femeas podem ter secagem")
	}
	if err := s.repo.Create(ctx, sec); err != nil {
		return err
	}
	status := models.StatusReprodutivoSeca
	return s.animalRepo.UpdateStatusReprodutivo(ctx, sec.AnimalID, &status)
}

func (s *SecagemService) GetByID(ctx context.Context, id int64) (*models.Secagem, error) {
	sec, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrSecagemNotFound
		}
		return nil, err
	}
	return sec, nil
}

func (s *SecagemService) GetByAnimalID(ctx context.Context, animalID int64) ([]*models.Secagem, error) {
	return s.repo.GetByAnimalID(ctx, animalID)
}

func (s *SecagemService) GetByFazendaID(ctx context.Context, fazendaID int64) ([]*models.Secagem, error) {
	return s.repo.GetByFazendaID(ctx, fazendaID)
}

func (s *SecagemService) Delete(ctx context.Context, id int64) error {
	_, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrSecagemNotFound
		}
		return err
	}
	return s.repo.Delete(ctx, id)
}
