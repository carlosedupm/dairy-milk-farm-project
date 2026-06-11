package models

import "time"

const (
	AnimalSaudeTipoTratamento = "TRATAMENTO"
	AnimalSaudeTipoPreventivo = "PREVENTIVO"
	AnimalSaudeTipoCirurgia   = "CIRURGIA"
	AnimalSaudeTipoOutro      = "OUTRO"
)

const (
	AnimalSaudeStatusAtivo     = "ATIVO"
	AnimalSaudeStatusConcluido = "CONCLUIDO"
	AnimalSaudeStatusCancelado = "CANCELADO"
)

type AnimalSaude struct {
	ID          int64      `json:"id" db:"id"`
	AnimalID    int64      `json:"animal_id" db:"animal_id"`
	TipoCaso    string     `json:"tipo_caso" db:"tipo_caso"`
	DataInicio  time.Time  `json:"data_inicio" db:"data_inicio"`
	DataFim     *time.Time `json:"data_fim,omitempty" db:"data_fim"`
	Status      string     `json:"status" db:"status"`
	Observacoes *string    `json:"observacoes,omitempty" db:"observacoes"`
	VacinaID                    *int64 `json:"vacina_id,omitempty" db:"vacina_id"`
	HormonioLactacaoAplicacaoID *int64 `json:"hormonio_lactacao_aplicacao_id,omitempty" db:"hormonio_lactacao_aplicacao_id"`
	CreatedBy   *int64     `json:"created_by,omitempty" db:"created_by"`
	CreatedAt   time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt   *time.Time `json:"updated_at,omitempty" db:"updated_at"`
}

func ValidAnimalSaudeTipos() []string {
	return []string{
		AnimalSaudeTipoTratamento,
		AnimalSaudeTipoPreventivo,
		AnimalSaudeTipoCirurgia,
		AnimalSaudeTipoOutro,
	}
}

func IsValidAnimalSaudeTipo(v string) bool {
	for _, t := range ValidAnimalSaudeTipos() {
		if t == v {
			return true
		}
	}
	return false
}

func ValidAnimalSaudeStatus() []string {
	return []string{
		AnimalSaudeStatusAtivo,
		AnimalSaudeStatusConcluido,
		AnimalSaudeStatusCancelado,
	}
}

func IsValidAnimalSaudeStatus(v string) bool {
	for _, s := range ValidAnimalSaudeStatus() {
		if s == v {
			return true
		}
	}
	return false
}
