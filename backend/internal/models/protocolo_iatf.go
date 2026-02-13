package models

import "time"

type ProtocoloIATF struct {
	ID             int64     `json:"id" db:"id"`
	Nome           string    `json:"nome" db:"nome"`
	Descricao      *string   `json:"descricao,omitempty" db:"descricao"`
	DiasProtocolo  *int      `json:"dias_protocolo,omitempty" db:"dias_protocolo"`
	FazendaID      int64     `json:"fazenda_id" db:"fazenda_id"`
	Ativo          bool      `json:"ativo" db:"ativo"`
	CreatedAt      time.Time `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time `json:"updated_at" db:"updated_at"`
}
