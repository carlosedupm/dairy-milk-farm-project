package service

import (
	"context"
	"errors"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/repository"
	"github.com/jackc/pgx/v5"
)

var ErrCoberturaNotFound = errors.New("cobertura nao encontrada")

// ErrCoberturaTemVinculos impede exclusão quando há gestação ou diagnóstico ligados.
var ErrCoberturaTemVinculos = errors.New("cobertura possui gestacao ou diagnostico vinculado")

var (
	ErrCoberturaCamposObrigatorios   = errors.New("animal_id, fazenda_id e tipo sao obrigatorios")
	ErrCoberturaTipoInvalido         = errors.New("tipo de cobertura invalido")
	ErrCoberturaAnimalFazendaDiferente = errors.New("animal deve ser da mesma fazenda")
	ErrCoberturaApenasFemea          = errors.New("apenas femeas podem ter cobertura")
	ErrCoberturaReprodutorObrigatorio = errors.New("para monta natural, informe o reprodutor (touro/boi) ou touro_info")
	ErrCoberturaReprodutorNaoEncontrado = errors.New("reprodutor (touro/boi) nao encontrado")
	ErrCoberturaReprodutorInvalido   = errors.New("reprodutor invalido")
)

type CoberturaService struct {
	repo                    *repository.CoberturaRepository
	animalRepo              *repository.AnimalRepository
	fazendaRepo             *repository.FazendaRepository
	gestacaoRepo            *repository.GestacaoRepository
	diagnosticoGestacaoRepo *repository.DiagnosticoGestacaoRepository
}

func NewCoberturaService(
	repo *repository.CoberturaRepository,
	animalRepo *repository.AnimalRepository,
	fazendaRepo *repository.FazendaRepository,
	gestacaoRepo *repository.GestacaoRepository,
	diagnosticoGestacaoRepo *repository.DiagnosticoGestacaoRepository,
) *CoberturaService {
	return &CoberturaService{
		repo:                    repo,
		animalRepo:              animalRepo,
		fazendaRepo:             fazendaRepo,
		gestacaoRepo:            gestacaoRepo,
		diagnosticoGestacaoRepo: diagnosticoGestacaoRepo,
	}
}

func (s *CoberturaService) validateCoberturaRegras(ctx context.Context, c *models.Cobertura) error {
	if c.AnimalID <= 0 || c.FazendaID <= 0 || c.Tipo == "" {
		return ErrCoberturaCamposObrigatorios
	}
	if !models.IsValidTipoCobertura(c.Tipo) {
		return ErrCoberturaTipoInvalido
	}
	animal, err := s.animalRepo.GetByID(ctx, c.AnimalID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrAnimalNotFound
		}
		return err
	}
	if animal.FazendaID != c.FazendaID {
		return ErrCoberturaAnimalFazendaDiferente
	}
	if err := EnsureAnimalNoRebanho(animal); err != nil {
		return err
	}
	if animal.Sexo != nil && *animal.Sexo != "F" {
		return ErrCoberturaApenasFemea
	}
	if c.Tipo == models.CoberturaTipoMontaNatural {
		hasReprodutor := (c.TouroAnimalID != nil && *c.TouroAnimalID > 0) || (c.TouroInfo != nil && *c.TouroInfo != "")
		if !hasReprodutor {
			return ErrCoberturaReprodutorObrigatorio
		}
	}
	if c.TouroAnimalID != nil && *c.TouroAnimalID > 0 {
		touro, err := s.animalRepo.GetByID(ctx, *c.TouroAnimalID)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return ErrCoberturaReprodutorNaoEncontrado
			}
			return err
		}
		if touro.FazendaID != c.FazendaID {
			return ErrCoberturaReprodutorInvalido
		}
		if touro.Sexo == nil || *touro.Sexo != "M" {
			return ErrCoberturaReprodutorInvalido
		}
		if touro.Categoria == nil || (*touro.Categoria != models.CategoriaTouro && *touro.Categoria != models.CategoriaBoi) {
			return ErrCoberturaReprodutorInvalido
		}
	}
	return nil
}

func (s *CoberturaService) Create(ctx context.Context, c *models.Cobertura) error {
	if err := s.validateCoberturaRegras(ctx, c); err != nil {
		return err
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
	if err := s.validateCoberturaRegras(ctx, c); err != nil {
		return err
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
	existing, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrCoberturaNotFound
		}
		return err
	}
	if err := EnsureAnimalIDNoRebanho(ctx, s.animalRepo, existing.AnimalID); err != nil {
		return err
	}
	hasGest, err := s.gestacaoRepo.ExistsByCoberturaID(ctx, id)
	if err != nil {
		return err
	}
	if hasGest {
		return ErrCoberturaTemVinculos
	}
	hasDiag, err := s.diagnosticoGestacaoRepo.ExistsByCoberturaID(ctx, id)
	if err != nil {
		return err
	}
	if hasDiag {
		return ErrCoberturaTemVinculos
	}
	return s.repo.Delete(ctx, id)
}
