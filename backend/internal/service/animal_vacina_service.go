package service

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/repository"
	"github.com/jackc/pgx/v5"
)

var (
	ErrVacinaNotFound                = errors.New("vacina nao encontrada")
	ErrVacinaTipoInvalido            = errors.New("tipo_vacina inválido")
	ErrVacinaDuplicada               = errors.New("já existe vacina prevista deste tipo para o animal")
	ErrVacinaJaAplicada              = errors.New("vacina já foi aplicada")
	ErrVacinaDataPrevistaObrigatoria = errors.New("data_prevista é obrigatória para vacina prevista")
	ErrVacinaAgendamentoNaoPermitido = errors.New("perfil não pode agendar vacina prevista; informe a data de aplicação")
	ErrVacinaValidadeInvalida        = errors.New("validade_dias deve ser maior que zero")
)

type animalVacinaStore interface {
	ListByAnimalID(ctx context.Context, animalID int64) ([]*models.AnimalVacina, error)
	GetByID(ctx context.Context, animalID, vacinaID int64) (*models.AnimalVacina, error)
	Create(ctx context.Context, row *models.AnimalVacina) error
	Update(ctx context.Context, row *models.AnimalVacina) error
	Delete(ctx context.Context, animalID, vacinaID int64) error
	ExistsPrevistaAbertaByAnimalTipo(ctx context.Context, animalID int64, tipoVacina string, excludeID int64) (bool, error)
}

type vacinaAnimalStore interface {
	GetByID(ctx context.Context, id int64) (*models.Animal, error)
}

type vacinaSaudeStore interface {
	Create(ctx context.Context, row *models.AnimalSaude) error
}

type AnimalVacinaService struct {
	repo           animalVacinaStore
	animalRepo     vacinaAnimalStore
	saudeRepo      vacinaSaudeStore
	alertaResolver AlertaAutoResolver
}

func NewAnimalVacinaService(
	repo *repository.AnimalVacinaRepository,
	animalRepo *repository.AnimalRepository,
	saudeRepo *repository.AnimalSaudeRepository,
) *AnimalVacinaService {
	return &AnimalVacinaService{
		repo:       repo,
		animalRepo: animalRepo,
		saudeRepo:  saudeRepo,
	}
}

func (s *AnimalVacinaService) SetAlertaAutoResolver(r AlertaAutoResolver) {
	s.alertaResolver = r
}

type SaveAnimalVacinaInput struct {
	TipoVacina         string
	Dose               *string
	DataPrevista       *time.Time
	DataAplicacao      *time.Time
	ValidadeDias       *int
	DataProximoReforco *time.Time
	Lote               *string
	Veterinario        *string
	Observacoes        *string
	CreatedBy          *int64
}

type AplicarVacinaInput struct {
	DataAplicacao      time.Time
	ValidadeDias       *int
	DataProximoReforco *time.Time
}

func (s *AnimalVacinaService) ListByAnimalID(ctx context.Context, animalID int64) ([]*models.AnimalVacina, error) {
	if _, err := s.getAnimal(ctx, animalID); err != nil {
		return nil, err
	}
	list, err := s.repo.ListByAnimalID(ctx, animalID)
	if err != nil {
		return nil, err
	}
	ref := CivilToday()
	for _, v := range list {
		v.Status = models.DeriveVacinaStatus(v, ref)
	}
	return list, nil
}

func (s *AnimalVacinaService) GetByID(ctx context.Context, animalID, vacinaID int64) (*models.AnimalVacina, error) {
	if _, err := s.getAnimal(ctx, animalID); err != nil {
		return nil, err
	}
	row, err := s.repo.GetByID(ctx, animalID, vacinaID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrVacinaNotFound
		}
		return nil, err
	}
	row.Status = models.DeriveVacinaStatus(row, CivilToday())
	return row, nil
}

// Create registra vacina aplicada ou agenda vacina prevista (BR-SAUDE-007).
// allowAgendar = false (FUNCIONARIO) exige data_aplicacao (decisão G1 #4 do BRF-001).
func (s *AnimalVacinaService) Create(ctx context.Context, animalID int64, in SaveAnimalVacinaInput, allowAgendar bool) (*models.AnimalVacina, error) {
	animal, err := s.ensureAnimalAtivo(ctx, animalID)
	if err != nil {
		return nil, err
	}
	if !models.IsValidVacinaTipo(in.TipoVacina) {
		return nil, ErrVacinaTipoInvalido
	}
	if in.ValidadeDias != nil && *in.ValidadeDias <= 0 {
		return nil, ErrVacinaValidadeInvalida
	}
	if in.DataAplicacao == nil && !allowAgendar {
		return nil, ErrVacinaAgendamentoNaoPermitido
	}
	if in.DataAplicacao == nil && in.DataPrevista == nil {
		return nil, ErrVacinaDataPrevistaObrigatoria
	}

	row := &models.AnimalVacina{
		AnimalID:    animalID,
		FazendaID:   animal.FazendaID,
		TipoVacina:  in.TipoVacina,
		Dose:        in.Dose,
		Lote:        in.Lote,
		Veterinario: in.Veterinario,
		Observacoes: in.Observacoes,
		CreatedBy:   in.CreatedBy,
	}

	if in.DataAplicacao != nil {
		if err := validateVacinaDataAplicacao(animal, *in.DataAplicacao); err != nil {
			return nil, err
		}
		aplicacao := TruncateToCivilDate(*in.DataAplicacao)
		row.DataAplicacao = &aplicacao
		if in.DataPrevista != nil {
			row.DataPrevista = TruncateToCivilDate(*in.DataPrevista)
		} else {
			row.DataPrevista = aplicacao
		}
		row.ValidadeDias = in.ValidadeDias
		row.DataProximoReforco = resolveDataProximoReforco(aplicacao, in.ValidadeDias, in.DataProximoReforco)
	} else {
		// Vacina prevista: só uma aberta por tipo+animal (VACINA_DUPLICADA).
		exists, err := s.repo.ExistsPrevistaAbertaByAnimalTipo(ctx, animalID, in.TipoVacina, 0)
		if err != nil {
			return nil, err
		}
		if exists {
			return nil, ErrVacinaDuplicada
		}
		row.DataPrevista = TruncateToCivilDate(*in.DataPrevista)
		row.ValidadeDias = in.ValidadeDias
		// chk_vacina_reforco_aplicada: reforço só após aplicação.
		row.DataProximoReforco = nil
	}

	if err := s.repo.Create(ctx, row); err != nil {
		return nil, err
	}
	if row.DataAplicacao != nil {
		s.afterAplicacao(ctx, animal, row)
	}
	row.Status = models.DeriveVacinaStatus(row, CivilToday())
	return row, nil
}

func (s *AnimalVacinaService) Update(ctx context.Context, animalID, vacinaID int64, in SaveAnimalVacinaInput) (*models.AnimalVacina, error) {
	animal, err := s.ensureAnimalAtivo(ctx, animalID)
	if err != nil {
		return nil, err
	}
	if !models.IsValidVacinaTipo(in.TipoVacina) {
		return nil, ErrVacinaTipoInvalido
	}
	if in.ValidadeDias != nil && *in.ValidadeDias <= 0 {
		return nil, ErrVacinaValidadeInvalida
	}
	existing, err := s.repo.GetByID(ctx, animalID, vacinaID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrVacinaNotFound
		}
		return nil, err
	}
	wasAplicada := existing.DataAplicacao != nil

	if in.DataAplicacao == nil && in.DataPrevista == nil {
		return nil, ErrVacinaDataPrevistaObrigatoria
	}

	existing.TipoVacina = in.TipoVacina
	existing.Dose = in.Dose
	existing.Lote = in.Lote
	existing.Veterinario = in.Veterinario
	existing.Observacoes = in.Observacoes
	existing.ValidadeDias = in.ValidadeDias

	if in.DataAplicacao != nil {
		if err := validateVacinaDataAplicacao(animal, *in.DataAplicacao); err != nil {
			return nil, err
		}
		aplicacao := TruncateToCivilDate(*in.DataAplicacao)
		existing.DataAplicacao = &aplicacao
		if in.DataPrevista != nil {
			existing.DataPrevista = TruncateToCivilDate(*in.DataPrevista)
		}
		existing.DataProximoReforco = resolveDataProximoReforco(aplicacao, in.ValidadeDias, in.DataProximoReforco)
	} else {
		exists, err := s.repo.ExistsPrevistaAbertaByAnimalTipo(ctx, animalID, in.TipoVacina, vacinaID)
		if err != nil {
			return nil, err
		}
		if exists {
			return nil, ErrVacinaDuplicada
		}
		existing.DataAplicacao = nil
		existing.DataPrevista = TruncateToCivilDate(*in.DataPrevista)
		existing.DataProximoReforco = nil
	}

	if err := s.repo.Update(ctx, existing); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrVacinaNotFound
		}
		return nil, err
	}
	if !wasAplicada && existing.DataAplicacao != nil {
		s.afterAplicacao(ctx, animal, existing)
	}
	existing.Status = models.DeriveVacinaStatus(existing, CivilToday())
	return existing, nil
}

// Aplicar marca vacina prevista como aplicada (BR-SAUDE-007/010/011).
func (s *AnimalVacinaService) Aplicar(ctx context.Context, animalID, vacinaID int64, in AplicarVacinaInput) (*models.AnimalVacina, error) {
	animal, err := s.ensureAnimalAtivo(ctx, animalID)
	if err != nil {
		return nil, err
	}
	if in.ValidadeDias != nil && *in.ValidadeDias <= 0 {
		return nil, ErrVacinaValidadeInvalida
	}
	existing, err := s.repo.GetByID(ctx, animalID, vacinaID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrVacinaNotFound
		}
		return nil, err
	}
	if existing.DataAplicacao != nil {
		return nil, ErrVacinaJaAplicada
	}
	if err := validateVacinaDataAplicacao(animal, in.DataAplicacao); err != nil {
		return nil, err
	}
	aplicacao := TruncateToCivilDate(in.DataAplicacao)
	existing.DataAplicacao = &aplicacao
	if in.ValidadeDias != nil {
		existing.ValidadeDias = in.ValidadeDias
	}
	existing.DataProximoReforco = resolveDataProximoReforco(aplicacao, existing.ValidadeDias, in.DataProximoReforco)

	if err := s.repo.Update(ctx, existing); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrVacinaNotFound
		}
		return nil, err
	}
	s.afterAplicacao(ctx, animal, existing)
	existing.Status = models.DeriveVacinaStatus(existing, CivilToday())
	return existing, nil
}

func (s *AnimalVacinaService) Delete(ctx context.Context, animalID, vacinaID int64) error {
	if _, err := s.ensureAnimalAtivo(ctx, animalID); err != nil {
		return err
	}
	if err := s.repo.Delete(ctx, animalID, vacinaID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrVacinaNotFound
		}
		return err
	}
	return nil
}

func (s *AnimalVacinaService) getAnimal(ctx context.Context, animalID int64) (*models.Animal, error) {
	animal, err := s.animalRepo.GetByID(ctx, animalID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrAnimalNotFound
		}
		return nil, err
	}
	return animal, nil
}

func (s *AnimalVacinaService) ensureAnimalAtivo(ctx context.Context, animalID int64) (*models.Animal, error) {
	animal, err := s.getAnimal(ctx, animalID)
	if err != nil {
		return nil, err
	}
	if err := EnsureAnimalNoRebanho(animal); err != nil {
		return nil, err
	}
	return animal, nil
}

// afterAplicacao efeitos da aplicação: auto-resolve de alertas (BR-ALERTA-016/017)
// e caso PREVENTIVO em animal_saude (BR-SAUDE-010). Falhas não bloqueiam a operação principal.
func (s *AnimalVacinaService) afterAplicacao(ctx context.Context, animal *models.Animal, vacina *models.AnimalVacina) {
	resolveAlertaSilencioso(ctx, s.alertaResolver, animal.FazendaID, animal.ID, models.AlertaTipoVacinaVencida)
	resolveAlertaSilencioso(ctx, s.alertaResolver, animal.FazendaID, animal.ID, models.AlertaTipoVacinaReforcoVencido)
	s.createCasoPreventivo(ctx, vacina)
}

func (s *AnimalVacinaService) createCasoPreventivo(ctx context.Context, vacina *models.AnimalVacina) {
	if s.saudeRepo == nil || vacina.DataAplicacao == nil {
		return
	}
	obs := fmt.Sprintf("Vacina %s aplicada", models.LabelTipoVacina(vacina.TipoVacina))
	caso := &models.AnimalSaude{
		AnimalID:    vacina.AnimalID,
		TipoCaso:    models.AnimalSaudeTipoPreventivo,
		DataInicio:  *vacina.DataAplicacao,
		DataFim:     vacina.DataAplicacao,
		Status:      models.AnimalSaudeStatusConcluido,
		Observacoes: &obs,
		VacinaID:    &vacina.ID,
		CreatedBy:   vacina.CreatedBy,
	}
	if err := s.saudeRepo.Create(ctx, caso); err != nil {
		slog.Warn("vacina: falha ao criar caso PREVENTIVO em animal_saude (BR-SAUDE-010)",
			"animal_id", vacina.AnimalID,
			"vacina_id", vacina.ID,
			"error", err,
		)
	}
}

// validateVacinaDataAplicacao aplica TMP-001 (não futura) e TMP-002 (>= entrada/nascimento).
func validateVacinaDataAplicacao(animal *models.Animal, dataAplicacao time.Time) error {
	if err := ValidateDataNaoFutura(dataAplicacao); err != nil {
		return err
	}
	return ValidateEventoAposReferenciaAnimal(animal, dataAplicacao)
}

// resolveDataProximoReforco: valor manual prevalece; senão calcula aplicacao + validade_dias (BR-SAUDE-011).
func resolveDataProximoReforco(dataAplicacao time.Time, validadeDias *int, manual *time.Time) *time.Time {
	if manual != nil {
		t := TruncateToCivilDate(*manual)
		return &t
	}
	if validadeDias != nil && *validadeDias > 0 {
		t := TruncateToCivilDate(dataAplicacao.AddDate(0, 0, *validadeDias))
		return &t
	}
	return nil
}
