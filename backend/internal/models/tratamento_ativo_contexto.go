package models

// TratamentoAtivoContexto resume um caso clínico ativo (TRATAMENTO ou CIRURGIA) para o contexto do animal.
type TratamentoAtivoContexto struct {
	TipoCaso        string  `json:"tipo_caso"`
	DataInicio      string  `json:"data_inicio"` // YYYY-MM-DD
	DataFimPrevista *string `json:"data_fim_prevista,omitempty"`
}
