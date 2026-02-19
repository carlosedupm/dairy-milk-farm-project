package service

import (
	"context"
	"errors"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/repository"
	"github.com/jackc/pgx/v5"
)

var ErrCoberturaNotFound = errors.New("cobertura nao encontrada")

type CoberturaService struct {
	repo        *repository.CoberturaRepository
	animalRepo  *repository.AnimalRepository
	fazendaRepo *repository.FazendaRepository
}

func NewCoberturaService(repo *repository.CoberturaRepository, animalRepo *repository.AnimalRepository, fazendaRepo *repository.FazendaRepository) *CoberturaService {
	return &CoberturaService{repo: repo, animalRepo: animalRepo, fazendaRepo: fazendaRepo}
}

func (s *CoberturaService) Create(ctx context.Context, c *models.Cobertura) error {
	if c.AnimalID <= 0 || c.FazendaID <= 0 || c.Tipo == "" {
		return errors.New("animal_id, fazenda_id e tipo sao obrigatorios")
	}
	if !models.IsValidTipoCobertura(c.Tipo) {
		return errors.New("tipo de cobertura invalido")
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
		return errors.New("apenas femeas podem ter cobertura")
	}
	// Para monta natural, exige reprodutor (touro_animal_id ou touro_info)
	if c.Tipo == models.CoberturaTipoMontaNatural {
		hasReprodutor := (c.TouroAnimalID != nil && *c.TouroAnimalID > 0) || (c.TouroInfo != nil && *c.TouroInfo != "")
		if !hasReprodutor {
			return errors.New("para monta natural, informe o reprodutor (touro/boi) ou touro_info")
		}
	}
	// Se touro_animal_id informado, validar que o animal existe, é macho e da mesma fazenda
	if c.TouroAnimalID != nil && *c.TouroAnimalID > 0 {
		touro, err := s.animalRepo.GetByID(ctx, *c.TouroAnimalID)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return errors.New("reprodutor (touro/boi) nao encontrado")
			}
			return err
		}
		if touro.FazendaID != c.FazendaID {
			return errors.New("reprodutor deve ser da mesma fazenda")
		}
		if touro.Sexo == nil || *touro.Sexo != "M" {
			return errors.New("reprodutor deve ser macho")
		}
		if touro.Categoria == nil || (*touro.Categoria != models.CategoriaTouro && *touro.Categoria != models.CategoriaBoi) {
			return errors.New("reprodutor deve ser touro ou boi")
		}
	}
	if err := s.repo.Create(ctx, c); err != nil {
		return err
	}
	status := models.StatusReprodutivoServida
	return s.animalRepo.UpdateStatusReprodutivo(ctx, c.AnimalID, &status)
}

func (s *CoberturaService) GetByID(ctx context.Context, id int64) (*models.Cobertura, error) {
	cobertura, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrCoberturaNotFound
		}
		return nil, err
	}
	return cobertura, nil
}

func (s *CoberturaService) GetByAnimalID(ctx context.Context, animalID int64) ([]*models.Cobertura, error) {
	return s.repo.GetByAnimalID(ctx, animalID)
}

func (s *CoberturaService) GetByFazendaID(ctx context.Context, fazendaID int64) ([]*models.Cobertura, error) {
	return s.repo.GetByFazendaID(ctx, fazendaID)
}

func (s *CoberturaService) Update(ctx context.Context, c *models.Cobertura) error {
	if c.ID <= 0 {
		return errors.New("id invalido")
	}
	// Para monta natural, exige reprodutor (touro_animal_id ou touro_info)
	if c.Tipo == models.CoberturaTipoMontaNatural {
		hasReprodutor := (c.TouroAnimalID != nil && *c.TouroAnimalID > 0) || (c.TouroInfo != nil && *c.TouroInfo != "")
		if !hasReprodutor {
			return errors.New("para monta natural, informe o reprodutor (touro/boi) ou touro_info")
		}
	}
	// Se touro_animal_id informado, validar que o animal existe, é macho e da mesma fazenda
	if c.TouroAnimalID != nil && *c.TouroAnimalID > 0 {
		touro, err := s.animalRepo.GetByID(ctx, *c.TouroAnimalID)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return errors.New("reprodutor (touro/boi) nao encontrado")
			}
			return err
		}
		if touro.FazendaID != c.FazendaID {
			return errors.New("reprodutor deve ser da mesma fazenda")
		}
		if touro.Sexo == nil || *touro.Sexo != "M" {
			return errors.New("reprodutor deve ser macho")
		}
		if touro.Categoria == nil || (*touro.Categoria != models.CategoriaTouro && *touro.Categoria != models.CategoriaBoi) {
			return errors.New("reprodutor deve ser touro ou boi")
		}
	}
	_, err := s.repo.GetByID(ctx, c.ID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrCoberturaNotFound
		}
		return err
	}
	return s.repo.Update(ctx, c)
}

func (s *CoberturaService) Delete(ctx context.Context, id int64) error {
	_, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrCoberturaNotFound
		}
		return err
	}
	return s.repo.Delete(ctx, id)
}
