package models

import "time"

type MovimentacaoLote struct {
	ID             int64     `json:"id" db:"id"`
	AnimalID       int64     `json:"animal_id" db:"animal_id"`
	LoteOrigemID   *int64    `json:"lote_origem_id,omitempty" db:"lote_origem_id"`
	LoteDestinoID  int64     `json:"lote_destino_id" db:"lote_destino_id"`
	Data           time.Time `json:"data" db:"data"`
	Motivo         *string   `json:"motivo,omitempty" db:"motivo"`
	UsuarioID      int64     `json:"usuario_id" db:"usuario_id"`
	CreatedAt      time.Time `json:"created_at" db:"created_at"`
}
