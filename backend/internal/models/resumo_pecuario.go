package models

import "time"

type PartoPrevistoResumo struct {
	AnimalID          int64      `json:"animal_id"`
	Identificacao     string     `json:"identificacao"`
	GestacaoID        int64      `json:"gestacao_id"`
	DataPrevistaParto *time.Time `json:"data_prevista_parto,omitempty"`
}

type ResumoPecuario struct {
	PrenhesTotal           int                   `json:"prenhes_total"`
	RestricoesAtivasTotal int                   `json:"restricoes_ativas_total"`
	ProducaoHojeLitros    float64               `json:"producao_hoje_litros"`
	ProducaoSemanaLitros  float64               `json:"producao_semana_litros"`
	PartosPrevistos       []PartoPrevistoResumo `json:"partos_previstos"`
}
