package service

import (
	"context"
	"errors"
	"time"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/repository"
	"github.com/jackc/pgx/v5"
)

// TruncateToCivilDate normaliza para meia-noite na zona do instante (data civil local).
func TruncateToCivilDate(t time.Time) time.Time {
	y, m, d := t.Date()
	return time.Date(y, m, d, 0, 0, 0, 0, t.Location())
}

// CivilToday retorna a data civil de hoje (local).
func CivilToday() time.Time {
	return TruncateToCivilDate(time.Now())
}

func civilAfter(a, b time.Time) bool {
	return TruncateToCivilDate(a).After(TruncateToCivilDate(b))
}

func civilBefore(a, b time.Time) bool {
	return TruncateToCivilDate(a).Before(TruncateToCivilDate(b))
}

// ValidateDataNaoFutura exige data civil <= hoje (BR-CICLO-012 / TMP-001).
func ValidateDataNaoFutura(data time.Time) error {
	if civilAfter(data, time.Now()) {
		return newIntegridade("TMP-001",
			"A data do registo não pode ser futura (BR-CICLO-012).")
	}
	return nil
}

// ValidateDateTimeNaoFuturo exige instante não posterior a agora (BR-CICLO-012 / TMP-001).
func ValidateDateTimeNaoFuturo(t time.Time) error {
	if t.After(time.Now()) {
		return newIntegridade("TMP-001",
			"A data e hora do registo não podem ser futuras (BR-CICLO-012).")
	}
	return nil
}

// ValidateEventoAposReferenciaAnimal exige evento >= entrada e >= nascimento quando preenchidos (BR-CICLO-013 / TMP-002).
func ValidateEventoAposReferenciaAnimal(animal *models.Animal, evento time.Time) error {
	if animal == nil {
		return nil
	}
	ev := TruncateToCivilDate(evento)
	if animal.DataEntrada != nil {
		ent := TruncateToCivilDate(*animal.DataEntrada)
		if ev.Before(ent) {
			return newIntegridade("TMP-002",
				"A data do evento não pode ser anterior à data de entrada do animal (BR-CICLO-013).")
		}
	}
	if animal.DataNascimento != nil {
		nasc := TruncateToCivilDate(*animal.DataNascimento)
		if ev.Before(nasc) {
			return newIntegridade("TMP-002",
				"A data do evento não pode ser anterior à data de nascimento do animal (BR-CICLO-013).")
		}
	}
	return nil
}

// ValidateAnimalDatasCadastro valida nascimento/entrada no cadastro (BR-CICLO-012/013).
func ValidateAnimalDatasCadastro(animal *models.Animal) error {
	if animal.DataNascimento != nil {
		if err := ValidateDataNaoFutura(*animal.DataNascimento); err != nil {
			return err
		}
	}
	if animal.DataEntrada != nil {
		if err := ValidateDataNaoFutura(*animal.DataEntrada); err != nil {
			return err
		}
	}
	if animal.DataNascimento != nil && animal.DataEntrada != nil {
		if civilAfter(*animal.DataNascimento, *animal.DataEntrada) {
			return newIntegridade("TMP-002",
				"A data de nascimento não pode ser posterior à data de entrada (BR-CICLO-013).")
		}
	}
	return nil
}

// ValidateCoberturaAposCio exige cobertura >= cio quando vinculado (BR-CICLO-014 / TMP-003).
func ValidateCoberturaAposCio(ctx context.Context, cioRepo *repository.CioRepository, c *models.Cobertura) error {
	if c.CioID == nil || *c.CioID <= 0 {
		return nil
	}
	cio, err := cioRepo.GetByID(ctx, *c.CioID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return errors.New("cio nao encontrado")
		}
		return err
	}
	if civilBefore(c.Data, cio.DataDetectado) {
		return newIntegridade("TMP-003",
			"A data da cobertura não pode ser anterior à data do cio vinculado (BR-CICLO-014).")
	}
	return nil
}

// ValidateToqueAposCobertura exige toque >= cobertura quando vinculado (BR-CICLO-014 / TMP-003).
func ValidateToqueAposCobertura(ctx context.Context, coberturaRepo *repository.CoberturaRepository, d *models.DiagnosticoGestacao) error {
	if d.CoberturaID == nil || *d.CoberturaID <= 0 {
		return nil
	}
	cob, err := coberturaRepo.GetByID(ctx, *d.CoberturaID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return errors.New("cobertura nao encontrada")
		}
		return err
	}
	if civilBefore(d.Data, cob.Data) {
		return newIntegridade("TMP-003",
			"A data do toque não pode ser anterior à data da cobertura vinculada (BR-CICLO-014).")
	}
	return nil
}

// ValidatePartoAposGestacao exige parto >= confirmação da gestação vinculada (BR-CICLO-014 / TMP-004).
func ValidatePartoAposGestacao(ctx context.Context, gestacaoRepo *repository.GestacaoRepository, p *models.Parto) error {
	if p.GestacaoID == nil || *p.GestacaoID <= 0 {
		return nil
	}
	g, err := gestacaoRepo.GetByID(ctx, *p.GestacaoID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return errors.New("gestacao nao encontrada")
		}
		return err
	}
	if civilBefore(p.Data, g.DataConfirmacao) {
		return newIntegridade("TMP-004",
			"A data do parto não pode ser anterior à data de confirmação da gestação (BR-CICLO-014).")
	}
	return nil
}

// ValidateSecagemAposInicioLactacao exige secagem >= início da lactação ativa (BR-CICLO-014 / TMP-005).
func ValidateSecagemAposInicioLactacao(ctx context.Context, lactacaoRepo *repository.LactacaoRepository, sec *models.Secagem) error {
	lact, err := lactacaoRepo.GetEmAndamentoByAnimalID(ctx, sec.AnimalID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil
		}
		return err
	}
	if civilBefore(sec.DataSecagem, lact.DataInicio) {
		return newIntegridade("TMP-005",
			"A data da secagem não pode ser anterior ao início da lactação ativa (BR-CICLO-014).")
	}
	return nil
}

// lactacaoCoveringProducaoDate encontra a lactação da fazenda cujo intervalo cobre o dia da produção.
func lactacaoCoveringProducaoDate(list []*models.Lactacao, fazendaID int64, dataHora time.Time) (*models.Lactacao, error) {
	prodDay := TruncateToCivilDate(dataHora)
	var hadLactacaoIniciada bool
	for _, l := range list {
		if l.FazendaID != fazendaID {
			continue
		}
		inicio := TruncateToCivilDate(l.DataInicio)
		if prodDay.Before(inicio) {
			continue
		}
		hadLactacaoIniciada = true
		if l.DataFim == nil {
			return l, nil
		}
		fim := TruncateToCivilDate(*l.DataFim)
		if !prodDay.After(fim) {
			return l, nil
		}
	}
	if hadLactacaoIniciada {
		return nil, newIntegridade("TMP-006",
			"A data da produção é posterior ao fim da lactação que cobria esse período (BR-CICLO-007).")
	}
	return nil, nil
}

// FindLactacaoForProducaoDate retorna a lactação da fazenda cujo intervalo cobre o dia da produção.
// Se existir lactação iniciada mas nenhuma cobrir o dia, retorna erro TMP-006.
// Se nenhuma lactação tiver iniciado antes do dia, retorna (nil, nil) — INT-002 trata lactação ativa.
func FindLactacaoForProducaoDate(
	ctx context.Context,
	lactacaoRepo *repository.LactacaoRepository,
	fazendaID, animalID int64,
	dataHora time.Time,
) (*models.Lactacao, error) {
	list, err := lactacaoRepo.GetByAnimalID(ctx, animalID)
	if err != nil {
		return nil, err
	}
	return lactacaoCoveringProducaoDate(list, fazendaID, dataHora)
}

// ValidateProducaoDentroLactacao complementa INT-002: produção não após data_fim da lactação que cobre o dia (TMP-006).
func ValidateProducaoDentroLactacao(
	ctx context.Context,
	lactacaoRepo *repository.LactacaoRepository,
	fazendaID, animalID int64,
	dataHora time.Time,
) error {
	_, err := FindLactacaoForProducaoDate(ctx, lactacaoRepo, fazendaID, animalID, dataHora)
	return err
}

// ValidateEventoCioTemporal validações temporais completas para cio.
func ValidateEventoCioTemporal(animal *models.Animal, dataDetectado time.Time) error {
	if err := ValidateDateTimeNaoFuturo(dataDetectado); err != nil {
		return err
	}
	return ValidateEventoAposReferenciaAnimal(animal, dataDetectado)
}

// ValidateEventoDataCivilTemporal para secagem, lactação início, restrição, baixa (data pura).
func ValidateEventoDataCivilTemporal(animal *models.Animal, data time.Time) error {
	if err := ValidateDataNaoFutura(data); err != nil {
		return err
	}
	return ValidateEventoAposReferenciaAnimal(animal, data)
}

// ValidateEventoDateTimeTemporal para cobertura, toque, parto, produção.
func ValidateEventoDateTimeTemporal(animal *models.Animal, t time.Time) error {
	if err := ValidateDateTimeNaoFuturo(t); err != nil {
		return err
	}
	return ValidateEventoAposReferenciaAnimal(animal, t)
}
