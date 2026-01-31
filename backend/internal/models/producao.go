package models

import "time"

// ProducaoLeite representa um registro de produção de leite
// Estrutura baseada na tabela existente no banco de dados
type ProducaoLeite struct {
	ID         int64     `json:"id" db:"id"`
	AnimalID   int64     `json:"animal_id" db:"animal_id"`
	Quantidade float64   `json:"quantidade" db:"quantidade"`
	DataHora   time.Time `json:"data_hora" db:"data_hora"`
	Qualidade  *int      `json:"qualidade,omitempty" db:"qualidade"`
	CreatedAt  time.Time `json:"created_at" db:"created_at"`
}

// ProducaoResumo representa um resumo de produção (para relatórios)
type ProducaoResumo struct {
	TotalLitros    float64 `json:"total_litros"`
	MediaLitros    float64 `json:"media_litros"`
	TotalRegistros int64   `json:"total_registros"`
}
