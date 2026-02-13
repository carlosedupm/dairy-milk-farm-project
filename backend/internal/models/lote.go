package models

import "time"

type Lote struct {
	ID         int64     `json:"id" db:"id"`
	Nome       string    `json:"nome" db:"nome"`
	FazendaID  int64     `json:"fazenda_id" db:"fazenda_id"`
	Tipo       *string   `json:"tipo,omitempty" db:"tipo"`
	Descricao  *string   `json:"descricao,omitempty" db:"descricao"`
	Ativo      bool      `json:"ativo" db:"ativo"`
	CreatedAt  time.Time `json:"created_at" db:"created_at"`
	UpdatedAt  time.Time `json:"updated_at" db:"updated_at"`
}

const (
	LoteTipoLactacao    = "LACTACAO"
	LoteTipoSecas       = "SECAS"
	LoteTipoMaternidade = "MATERNIDADE"
	LoteTipoPreParto    = "PRE_PARTO"
	LoteTipoBezerros    = "BEZERROS"
	LoteTipoRecria      = "RECRIA"
	LoteTipoEngorda     = "ENGORDA"
)

func ValidTiposLote() []string {
	return []string{LoteTipoLactacao, LoteTipoSecas, LoteTipoMaternidade, LoteTipoPreParto, LoteTipoBezerros, LoteTipoRecria, LoteTipoEngorda}
}

func IsValidTipoLote(tipo string) bool {
	for _, t := range ValidTiposLote() {
		if t == tipo {
			return true
		}
	}
	return false
}
