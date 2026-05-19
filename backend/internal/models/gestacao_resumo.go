package models

// GestacaoResumoContexto resume gestação ativa para busca contextual do animal.
type GestacaoResumoContexto struct {
	Confirmada        bool    `json:"confirmada"`
	GestacaoID        *int64  `json:"gestacao_id,omitempty"`
	DataConfirmacao   *string `json:"data_confirmacao,omitempty"`    // YYYY-MM-DD
	DataPrevistaParto *string `json:"data_prevista_parto,omitempty"` // YYYY-MM-DD
	DiasGestacao      int     `json:"dias_gestacao"`
	MesesGestacao     int     `json:"meses_gestacao"`
}
