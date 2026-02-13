package models

import "time"

type Secagem struct {
	ID                 int64     `json:"id" db:"id"`
	AnimalID           int64     `json:"animal_id" db:"animal_id"`
	GestacaoID         *int64    `json:"gestacao_id,omitempty" db:"gestacao_id"`
	DataSecagem        time.Time `json:"data_secagem" db:"data_secagem"`
	DataPrevistaParto  *time.Time `json:"data_prevista_parto,omitempty" db:"data_prevista_parto"`
	Protocolo          *string   `json:"protocolo,omitempty" db:"protocolo"`
	Motivo             *string   `json:"motivo,omitempty" db:"motivo"`
	Observacoes        *string   `json:"observacoes,omitempty" db:"observacoes"`
	FazendaID          int64     `json:"fazenda_id" db:"fazenda_id"`
	CreatedAt          time.Time `json:"created_at" db:"created_at"`
}

const (
	SecagemMotivoGestacao       = "GESTACAO"
	SecagemMotivoBaixaProducao  = "BAIXA_PRODUCAO"
	SecagemMotivoTratamento     = "TRATAMENTO"
)

func ValidMotivosSecagem() []string {
	return []string{SecagemMotivoGestacao, SecagemMotivoBaixaProducao, SecagemMotivoTratamento}
}
