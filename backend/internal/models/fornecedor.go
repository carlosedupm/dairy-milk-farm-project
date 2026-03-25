package models

import "time"

type Fornecedor struct {
	ID          int64     `json:"id" db:"id"`
	FazendaID   int64     `json:"fazenda_id" db:"fazenda_id"`
	Nome        string    `json:"nome" db:"nome"`
	Tipo        string    `json:"tipo" db:"tipo"`
	Contato     *string   `json:"contato,omitempty" db:"contato"`
	Observacoes *string   `json:"observacoes,omitempty" db:"observacoes"`
	Ativo       bool      `json:"ativo" db:"ativo"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
}

const (
	FornecedorTipoCooperativa = "COOPERATIVA"
	FornecedorTipoRevenda     = "REVENDA"
	FornecedorTipoOutro       = "OUTRO"
)

func ValidTiposFornecedor() []string {
	return []string{FornecedorTipoCooperativa, FornecedorTipoRevenda, FornecedorTipoOutro}
}
