package service

import (
	"context"
	"errors"
	"time"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/repository"
	"github.com/jackc/pgx/v5"
)

const diasGestacaoBovino = 283

var ErrDiagnosticoNotFound = errors.New("diagnostico de gestacao nao encontrado")

type DiagnosticoGestacaoService struct {
	repo           *repository.DiagnosticoGestacaoRepository
	animalRepo     *repository.AnimalRepository
	gestacaoRepo   *repository.GestacaoRepository
	coberturaRepo  *repository.CoberturaRepository
	fazendaRepo    *repository.FazendaRepository
}

func NewDiagnosticoGestacaoService(repo *repository.DiagnosticoGestacaoRepository, animalRepo *repository.AnimalRepository, gestacaoRepo *repository.GestacaoRepository, coberturaRepo *repository.CoberturaRepository, fazendaRepo *repository.FazendaRepository) *DiagnosticoGestacaoService {
	return &DiagnosticoGestacaoService{repo: repo, animalRepo: animalRepo, gestacaoRepo: gestacaoRepo, coberturaRepo: coberturaRepo, fazendaRepo: fazendaRepo}
}

func (s *DiagnosticoGestacaoService) Create(ctx context.Context, d *models.DiagnosticoGestacao) error {
	if d.AnimalID <= 0 || d.FazendaID <= 0 || d.Resultado == "" {
		return errors.New("animal_id, fazenda_id e resultado sao obrigatorios")
	}
	validRes := false
	for _, r := range models.ValidResultadosDiagnostico() {
		if r == d.Resultado {
			validRes = true
			break
		}
	}
	if !validRes {
		return errors.New("resultado invalido")
	}
	animal, err := s.animalRepo.GetByID(ctx, d.AnimalID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrAnimalNotFound
		}
		return err
	}
	if animal.FazendaID != d.FazendaID {
		return errors.New("animal deve ser da mesma fazenda")
	}
	if err := s.repo.Create(ctx, d); err != nil {
		return err
	}
	if d.Resultado != models.DiagnosticoResultadoPositivo {
		return nil
	}
	var coberturaID int64
	if d.CoberturaID != nil && *d.CoberturaID > 0 {
		coberturaID = *d.CoberturaID
	} else {
		return nil
	}
	cobertura, err := s.coberturaRepo.GetByID(ctx, coberturaID)
	if err != nil {
		return nil
	}
	dataConfirmacao := d.Data.Truncate(24 * time.Hour)
	dataPrevista := cobertura.Data.AddDate(0, 0, diasGestacaoBovino)
	gestacao := &models.Gestacao{
		AnimalID:          d.AnimalID,
		CoberturaID:       coberturaID,
		DataConfirmacao:   dataConfirmacao,
		DataPrevistaParto: &dataPrevista,
		Status:            models.GestacaoStatusConfirmada,
		FazendaID:         d.FazendaID,
	}
	if err := s.gestacaoRepo.Create(ctx, gestacao); err != nil {
		return err
	}
	status := models.StatusReprodutivoPrenhe
	return s.animalRepo.UpdateStatusReprodutivo(ctx, d.AnimalID, &status)
}

func (s *DiagnosticoGestacaoService) GetByID(ctx context.Context, id int64) (*models.DiagnosticoGestacao, error) {
	d, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrDiagnosticoNotFound
		}
		return nil, err
	}
	return d, nil
}

func (s *DiagnosticoGestacaoService) GetByAnimalID(ctx context.Context, animalID int64) ([]*models.DiagnosticoGestacao, error) {
	return s.repo.GetByAnimalID(ctx, animalID)
}

func (s *DiagnosticoGestacaoService) GetByFazendaID(ctx context.Context, fazendaID int64) ([]*models.DiagnosticoGestacao, error) {
	return s.repo.GetByFazendaID(ctx, fazendaID)
}

func (s *DiagnosticoGestacaoService) Delete(ctx context.Context, id int64) error {
	_, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrDiagnosticoNotFound
		}
		return err
	}
	return s.repo.Delete(ctx, id)
}
