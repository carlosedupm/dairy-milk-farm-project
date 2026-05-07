package models

import "time"

type Cria struct {
	ID         int64     `json:"id" db:"id"`
	PartoID    int64     `json:"parto_id" db:"parto_id"`
	AnimalID   *int64    `json:"animal_id,omitempty" db:"animal_id"`
	Sexo       string    `json:"sexo" db:"sexo"`
	Peso       *float64   `json:"peso,omitempty" db:"peso"`
	Condicao   string    `json:"condicao" db:"condicao"`
	Observacoes *string   `json:"observacoes,omitempty" db:"observacoes"`
	CreatedAt  time.Time `json:"created_at" db:"created_at"`

	// Somente entrada em POST /crias (não persistidos na tabela crias); limpos na resposta após processamento.
	AnimalIdentificacao *string `json:"animal_identificacao,omitempty" db:"-"`
	AnimalRaca          *string `json:"animal_raca,omitempty" db:"-"`
}

const (
	CriaCondicaoVivo     = "VIVO"
	CriaCondicaoNatimorto = "NATIMORTO"
)

func ValidCondicoesCria() []string {
	return []string{CriaCondicaoVivo, CriaCondicaoNatimorto}
}
