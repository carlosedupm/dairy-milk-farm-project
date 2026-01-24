package models

import "time"

type Fazenda struct {
	ID              int64      `json:"id" db:"id"`
	Nome            string     `json:"nome" db:"nome"`
	Localizacao     *string    `json:"localizacao,omitempty" db:"localizacao"`
	QuantidadeVacas int        `json:"quantidade_vacas" db:"quantidade_vacas"`
	Fundacao        *time.Time `json:"fundacao,omitempty" db:"fundacao"`
	CreatedAt       time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at" db:"updated_at"`
}
