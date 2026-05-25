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

var (
	ErrDiagnosticoNotFound          = errors.New("diagnostico de gestacao nao encontrado")
	ErrToquePositivoSemCobertura    = errors.New("toque positivo exige cobertura vinculada: registre uma cobertura ou informe cobertura_id")
	ErrToquePositivoGestacaoAtiva   = errors.New("animal ja possui gestacao confirmada")
)

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
	if d.AnimalID <= 0 || d.FazendaID <= 0 {
		return errors.New("animal_id e fazenda_id sao obrigatorios")
	}
	if err := NormalizeDiagnosticoGestacao(d); err != nil {
		return err
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
	if err := EnsureAnimalNoRebanho(animal); err != nil {
		return err
	}

	var coberturaID int64
	if d.Resultado == models.DiagnosticoResultadoPositivo {
		ativa, err := s.gestacaoRepo.GetAtivaConfirmadaByAnimalID(ctx, d.AnimalID)
		if err != nil {
			return err
		}
		if ativa != nil {
			return ErrToquePositivoGestacaoAtiva
		}
		coberturaID, err = s.resolveCoberturaIDForPositivo(ctx, d)
		if err != nil {
			return err
		}
		d.CoberturaID = &coberturaID
	}

	if err := s.repo.Create(ctx, d); err != nil {
		return err
	}
	if d.Resultado == models.DiagnosticoResultadoNegativo {
		status := models.StatusReprodutivoVazia
		return s.animalRepo.UpdateStatusReprodutivo(ctx, d.AnimalID, &status)
	}
	if d.Resultado != models.DiagnosticoResultadoPositivo {
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
		CreatedBy:         d.CreatedBy,
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
	return s.repo.GetByFazendaID(ctx, fazendaID, nil, nil)
}

func (s *DiagnosticoGestacaoService) GetByFazendaIDFiltered(ctx context.Context, fazendaID int64, dataDe, dataAte *time.Time) ([]*models.DiagnosticoGestacao, error) {
	return s.repo.GetByFazendaID(ctx, fazendaID, dataDe, dataAte)
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

// resolveCoberturaIDForPositivo usa cobertura_id informado ou a cobertura mais recente do animal sem gestação vinculada.
func (s *DiagnosticoGestacaoService) resolveCoberturaIDForPositivo(ctx context.Context, d *models.DiagnosticoGestacao) (int64, error) {
	if d.CoberturaID != nil && *d.CoberturaID > 0 {
		cob, err := s.coberturaRepo.GetByID(ctx, *d.CoberturaID)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return 0, errors.New("cobertura nao encontrada")
			}
			return 0, err
		}
		if cob.AnimalID != d.AnimalID || cob.FazendaID != d.FazendaID {
			return 0, errors.New("cobertura deve ser do mesmo animal e fazenda")
		}
		exists, err := s.gestacaoRepo.ExistsByCoberturaID(ctx, cob.ID)
		if err != nil {
			return 0, err
		}
		if exists {
			return 0, errors.New("cobertura ja possui gestacao registrada")
		}
		return cob.ID, nil
	}
	coberturas, err := s.coberturaRepo.GetByAnimalID(ctx, d.AnimalID)
	if err != nil {
		return 0, err
	}
	for _, c := range coberturas {
		exists, err := s.gestacaoRepo.ExistsByCoberturaID(ctx, c.ID)
		if err != nil {
			return 0, err
		}
		if !exists {
			return c.ID, nil
		}
	}
	return 0, ErrToquePositivoSemCobertura
}
