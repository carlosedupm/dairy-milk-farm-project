package service

import (
	"context"
	"errors"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/repository"
	"github.com/jackc/pgx/v5"
)

var ErrCioNotFound = errors.New("cio nao encontrado")

type CioService struct {
	repo        *repository.CioRepository
	animalRepo  *repository.AnimalRepository
	fazendaRepo *repository.FazendaRepository
}

func NewCioService(repo *repository.CioRepository, animalRepo *repository.AnimalRepository, fazendaRepo *repository.FazendaRepository) *CioService {
	return &CioService{repo: repo, animalRepo: animalRepo, fazendaRepo: fazendaRepo}
}

func (s *CioService) Create(ctx context.Context, c *models.Cio) error {
	if c.AnimalID <= 0 || c.FazendaID <= 0 {
		return errors.New("animal_id e fazenda_id sao obrigatorios")
	}
	animal, err := s.animalRepo.GetByID(ctx, c.AnimalID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrAnimalNotFound
		}
		return err
	}
	if animal.FazendaID != c.FazendaID {
		return errors.New("animal deve ser da mesma fazenda")
	}
	if animal.Sexo != nil && *animal.Sexo != "F" {
		return errors.New("apenas femeas podem ter registro de cio")
	}
	if c.MetodoDeteccao != nil && *c.MetodoDeteccao != "" {
		valid := false
		for _, m := range models.ValidMetodosCio() {
			if m == *c.MetodoDeteccao {
				valid = true
				break
			}
		}
		if !valid {
			return errors.New("metodo de deteccao invalido")
		}
	}
	if c.Intensidade != nil && *c.Intensidade != "" {
		valid := false
		for _, i := range models.ValidIntensidadesCio() {
			if i == *c.Intensidade {
				valid = true
				break
			}
		}
		if !valid {
			return errors.New("intensidade invalida")
		}
	}
	return s.repo.Create(ctx, c)
}

func (s *CioService) GetByID(ctx context.Context, id int64) (*models.Cio, error) {
	cio, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrCioNotFound
		}
		return nil, err
	}
	return cio, nil
}

func (s *CioService) GetByAnimalID(ctx context.Context, animalID int64) ([]*models.Cio, error) {
	return s.repo.GetByAnimalID(ctx, animalID)
}

func (s *CioService) GetByFazendaID(ctx context.Context, fazendaID int64) ([]*models.Cio, error) {
	return s.repo.GetByFazendaID(ctx, fazendaID)
}

func (s *CioService) Delete(ctx context.Context, id int64) error {
	_, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrCioNotFound
		}
		return err
	}
	return s.repo.Delete(ctx, id)
}
