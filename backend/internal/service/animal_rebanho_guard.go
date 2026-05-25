package service

import (
	"context"
	"errors"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/repository"
	"github.com/jackc/pgx/v5"
)

var ErrAnimalForaDoRebanho = errors.New("animal fora do rebanho")

func EnsureAnimalNoRebanho(animal *models.Animal) error {
	if animal != nil && animal.IsForaDoRebanho() {
		return ErrAnimalForaDoRebanho
	}
	return nil
}

// EnsureAnimalIDNoRebanho carrega o animal e aplica BR-BAIXA-007 / BR-BAIXA-010 em Update/Delete do ciclo.
func EnsureAnimalIDNoRebanho(ctx context.Context, animalRepo *repository.AnimalRepository, animalID int64) error {
	if animalID <= 0 {
		return errors.New("animal_id invalido")
	}
	animal, err := animalRepo.GetByID(ctx, animalID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrAnimalNotFound
		}
		return err
	}
	return EnsureAnimalNoRebanho(animal)
}
