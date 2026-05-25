package service

import (
	"context"
	"errors"
	"time"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/repository"
	"github.com/jackc/pgx/v5"
)

// CicloIntegridadeError representa violação de regra de negócio detectada na escrita (espelha INT-xxx).
type CicloIntegridadeError struct {
	IntCodigo string
	Message   string
}

func (e *CicloIntegridadeError) Error() string { return e.Message }

func newIntegridade(intCodigo, msg string) error {
	return &CicloIntegridadeError{IntCodigo: intCodigo, Message: msg}
}

var (
	ErrProducaoSemLactacaoNaData = errors.New("registo de produção exige lactação ativa na data do registo (início da lactação não pode ser posterior à data da produção)")
	ErrPrenheSemGestacao         = errors.New("status PRENHE exige gestação confirmada ativa: registe um toque positivo ou altere o estado reprodutivo")
)

// AsIntegridadeCiclo indica se o erro é de integridade do ciclo (para mapeamento HTTP).
func AsIntegridadeCiclo(err error) (*CicloIntegridadeError, bool) {
	var ie *CicloIntegridadeError
	if errors.As(err, &ie) {
		return ie, true
	}
	return nil, false
}

// ValidateLactacaoAtivaParaProducao aplica BR-CICLO-007 / INT-002 na data do registo.
func ValidateLactacaoAtivaParaProducao(
	ctx context.Context,
	lactacaoRepo *repository.LactacaoRepository,
	fazendaID, animalID int64,
	dataHora time.Time,
) error {
	ok, err := lactacaoRepo.ExistsAtivaNaFazendaNaData(ctx, fazendaID, animalID, dataHora)
	if err != nil {
		return err
	}
	if ok {
		return nil
	}
	emQualquer, err := lactacaoRepo.ExistsAtivaNaFazenda(ctx, fazendaID, animalID)
	if err != nil {
		return err
	}
	if emQualquer {
		return newIntegridade("INT-002",
			"Registo de produção sem lactação ativa na data: a lactação atual começou depois da data da produção (BR-CICLO-007).")
	}
	return newIntegridade("INT-002",
		"Registo de produção sem lactação ativa na data (BR-CICLO-007).")
}

// ValidateStatusReprodutivoPrenhe aplica BR-CICLO-002 / INT-005 ao editar cadastro manualmente.
func ValidateStatusReprodutivoPrenhe(
	ctx context.Context,
	gestacaoRepo *repository.GestacaoRepository,
	fazendaID, animalID int64,
	status *string,
) error {
	if status == nil || *status == "" || *status != models.StatusReprodutivoPrenhe {
		return nil
	}
	g, err := gestacaoRepo.GetAtivaConfirmadaByAnimalID(ctx, animalID)
	if err != nil {
		return err
	}
	if g == nil || g.FazendaID != fazendaID {
		return newIntegridade("INT-005",
			"Animal PRENHE sem gestação confirmada ativa: registe um toque positivo antes de marcar como prenhe (BR-CICLO-002).")
	}
	return nil
}

// EncerrarLactacaoAtiva encerra lactação em andamento (uso fora de transação).
func EncerrarLactacaoAtiva(
	ctx context.Context,
	lactacaoRepo *repository.LactacaoRepository,
	animalID int64,
	dataFim time.Time,
) error {
	lact, err := lactacaoRepo.GetEmAndamentoByAnimalID(ctx, animalID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil
		}
		return err
	}
	dias := diasLactacaoCivis(lact.DataInicio, dataFim)
	st := models.LactacaoStatusEncerrada
	lact.DataFim = &dataFim
	lact.DiasLactacao = &dias
	lact.Status = &st
	return lactacaoRepo.Update(ctx, lact)
}
