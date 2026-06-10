package service

import (
	"context"
	"errors"
	"time"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/repository"
	"github.com/jackc/pgx/v5"
)

var (
	ErrAnimalSaudeNotFound         = errors.New("caso de saude animal nao encontrado")
	ErrAnimalSaudeTipoCasoInvalido = errors.New("tipo_caso inválido")
	ErrAnimalSaudeStatusInvalido   = errors.New("status inválido")
	ErrAnimalSaudeDataFimInvalida  = errors.New("data_fim deve ser maior ou igual a data_inicio")
)

type animalSaudeStore interface {
	ListByAnimalID(ctx context.Context, animalID int64) ([]*models.AnimalSaude, error)
	ListAtivosByAnimalID(ctx context.Context, animalID int64) ([]*models.AnimalSaude, error)
	GetByID(ctx context.Context, animalID, saudeID int64) (*models.AnimalSaude, error)
	Create(ctx context.Context, row *models.AnimalSaude) error
	Update(ctx context.Context, row *models.AnimalSaude) error
	Delete(ctx context.Context, animalID, saudeID int64) error
}

type animalSaudeAnimalStore interface {
	GetByID(ctx context.Context, id int64) (*models.Animal, error)
	UpdateStatusSaude(ctx context.Context, animalID int64, status *string) error
}

type AnimalSaudeService struct {
	repo           animalSaudeStore
	animalRepo     animalSaudeAnimalStore
	alertaResolver AlertaAutoResolver
}

func NewAnimalSaudeService(repo *repository.AnimalSaudeRepository, animalRepo *repository.AnimalRepository) *AnimalSaudeService {
	return &AnimalSaudeService{
		repo:       repo,
		animalRepo: animalRepo,
	}
}

func (s *AnimalSaudeService) SetAlertaAutoResolver(r AlertaAutoResolver) {
	s.alertaResolver = r
}

type SaveAnimalSaudeInput struct {
	TipoCaso    string
	DataInicio  time.Time
	DataFim     *time.Time
	Status      string
	Observacoes *string
	CreatedBy   *int64
}

func (s *AnimalSaudeService) ListByAnimalID(ctx context.Context, animalID int64) ([]*models.AnimalSaude, error) {
	if _, err := s.ensureAnimalAtivo(ctx, animalID); err != nil {
		return nil, err
	}
	return s.repo.ListByAnimalID(ctx, animalID)
}

func (s *AnimalSaudeService) GetByID(ctx context.Context, animalID, saudeID int64) (*models.AnimalSaude, error) {
	if _, err := s.ensureAnimalAtivo(ctx, animalID); err != nil {
		return nil, err
	}
	row, err := s.repo.GetByID(ctx, animalID, saudeID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrAnimalSaudeNotFound
		}
		return nil, err
	}
	return row, nil
}

func (s *AnimalSaudeService) Create(ctx context.Context, animalID int64, in SaveAnimalSaudeInput) (*models.AnimalSaude, error) {
	animal, err := s.ensureAnimalAtivo(ctx, animalID)
	if err != nil {
		return nil, err
	}
	if err := validateAnimalSaudeInput(in); err != nil {
		return nil, err
	}
	if err := validateAnimalSaudeTemporal(animal, in); err != nil {
		return nil, err
	}

	row := &models.AnimalSaude{
		AnimalID:    animalID,
		TipoCaso:    in.TipoCaso,
		DataInicio:  normalizeAnimalSaudeDate(in.DataInicio),
		DataFim:     normalizeOptionalAnimalSaudeDate(in.DataFim),
		Status:      in.Status,
		Observacoes: in.Observacoes,
		CreatedBy:   in.CreatedBy,
	}
	if err := s.repo.Create(ctx, row); err != nil {
		return nil, err
	}
	if err := s.syncAnimalStatusSaude(ctx, animalID); err != nil {
		return nil, err
	}
	s.maybeResolveTratamentoVencido(ctx, animalID, in)
	return row, nil
}

func (s *AnimalSaudeService) Update(ctx context.Context, animalID, saudeID int64, in SaveAnimalSaudeInput) (*models.AnimalSaude, error) {
	animal, err := s.ensureAnimalAtivo(ctx, animalID)
	if err != nil {
		return nil, err
	}
	if err := validateAnimalSaudeInput(in); err != nil {
		return nil, err
	}

	existing, err := s.repo.GetByID(ctx, animalID, saudeID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrAnimalSaudeNotFound
		}
		return nil, err
	}

	if existing.VacinaID == nil {
		if err := validateAnimalSaudeTemporal(animal, in); err != nil {
			return nil, err
		}
	}

	existing.TipoCaso = in.TipoCaso
	existing.DataInicio = normalizeAnimalSaudeDate(in.DataInicio)
	existing.DataFim = normalizeOptionalAnimalSaudeDate(in.DataFim)
	existing.Status = in.Status
	existing.Observacoes = in.Observacoes
	if err := s.repo.Update(ctx, existing); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrAnimalSaudeNotFound
		}
		return nil, err
	}
	if err := s.syncAnimalStatusSaude(ctx, animalID); err != nil {
		return nil, err
	}
	s.maybeResolveTratamentoVencido(ctx, animalID, in)
	return existing, nil
}

func (s *AnimalSaudeService) Delete(ctx context.Context, animalID, saudeID int64) error {
	if _, err := s.ensureAnimalAtivo(ctx, animalID); err != nil {
		return err
	}
	if err := s.repo.Delete(ctx, animalID, saudeID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrAnimalSaudeNotFound
		}
		return err
	}
	return s.syncAnimalStatusSaude(ctx, animalID)
}

func (s *AnimalSaudeService) ensureAnimalAtivo(ctx context.Context, animalID int64) (*models.Animal, error) {
	animal, err := s.animalRepo.GetByID(ctx, animalID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrAnimalNotFound
		}
		return nil, err
	}
	if err := EnsureAnimalNoRebanho(animal); err != nil {
		return nil, err
	}
	return animal, nil
}

func (s *AnimalSaudeService) maybeResolveTratamentoVencido(ctx context.Context, animalID int64, in SaveAnimalSaudeInput) {
	if in.Status != models.AnimalSaudeStatusConcluido {
		return
	}
	if in.TipoCaso != models.AnimalSaudeTipoTratamento {
		return
	}
	animal, err := s.animalRepo.GetByID(ctx, animalID)
	if err != nil || animal == nil {
		return
	}
	resolveAlertaSilencioso(ctx, s.alertaResolver, animal.FazendaID, animalID, models.AlertaTipoTratamentoVencido)
}

// BuildTratamentosAtivosContexto lista casos ATIVOS de TRATAMENTO ou CIRURGIA para o contexto do animal.
func (s *AnimalSaudeService) BuildTratamentosAtivosContexto(ctx context.Context, animalID int64) ([]models.TratamentoAtivoContexto, error) {
	ativos, err := s.repo.ListAtivosByAnimalID(ctx, animalID)
	if err != nil {
		return nil, err
	}
	out := make([]models.TratamentoAtivoContexto, 0)
	for _, c := range ativos {
		if c.TipoCaso != models.AnimalSaudeTipoTratamento && c.TipoCaso != models.AnimalSaudeTipoCirurgia {
			continue
		}
		item := models.TratamentoAtivoContexto{
			TipoCaso:   c.TipoCaso,
			DataInicio: formatDateYMD(c.DataInicio),
		}
		if c.DataFim != nil {
			if df := formatDateYMD(*c.DataFim); df != "" {
				item.DataFimPrevista = &df
			}
		}
		out = append(out, item)
	}
	return out, nil
}

func (s *AnimalSaudeService) syncAnimalStatusSaude(ctx context.Context, animalID int64) error {
	ativos, err := s.repo.ListAtivosByAnimalID(ctx, animalID)
	if err != nil {
		return err
	}
	nextStatus := deriveAnimalStatusSaudeFromCasosAtivos(ativos)
	return s.animalRepo.UpdateStatusSaude(ctx, animalID, &nextStatus)
}

// validateAnimalSaudeTemporal aplica TMP-001 em data_inicio e TMP-002 em ambas as datas (BR-SAUDE-012).
// data_fim pode ser futura — exceção a TMP-001 documentada em BR-CICLO-012.
func validateAnimalSaudeTemporal(animal *models.Animal, in SaveAnimalSaudeInput) error {
	dataInicio := normalizeAnimalSaudeDate(in.DataInicio)
	if err := ValidateDataNaoFutura(dataInicio); err != nil {
		return err
	}
	if err := ValidateEventoAposReferenciaAnimal(animal, dataInicio); err != nil {
		return err
	}
	if in.DataFim != nil {
		dataFim := normalizeAnimalSaudeDate(*in.DataFim)
		if err := ValidateEventoAposReferenciaAnimal(animal, dataFim); err != nil {
			return err
		}
	}
	return nil
}

func validateAnimalSaudeInput(in SaveAnimalSaudeInput) error {
	if !models.IsValidAnimalSaudeTipo(in.TipoCaso) {
		return ErrAnimalSaudeTipoCasoInvalido
	}
	if !models.IsValidAnimalSaudeStatus(in.Status) {
		return ErrAnimalSaudeStatusInvalido
	}
	dataInicio := normalizeAnimalSaudeDate(in.DataInicio)
	if in.DataFim != nil {
		dataFim := normalizeAnimalSaudeDate(*in.DataFim)
		if dataFim.Before(dataInicio) {
			return ErrAnimalSaudeDataFimInvalida
		}
	}
	return nil
}

func deriveAnimalStatusSaudeFromCasosAtivos(casos []*models.AnimalSaude) string {
	for _, c := range casos {
		if c.TipoCaso == models.AnimalSaudeTipoTratamento || c.TipoCaso == models.AnimalSaudeTipoCirurgia {
			return models.StatusTratamento
		}
	}
	if len(casos) > 0 {
		return models.StatusDoente
	}
	return models.StatusSaudavel
}

func normalizeAnimalSaudeDate(t time.Time) time.Time {
	u := t.UTC()
	return time.Date(u.Year(), u.Month(), u.Day(), 0, 0, 0, 0, time.UTC)
}

func normalizeOptionalAnimalSaudeDate(t *time.Time) *time.Time {
	if t == nil {
		return nil
	}
	n := normalizeAnimalSaudeDate(*t)
	return &n
}
