package models

import "time"

type ProducaoAgricola struct {
	ID             int64     `json:"id" db:"id"`
	SafraCulturaID int64     `json:"safra_cultura_id" db:"safra_cultura_id"`
	Destino        string    `json:"destino" db:"destino"`
	QuantidadeKg   float64   `json:"quantidade_kg" db:"quantidade_kg"`
	Data           time.Time `json:"data" db:"data"`
	Observacoes    *string   `json:"observacoes,omitempty" db:"observacoes"`
	CreatedAt      time.Time `json:"created_at" db:"created_at"`
}

const (
	ProducaoDestinoSilagem = "SILAGEM"
	ProducaoDestinoGrao    = "GRAO"
)

func ValidDestinosProducaoAgricola() []string {
	return []string{ProducaoDestinoSilagem, ProducaoDestinoGrao}
}
