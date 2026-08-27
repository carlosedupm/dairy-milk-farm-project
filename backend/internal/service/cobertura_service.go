package service

import (
	"context"
	"errors"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/repository"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrCoberturaNotFound = errors.New("cobertura nao encontrada")

// ErrCoberturaTemVinculos impede exclusão quando há gestação ou diagnóstico ligados.
var ErrCoberturaTemVinculos = errors.New("cobertura possui gestacao ou diagnostico vinculado")

var (
	ErrCoberturaCamposObrigatorios      = errors.New("animal_id, fazenda_id e tipo sao obrigatorios")
	ErrCoberturaTipoInvalido            = errors.New("tipo de cobertura invalido")
	ErrCoberturaAnimalFazendaDiferente  = errors.New("animal deve ser da mesma fazenda")
	ErrCoberturaApenasFemea             = errors.New("apenas femeas podem ter cobertura")
	ErrCoberturaReprodutorObrigatorio   = errors.New("para monta natural, informe o reprodutor (touro/boi) ou touro_info")
	ErrCoberturaReprodutorNaoEncontrado = errors.New("reprodutor (touro/boi) nao encontrado")
	ErrCoberturaReprodutorInvalido      = errors.New("reprodutor invalido")
	ErrCoberturaCioObrigatorio          = errors.New("cio_id e obrigatorio")
	ErrCoberturaCioInvalido             = errors.New("cio nao encontrado ou nao pertence ao animal")
	ErrCoberturaCioJaVinculado          = errors.New("cio ja possui cobertura vinculada")
)

type CoberturaService struct {
	pool                    *pgxpool.Pool
	repo                    *repository.CoberturaRepository
	animalRepo              *repository.AnimalRepository
	fazendaRepo             *repository.FazendaRepository
	gestacaoRepo            *repository.GestacaoRepository
	diagnosticoGestacaoRepo *repository.DiagnosticoGestacaoRepository
	cioRepo                 *repository.CioRepository
}

func NewCoberturaService(
	pool *pgxpool.Pool,
	repo *repository.CoberturaRepository,
	animalRepo *repository.AnimalRepository,
	fazendaRepo *repository.FazendaRepository,
	gestacaoRepo *repository.GestacaoRepository,
	diagnosticoGestacaoRepo *repository.DiagnosticoGestacaoRepository,
	cioRepo *repository.CioRepository,
) *CoberturaService {
	return &CoberturaService{
		pool:                    pool,
		repo:                    repo,
		animalRepo:              animalRepo,
		fazendaRepo:             fazendaRepo,
		gestacaoRepo:            gestacaoRepo,
		diagnosticoGestacaoRepo: diagnosticoGestacaoRepo,
		cioRepo:                 cioRepo,
	}
}

func requireCioID(c *models.Cobertura) error {
	if c.CioID == nil || *c.CioID <= 0 {
		return ErrCoberturaCioObrigatorio
	}
	return nil
}

func cioPertenceCobertura(cio *models.Cio, c *models.Cobertura) error {
	if cio.AnimalID != c.AnimalID || cio.FazendaID != c.FazendaID {
		return ErrCoberturaCioInvalido
	}
	return nil
}

// statusAposExclusaoCobertura aplica BR-COBERTURAS-011 (e preserva PRENHE de outra cobertura).
func statusAposExclusaoCobertura(temGestacaoConfirmada, temCoberturaAberta bool) string {
	if temGestacaoConfirmada {
		return models.StatusReprodutivoPrenhe
	}
	if temCoberturaAberta {
		return models.StatusReprodutivoServida
	}
	return models.StatusReprodutivoVazia
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
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
	if err := ValidateElegibilidadeReprodutiva(animal, c.Data); err != nil {
		return err
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
	if err := ValidateEventoDateTimeTemporal(animal, c.Data); err != nil {
		return err
	}
	if err := s.validateCioVinculo(ctx, c); err != nil {
		return err
	}
	return ValidateCoberturaAposCio(ctx, s.cioRepo, c)
}

func (s *CoberturaService) validateCioVinculo(ctx context.Context, c *models.Cobertura) error {
	if err := requireCioID(c); err != nil {
		return err
	}
	cio, err := s.cioRepo.GetByID(ctx, *c.CioID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrCoberturaCioInvalido
		}
		return err
	}
	if err := cioPertenceCobertura(cio, c); err != nil {
		return err
	}
	linked, err := s.repo.ExistsByCioID(ctx, *c.CioID, c.ID)
	if err != nil {
		return err
	}
	if linked {
		return ErrCoberturaCioJaVinculado
	}
	return nil
}

func (s *CoberturaService) Create(ctx context.Context, c *models.Cobertura) error {
	if err := s.validateCoberturaRegras(ctx, c); err != nil {
		return err
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	committed := false
	defer func() {
		if !committed {
			_ = tx.Rollback(ctx)
		}
	}()
	if err := s.repo.CreateTx(ctx, tx, c); err != nil {
		if isUniqueViolation(err) {
			return ErrCoberturaCioJaVinculado
		}
		return err
	}
	if err := s.gestacaoRepo.CloseConfirmadaComoPerdaTx(ctx, tx, c.AnimalID); err != nil {
		return err
	}
	status := models.StatusReprodutivoServida
	if err := s.animalRepo.UpdateStatusReprodutivoTx(ctx, tx, c.AnimalID, &status); err != nil {
		return err
	}
	if err := tx.Commit(ctx); err != nil {
		return err
	}
	committed = true
	return nil
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
	if err := s.repo.Update(ctx, c); err != nil {
		if isUniqueViolation(err) {
			return ErrCoberturaCioJaVinculado
		}
		return err
	}
	return nil
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

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	committed := false
	defer func() {
		if !committed {
			_ = tx.Rollback(ctx)
		}
	}()
	if err := s.repo.DeleteTx(ctx, tx, id); err != nil {
		return err
	}
	gest, err := s.gestacaoRepo.GetAtivaConfirmadaByAnimalIDTx(ctx, tx, existing.AnimalID)
	if err != nil {
		return err
	}
	aberta, err := s.repo.HasCoberturaAbertaByAnimalID(ctx, tx, existing.AnimalID)
	if err != nil {
		return err
	}
	status := statusAposExclusaoCobertura(gest != nil, aberta)
	if err := s.animalRepo.UpdateStatusReprodutivoTx(ctx, tx, existing.AnimalID, &status); err != nil {
		return err
	}
	if err := tx.Commit(ctx); err != nil {
		return err
	}
	committed = true
	return nil
}
