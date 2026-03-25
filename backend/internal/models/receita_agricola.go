package models

import "time"

type ReceitaAgricola struct {
	ID             int64     `json:"id" db:"id"`
	SafraCulturaID int64     `json:"safra_cultura_id" db:"safra_cultura_id"`
	Descricao      *string   `json:"descricao,omitempty" db:"descricao"`
	Valor          float64   `json:"valor" db:"valor"`
	QuantidadeKg   *float64  `json:"quantidade_kg,omitempty" db:"quantidade_kg"`
	PrecoPorKg     *float64  `json:"preco_por_kg,omitempty" db:"preco_por_kg"`
	Data           time.Time `json:"data" db:"data"`
	FornecedorID   *int64    `json:"fornecedor_id,omitempty" db:"fornecedor_id"`
	CreatedAt      time.Time `json:"created_at" db:"created_at"`
}
