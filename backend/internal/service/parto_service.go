package service

import (
	"context"
	"errors"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/repository"
	"github.com/jackc/pgx/v5"
)

var ErrPartoNotFound = errors.New("parto nao encontrado")

type PartoService struct {
	repo         *repository.PartoRepository
	animalRepo   *repository.AnimalRepository
	gestacaoRepo *repository.GestacaoRepository
	lactacaoRepo *repository.LactacaoRepository
	fazendaRepo  *repository.FazendaRepository
}

func NewPartoService(repo *repository.PartoRepository, animalRepo *repository.AnimalRepository, gestacaoRepo *repository.GestacaoRepository, lactacaoRepo *repository.LactacaoRepository, fazendaRepo *repository.FazendaRepository) *PartoService {
	return &PartoService{repo: repo, animalRepo: animalRepo, gestacaoRepo: gestacaoRepo, lactacaoRepo: lactacaoRepo, fazendaRepo: fazendaRepo}
}

func (s *PartoService) Create(ctx context.Context, p *models.Parto) error {
	if p.AnimalID <= 0 || p.FazendaID <= 0 {
		return errors.New("animal_id e fazenda_id sao obrigatorios")
	}
	if p.NumeroCrias < 1 {
		p.NumeroCrias = 1
	}
	animal, err := s.animalRepo.GetByID(ctx, p.AnimalID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrAnimalNotFound
		}
		return err
	}
	if animal.FazendaID != p.FazendaID {
		return errors.New("animal deve ser da mesma fazenda")
	}
	if animal.Sexo != nil && *animal.Sexo != "F" {
		return errors.New("apenas femeas podem ter parto")
	}
	if p.Tipo != nil && *p.Tipo != "" {
		valid := false
		for _, t := range models.ValidTiposParto() {
			if t == *p.Tipo {
				valid = true
				break
			}
		}
		if !valid {
			return errors.New("tipo de parto invalido")
		}
	}
	if err := s.repo.Create(ctx, p); err != nil {
		return err
	}
	status := models.StatusReprodutivoParida
	if err := s.animalRepo.UpdateStatusReprodutivo(ctx, p.AnimalID, &status); err != nil {
		return err
	}
	if p.GestacaoID != nil {
		g, _ := s.gestacaoRepo.GetByID(ctx, *p.GestacaoID)
		if g != nil {
			g.Status = models.GestacaoStatusPartoRealizado
			_ = s.gestacaoRepo.Update(ctx, g)
		}
	}
	numLact, _ := s.lactacaoRepo.CountByAnimalID(ctx, p.AnimalID)
	lactacao := &models.Lactacao{
		AnimalID:       p.AnimalID,
		NumeroLactacao: numLact + 1,
		PartoID:        &p.ID,
		DataInicio:     p.Data,
		Status:         strPtr(models.LactacaoStatusEmAndamento),
		FazendaID:      p.FazendaID,
	}
	return s.lactacaoRepo.Create(ctx, lactacao)
}

func strPtr(s string) *string { return &s }

func (s *PartoService) GetByID(ctx context.Context, id int64) (*models.Parto, error) {
	p, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrPartoNotFound
		}
		return nil, err
	}
	return p, nil
}

func (s *PartoService) GetByAnimalID(ctx context.Context, animalID int64) ([]*models.Parto, error) {
	return s.repo.GetByAnimalID(ctx, animalID)
}

func (s *PartoService) GetByFazendaID(ctx context.Context, fazendaID int64) ([]*models.Parto, error) {
	return s.repo.GetByFazendaID(ctx, fazendaID)
}

func (s *PartoService) Update(ctx context.Context, p *models.Parto) error {
	if p.ID <= 0 {
		return errors.New("id invalido")
	}
	_, err := s.repo.GetByID(ctx, p.ID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrPartoNotFound
		}
		return err
	}
	return s.repo.Update(ctx, p)
}
