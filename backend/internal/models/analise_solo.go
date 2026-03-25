package models

import "time"

type AnaliseSolo struct {
	ID               int64      `json:"id" db:"id"`
	AreaID           int64      `json:"area_id" db:"area_id"`
	DataColeta       time.Time  `json:"data_coleta" db:"data_coleta"`
	DataResultado    *time.Time `json:"data_resultado,omitempty" db:"data_resultado"`
	Ph               *float64   `json:"ph,omitempty" db:"ph"`
	FosforoP         *string    `json:"fosforo_p,omitempty" db:"fosforo_p"`
	PotassioK        *string    `json:"potassio_k,omitempty" db:"potassio_k"`
	MateriaOrganica  *string    `json:"materia_organica,omitempty" db:"materia_organica"`
	OutrosResultados []byte     `json:"outros_resultados,omitempty" db:"outros_resultados"` // JSONB
	Recomendacoes    *string    `json:"recomendacoes,omitempty" db:"recomendacoes"`
	Laboratorio      *string    `json:"laboratorio,omitempty" db:"laboratorio"`
	CreatedAt        time.Time  `json:"created_at" db:"created_at"`
}
