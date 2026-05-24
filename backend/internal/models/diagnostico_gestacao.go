package models

import (
	"errors"
	"strings"
	"time"
)

type DiagnosticoGestacao struct {
	ID                      int64     `json:"id" db:"id"`
	AnimalID                int64     `json:"animal_id" db:"animal_id"`
	CoberturaID             *int64    `json:"cobertura_id,omitempty" db:"cobertura_id"`
	Data                    time.Time `json:"data" db:"data"`
	Resultado               string    `json:"resultado" db:"resultado"`
	ClassificacaoOperacional *string  `json:"classificacao_operacional,omitempty" db:"classificacao_operacional"`
	DiasGestacaoEstimados   *int      `json:"dias_gestacao_estimados,omitempty" db:"dias_gestacao_estimados"`
	Metodo                  *string   `json:"metodo,omitempty" db:"metodo"`
	Veterinario             *string   `json:"veterinario,omitempty" db:"veterinario"`
	Observacoes             *string   `json:"observacoes,omitempty" db:"observacoes"`
	FazendaID               int64     `json:"fazenda_id" db:"fazenda_id"`
	CreatedBy               *int64    `json:"created_by,omitempty" db:"created_by"`
	CreatedAt               time.Time `json:"created_at" db:"created_at"`
}

const (
	DiagnosticoResultadoPositivo       = "POSITIVO"
	DiagnosticoResultadoNegativo       = "NEGATIVO"
	DiagnosticoResultadoInconclusivo   = "INCONCLUSIVO"
)

const (
	DiagnosticoMetodoPalpacao  = "PALPACAO"
	DiagnosticoMetodoUltrassom = "ULTRASSOM"
)

const (
	ClassificacaoOperacionalPrenha   = "PRENHA"
	ClassificacaoOperacionalVazia    = "VAZIA"
	ClassificacaoOperacionalVaziaPEV = "VAZIA_PEV"
	ClassificacaoOperacionalCloe     = "CLOE"
	ClassificacaoOperacionalCL       = "CL"
	ClassificacaoOperacionalRetoque  = "RETOQUE"
)

var ErrClassificacaoResultadoInconsistente = errors.New("classificacao_operacional inconsistente com resultado")

func ValidResultadosDiagnostico() []string {
	return []string{DiagnosticoResultadoPositivo, DiagnosticoResultadoNegativo, DiagnosticoResultadoInconclusivo}
}

func ValidMetodosDiagnostico() []string {
	return []string{DiagnosticoMetodoPalpacao, DiagnosticoMetodoUltrassom}
}

func ValidClassificacoesOperacionais() []string {
	return []string{
		ClassificacaoOperacionalPrenha,
		ClassificacaoOperacionalVazia,
		ClassificacaoOperacionalVaziaPEV,
		ClassificacaoOperacionalCloe,
		ClassificacaoOperacionalCL,
		ClassificacaoOperacionalRetoque,
	}
}

func ResolveResultadoFromClassificacao(classificacao string) (string, bool) {
	switch strings.ToUpper(strings.TrimSpace(classificacao)) {
	case ClassificacaoOperacionalPrenha:
		return DiagnosticoResultadoPositivo, true
	case ClassificacaoOperacionalVazia, ClassificacaoOperacionalVaziaPEV:
		return DiagnosticoResultadoNegativo, true
	case ClassificacaoOperacionalCloe, ClassificacaoOperacionalCL, ClassificacaoOperacionalRetoque:
		return DiagnosticoResultadoInconclusivo, true
	default:
		return "", false
	}
}

func IsValidClassificacaoOperacional(classificacao string) bool {
	c := strings.ToUpper(strings.TrimSpace(classificacao))
	for _, v := range ValidClassificacoesOperacionais() {
		if v == c {
			return true
		}
	}
	return false
}

func NormalizeClassificacaoOperacional(classificacao string) string {
	return strings.ToUpper(strings.TrimSpace(classificacao))
}
