package service

import (
	"context"
	"errors"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/repository"
	"github.com/jackc/pgx/v5"
)

var ErrAnimalNotFound = errors.New("animal não encontrado")
var ErrAnimalIdentificacaoDuplicada = errors.New("identificação já existe")

type AnimalService struct {
	repo        *repository.AnimalRepository
	fazendaRepo *repository.FazendaRepository
}

func NewAnimalService(repo *repository.AnimalRepository, fazendaRepo *repository.FazendaRepository) *AnimalService {
	return &AnimalService{repo: repo, fazendaRepo: fazendaRepo}
}

func (s *AnimalService) Create(ctx context.Context, animal *models.Animal) error {
	// Validações básicas
	if animal.Identificacao == "" {
		return errors.New("identificação é obrigatória")
	}
	if animal.FazendaID <= 0 {
		return errors.New("fazenda_id é obrigatório")
	}

	// Verificar se a fazenda existe
	_, err := s.fazendaRepo.GetByID(ctx, animal.FazendaID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return errors.New("fazenda não encontrada")
		}
		return err
	}

	// Verificar identificação única
	exists, err := s.repo.ExistsByIdentificacao(ctx, animal.Identificacao)
	if err != nil {
		return err
	}
	if exists {
		return ErrAnimalIdentificacaoDuplicada
	}

	// Validar sexo se fornecido
	if animal.Sexo != nil && *animal.Sexo != "" && !models.IsValidSexo(*animal.Sexo) {
		return errors.New("sexo inválido (deve ser 'M' ou 'F')")
	}

	// Definir status de saúde padrão se não fornecido
	if animal.StatusSaude == nil {
		defaultStatus := models.StatusSaudavel
		animal.StatusSaude = &defaultStatus
	}

	return s.repo.Create(ctx, animal)
}

func (s *AnimalService) GetByID(ctx context.Context, id int64) (*models.Animal, error) {
	animal, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrAnimalNotFound
		}
		return nil, err
	}
	return animal, nil
}

func (s *AnimalService) GetAll(ctx context.Context) ([]*models.Animal, error) {
	return s.repo.GetAll(ctx)
}

func (s *AnimalService) GetByFazendaID(ctx context.Context, fazendaID int64) ([]*models.Animal, error) {
	// Verificar se a fazenda existe
	_, err := s.fazendaRepo.GetByID(ctx, fazendaID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrFazendaNotFound
		}
		return nil, err
	}

	return s.repo.GetByFazendaID(ctx, fazendaID)
}

func (s *AnimalService) Update(ctx context.Context, animal *models.Animal) error {
	// Validações básicas
	if animal.Identificacao == "" {
		return errors.New("identificação é obrigatória")
	}
	if animal.FazendaID <= 0 {
		return errors.New("fazenda_id é obrigatório")
	}

	// Verificar se o animal existe
	_, err := s.repo.GetByID(ctx, animal.ID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrAnimalNotFound
		}
		return err
	}

	// Verificar se a fazenda existe
	_, err = s.fazendaRepo.GetByID(ctx, animal.FazendaID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return errors.New("fazenda não encontrada")
		}
		return err
	}

	// Validar sexo se fornecido
	if animal.Sexo != nil && *animal.Sexo != "" && !models.IsValidSexo(*animal.Sexo) {
		return errors.New("sexo inválido (deve ser 'M' ou 'F')")
	}

	return s.repo.Update(ctx, animal)
}

func (s *AnimalService) Delete(ctx context.Context, id int64) error {
	// Verificar se existe
	_, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrAnimalNotFound
		}
		return err
	}

	return s.repo.Delete(ctx, id)
}

func (s *AnimalService) SearchByIdentificacao(ctx context.Context, identificacao string) ([]*models.Animal, error) {
	return s.repo.SearchByIdentificacao(ctx, identificacao)
}

func (s *AnimalService) GetByStatusSaude(ctx context.Context, statusSaude string) ([]*models.Animal, error) {
	return s.repo.GetByStatusSaude(ctx, statusSaude)
}

func (s *AnimalService) GetBySexo(ctx context.Context, sexo string) ([]*models.Animal, error) {
	if !models.IsValidSexo(sexo) {
		return nil, errors.New("sexo inválido (deve ser 'M' ou 'F')")
	}
	return s.repo.GetBySexo(ctx, sexo)
}

func (s *AnimalService) Count(ctx context.Context) (int64, error) {
	return s.repo.Count(ctx)
}

func (s *AnimalService) CountByFazenda(ctx context.Context, fazendaID int64) (int64, error) {
	return s.repo.CountByFazenda(ctx, fazendaID)
}
