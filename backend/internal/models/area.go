package models

import "time"

type Area struct {
	ID         int64     `json:"id" db:"id"`
	FazendaID  int64     `json:"fazenda_id" db:"fazenda_id"`
	Nome       string    `json:"nome" db:"nome"`
	Hectares   float64   `json:"hectares" db:"hectares"`
	Descricao  *string   `json:"descricao,omitempty" db:"descricao"`
	CreatedAt  time.Time `json:"created_at" db:"created_at"`
	UpdatedAt  time.Time `json:"updated_at" db:"updated_at"`
}
