package service

import (
	"context"
	"errors"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/repository"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrPartoNotFound = errors.New("parto nao encontrado")

// ErrPartoCriasCountMismatch indica que o array crias[] não tem o mesmo tamanho que numero_crias.
var ErrPartoCriasCountMismatch = errors.New("quantidade de crias diverge de numero_crias")

type PartoService struct {
	pool         *pgxpool.Pool
	repo         *repository.PartoRepository
	animalRepo   *repository.AnimalRepository
	gestacaoRepo *repository.GestacaoRepository
	lactacaoRepo *repository.LactacaoRepository
	fazendaRepo  *repository.FazendaRepository
	criaSvc      *CriaService
}

func NewPartoService(pool *pgxpool.Pool, repo *repository.PartoRepository, animalRepo *repository.AnimalRepository, gestacaoRepo *repository.GestacaoRepository, lactacaoRepo *repository.LactacaoRepository, fazendaRepo *repository.FazendaRepository, criaSvc *CriaService) *PartoService {
	return &PartoService{pool: pool, repo: repo, animalRepo: animalRepo, gestacaoRepo: gestacaoRepo, lactacaoRepo: lactacaoRepo, fazendaRepo: fazendaRepo, criaSvc: criaSvc}
}

func (s *PartoService) validatePartoAnimalForCreate(ctx context.Context, p *models.Parto) (*models.Animal, error) {
	if p.AnimalID <= 0 || p.FazendaID <= 0 {
		return nil, errors.New("animal_id e fazenda_id sao obrigatorios")
	}
	if p.NumeroCrias < 1 {
		p.NumeroCrias = 1
	}
	animal, err := s.animalRepo.GetByID(ctx, p.AnimalID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrAnimalNotFound
		}
		return nil, err
	}
	if animal.FazendaID != p.FazendaID {
		return nil, errors.New("animal deve ser da mesma fazenda")
	}
	if err := EnsureAnimalNoRebanho(animal); err != nil {
		return nil, err
	}
	if err := ValidateEventoDateTimeTemporal(animal, p.Data); err != nil {
		return nil, err
	}
	if err := ValidatePartoAposGestacao(ctx, s.gestacaoRepo, p); err != nil {
		return nil, err
	}
	if animal.Sexo != nil && *animal.Sexo != "F" {
		return nil, errors.New("apenas femeas podem ter parto")
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
			return nil, errors.New("tipo de parto invalido")
		}
	}
	return animal, nil
}

func (s *PartoService) applyAfterPartoCreate(ctx context.Context, p *models.Parto, animal *models.Animal) error {
	partos, _ := s.repo.GetByAnimalID(ctx, p.AnimalID)
	if len(partos) == 1 && !animal.IsMatriz() {
		matriz := models.CategoriaMatriz
		_ = s.animalRepo.UpdateCategoria(ctx, p.AnimalID, &matriz)
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
	if err := EncerrarLactacaoAtiva(ctx, s.lactacaoRepo, p.AnimalID, p.Data); err != nil {
		return err
	}
	numLact, _ := s.lactacaoRepo.CountByAnimalID(ctx, p.AnimalID)
	lactacao := &models.Lactacao{
		AnimalID:       p.AnimalID,
		NumeroLactacao: numLact + 1,
		PartoID:        &p.ID,
		DataInicio:     p.Data,
		Status:         strPtr(models.LactacaoStatusEmAndamento),
		FazendaID:      p.FazendaID,
		CreatedBy:      p.CreatedBy,
	}
	return s.lactacaoRepo.Create(ctx, lactacao)
}

func (s *PartoService) applyAfterPartoCreateTx(ctx context.Context, tx pgx.Tx, p *models.Parto, animal *models.Animal) error {
	partos, _ := s.repo.GetByAnimalIDTx(ctx, tx, p.AnimalID)
	if len(partos) == 1 && !animal.IsMatriz() {
		matriz := models.CategoriaMatriz
		_ = s.animalRepo.UpdateCategoriaTx(ctx, tx, p.AnimalID, &matriz)
	}
	status := models.StatusReprodutivoParida
	if err := s.animalRepo.UpdateStatusReprodutivoTx(ctx, tx, p.AnimalID, &status); err != nil {
		return err
	}
	if p.GestacaoID != nil {
		g, gErr := s.gestacaoRepo.GetByIDTx(ctx, tx, *p.GestacaoID)
		if gErr != nil {
			if !errors.Is(gErr, pgx.ErrNoRows) {
				return gErr
			}
		} else {
			g.Status = models.GestacaoStatusPartoRealizado
			_ = s.gestacaoRepo.UpdateTx(ctx, tx, g)
		}
	}
	if err := EncerrarLactacaoAtivaTx(ctx, tx, s.lactacaoRepo, p.AnimalID, p.Data); err != nil {
		return err
	}
	numLact, _ := s.lactacaoRepo.CountByAnimalIDTx(ctx, tx, p.AnimalID)
	lactacao := &models.Lactacao{
		AnimalID:       p.AnimalID,
		NumeroLactacao: numLact + 1,
		PartoID:        &p.ID,
		DataInicio:     p.Data,
		Status:         strPtr(models.LactacaoStatusEmAndamento),
		FazendaID:      p.FazendaID,
		CreatedBy:      p.CreatedBy,
	}
	return s.lactacaoRepo.CreateTx(ctx, tx, lactacao)
}

func (s *PartoService) Create(ctx context.Context, p *models.Parto) error {
	animal, err := s.validatePartoAnimalForCreate(ctx, p)
	if err != nil {
		return err
	}
	if err := s.repo.Create(ctx, p); err != nil {
		return err
	}
	return s.applyAfterPartoCreate(ctx, p, animal)
}

// CreateWithCrias persiste o parto, lactação/gestação/reclassificação da matriz e todas as crias numa única transação.
func (s *PartoService) CreateWithCrias(ctx context.Context, p *models.Parto, crias []*models.Cria) error {
	if len(crias) != p.NumeroCrias {
		return ErrPartoCriasCountMismatch
	}
	animal, err := s.validatePartoAnimalForCreate(ctx, p)
	if err != nil {
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

	if err := s.repo.CreateTx(ctx, tx, p); err != nil {
		return err
	}
	if _, err := s.repo.GetByIDForUpdateTx(ctx, tx, p.ID); err != nil {
		return err
	}
	if err := s.applyAfterPartoCreateTx(ctx, tx, p, animal); err != nil {
		return err
	}
	for _, c := range crias {
		c.PartoID = p.ID
		if err := s.criaSvc.createCriaAsPartOfPartoTx(ctx, tx, p, c); err != nil {
			return err
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return err
	}
	committed = true
	return nil
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
	if p.AnimalID <= 0 || p.FazendaID <= 0 {
		return errors.New("animal_id e fazenda_id sao obrigatorios")
	}
	existing, err := s.repo.GetByID(ctx, p.ID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrPartoNotFound
		}
		return err
	}
	if p.NumeroCrias < 1 {
		p.NumeroCrias = 1
	}
	animalChanged := p.AnimalID != existing.AnimalID || p.FazendaID != existing.FazendaID
	if animalChanged {
		animal, animalErr := s.animalRepo.GetByID(ctx, p.AnimalID)
		if animalErr != nil {
			if errors.Is(animalErr, pgx.ErrNoRows) {
				return ErrAnimalNotFound
			}
			return animalErr
		}
		if animal.FazendaID != p.FazendaID {
			return errors.New("animal deve ser da mesma fazenda")
		}
		if animal.Sexo != nil && *animal.Sexo != "F" {
			return errors.New("apenas femeas podem ter parto")
		}
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
	if err := EnsureAnimalIDNoRebanho(ctx, s.animalRepo, p.AnimalID); err != nil {
		return err
	}
	animal, err := s.animalRepo.GetByID(ctx, p.AnimalID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrAnimalNotFound
		}
		return err
	}
	if err := ValidateEventoDateTimeTemporal(animal, p.Data); err != nil {
		return err
	}
	if err := ValidatePartoAposGestacao(ctx, s.gestacaoRepo, p); err != nil {
		return err
	}
	return s.repo.Update(ctx, p)
}

func (s *PartoService) Delete(ctx context.Context, id int64) error {
	if id <= 0 {
		return errors.New("id invalido")
	}
	p, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrPartoNotFound
		}
		return err
	}
	if err := EnsureAnimalIDNoRebanho(ctx, s.animalRepo, p.AnimalID); err != nil {
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
	if _, err := s.repo.GetByIDForUpdateTx(ctx, tx, p.ID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrPartoNotFound
		}
		return err
	}
	if err := s.criaSvc.DeleteAnimaisGeradosPorCriasDoPartoTx(ctx, tx, p); err != nil {
		return err
	}
	if err := s.repo.DeleteTx(ctx, tx, p.ID); err != nil {
		if errors.Is(err, repository.ErrPartoDeleteNoRows) {
			return ErrPartoNotFound
		}
		return err
	}
	if err := tx.Commit(ctx); err != nil {
		return err
	}
	committed = true
	return nil
}
