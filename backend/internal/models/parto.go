package models

import "time"

type Parto struct {
	ID            int64     `json:"id" db:"id"`
	AnimalID      int64     `json:"animal_id" db:"animal_id"`
	GestacaoID    *int64    `json:"gestacao_id,omitempty" db:"gestacao_id"`
	Data          time.Time `json:"data" db:"data"`
	Tipo          *string   `json:"tipo,omitempty" db:"tipo"`
	NumeroCrias   int       `json:"numero_crias" db:"numero_crias"`
	Complicacoes  *string   `json:"complicacoes,omitempty" db:"complicacoes"`
	Observacoes   *string   `json:"observacoes,omitempty" db:"observacoes"`
	FazendaID     int64     `json:"fazenda_id" db:"fazenda_id"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
}

const (
	PartoTipoNormal     = "NORMAL"
	PartoTipoDistocico  = "DISTOCICO"
	PartoTipoCesariana  = "CESARIANA"
)

func ValidTiposParto() []string {
	return []string{PartoTipoNormal, PartoTipoDistocico, PartoTipoCesariana}
}
