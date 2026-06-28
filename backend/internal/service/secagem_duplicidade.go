package service

import (
	"context"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/repository"
)

// SecagemPendente indica se a secagem ainda deve ser sugerida/registada no ciclo atual.
func SecagemPendente(statusReprodutivo string, gest *models.Gestacao, existsForGestacao, existsSinceConfirmacao bool) bool {
	if statusReprodutivo == models.StatusReprodutivoSeca {
		return false
	}
	if gest == nil {
		return false
	}
	return !existsForGestacao && !existsSinceConfirmacao
}

func secagemDuplicada(statusReprodutivo string, gest *models.Gestacao, existsForGestacao, existsSinceConfirmacao bool) bool {
	if statusReprodutivo == models.StatusReprodutivoSeca {
		return true
	}
	if gest != nil && (existsForGestacao || existsSinceConfirmacao) {
		return true
	}
	return false
}

func (s *SecagemService) prepareSecagemCreate(ctx context.Context, animal *models.Animal, sec *models.Secagem) error {
	st := ""
	if animal.StatusReprodutivo != nil {
		st = *animal.StatusReprodutivo
	}

	gest, err := s.gestacaoRepo.GetAtivaConfirmadaByAnimalID(ctx, sec.AnimalID)
	if err != nil {
		return err
	}

	var existsForGestacao, existsSinceConfirmacao bool
	if gest != nil {
		if sec.GestacaoID == nil || *sec.GestacaoID <= 0 {
			id := gest.ID
			sec.GestacaoID = &id
		}
		existsForGestacao, err = s.repo.ExistsForGestacaoID(ctx, gest.ID)
		if err != nil {
			return err
		}
		if !existsForGestacao {
			existsSinceConfirmacao, err = s.repo.ExistsForAnimalSinceDate(ctx, sec.AnimalID, TruncateToCivilDate(gest.DataConfirmacao))
			if err != nil {
				return err
			}
		}
	}

	if secagemDuplicada(st, gest, existsForGestacao, existsSinceConfirmacao) {
		return ErrSecagemJaRegistrada
	}
	return nil
}

func secagemPendenteForAnimal(
	ctx context.Context,
	repo *repository.SecagemRepository,
	statusReprodutivo string,
	gest *models.Gestacao,
) (bool, error) {
	if gest == nil {
		return false, nil
	}
	existsForGestacao, err := repo.ExistsForGestacaoID(ctx, gest.ID)
	if err != nil {
		return false, err
	}
	var existsSinceConfirmacao bool
	if !existsForGestacao {
		existsSinceConfirmacao, err = repo.ExistsForAnimalSinceDate(ctx, gest.AnimalID, TruncateToCivilDate(gest.DataConfirmacao))
		if err != nil {
			return false, err
		}
	}
	return SecagemPendente(statusReprodutivo, gest, existsForGestacao, existsSinceConfirmacao), nil
}
