package models

import "time"

type Lactacao struct {
	ID             int64     `json:"id" db:"id"`
	AnimalID       int64     `json:"animal_id" db:"animal_id"`
	NumeroLactacao int       `json:"numero_lactacao" db:"numero_lactacao"`
	PartoID        *int64    `json:"parto_id,omitempty" db:"parto_id"`
	DataInicio     time.Time `json:"data_inicio" db:"data_inicio"`
	DataFim        *time.Time `json:"data_fim,omitempty" db:"data_fim"`
	DiasLactacao   *int      `json:"dias_lactacao,omitempty" db:"dias_lactacao"`
	ProducaoTotal  *float64   `json:"producao_total,omitempty" db:"producao_total"`
	MediaDiaria    *float64   `json:"media_diaria,omitempty" db:"media_diaria"`
	Status         *string   `json:"status,omitempty" db:"status"`
	FazendaID      int64     `json:"fazenda_id" db:"fazenda_id"`
	CreatedAt      time.Time `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time `json:"updated_at" db:"updated_at"`
}

const (
	LactacaoStatusEmAndamento = "EM_ANDAMENTO"
	LactacaoStatusEncerrada   = "ENCERRADA"
)

func ValidStatusLactacao() []string {
	return []string{LactacaoStatusEmAndamento, LactacaoStatusEncerrada}
}
