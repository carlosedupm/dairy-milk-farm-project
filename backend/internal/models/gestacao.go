package models

import "time"

type Gestacao struct {
	ID                 int64     `json:"id" db:"id"`
	AnimalID           int64     `json:"animal_id" db:"animal_id"`
	CoberturaID       int64     `json:"cobertura_id" db:"cobertura_id"`
	DataConfirmacao    time.Time `json:"data_confirmacao" db:"data_confirmacao"`
	DataPrevistaParto  *time.Time `json:"data_prevista_parto,omitempty" db:"data_prevista_parto"`
	Status             string    `json:"status" db:"status"`
	Observacoes        *string   `json:"observacoes,omitempty" db:"observacoes"`
	FazendaID          int64     `json:"fazenda_id" db:"fazenda_id"`
	CreatedAt          time.Time `json:"created_at" db:"created_at"`
	UpdatedAt          time.Time `json:"updated_at" db:"updated_at"`
}

const (
	GestacaoStatusConfirmada      = "CONFIRMADA"
	GestacaoStatusPerda          = "PERDA"
	GestacaoStatusAborto         = "ABORTO"
	GestacaoStatusPartoRealizado  = "PARTO_REALIZADO"
)

func ValidStatusGestacao() []string {
	return []string{GestacaoStatusConfirmada, GestacaoStatusPerda, GestacaoStatusAborto, GestacaoStatusPartoRealizado}
}
