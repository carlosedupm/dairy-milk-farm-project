package models

import "time"

type DiagnosticoGestacao struct {
	ID                    int64     `json:"id" db:"id"`
	AnimalID              int64     `json:"animal_id" db:"animal_id"`
	CoberturaID           *int64    `json:"cobertura_id,omitempty" db:"cobertura_id"`
	Data                  time.Time `json:"data" db:"data"`
	Resultado             string    `json:"resultado" db:"resultado"`
	DiasGestacaoEstimados *int      `json:"dias_gestacao_estimados,omitempty" db:"dias_gestacao_estimados"`
	Metodo                *string   `json:"metodo,omitempty" db:"metodo"`
	Veterinario           *string   `json:"veterinario,omitempty" db:"veterinario"`
	Observacoes           *string   `json:"observacoes,omitempty" db:"observacoes"`
	FazendaID             int64     `json:"fazenda_id" db:"fazenda_id"`
	CreatedAt             time.Time `json:"created_at" db:"created_at"`
}

const (
	DiagnosticoResultadoPositivo    = "POSITIVO"
	DiagnosticoResultadoNegativo   = "NEGATIVO"
	DiagnosticoResultadoInconclusivo = "INCONCLUSIVO"
)

const (
	DiagnosticoMetodoPalpacao   = "PALPACAO"
	DiagnosticoMetodoUltrassom  = "ULTRASSOM"
)

func ValidResultadosDiagnostico() []string {
	return []string{DiagnosticoResultadoPositivo, DiagnosticoResultadoNegativo, DiagnosticoResultadoInconclusivo}
}

func ValidMetodosDiagnostico() []string {
	return []string{DiagnosticoMetodoPalpacao, DiagnosticoMetodoUltrassom}
}
