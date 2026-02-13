package models

import "time"

type Cio struct {
	ID              int64     `json:"id" db:"id"`
	AnimalID        int64     `json:"animal_id" db:"animal_id"`
	DataDetectado   time.Time `json:"data_detectado" db:"data_detectado"`
	MetodoDeteccao  *string   `json:"metodo_deteccao,omitempty" db:"metodo_deteccao"`
	Intensidade     *string   `json:"intensidade,omitempty" db:"intensidade"`
	Observacoes     *string   `json:"observacoes,omitempty" db:"observacoes"`
	UsuarioID       *int64    `json:"usuario_id,omitempty" db:"usuario_id"`
	FazendaID       int64     `json:"fazenda_id" db:"fazenda_id"`
	CreatedAt       time.Time `json:"created_at" db:"created_at"`
}

const (
	CioMetodoVisual    = "VISUAL"
	CioMetodoPedometro = "PEDOMETRO"
	CioMetodoRufiao    = "RUFIAO"
	CioMetodoOutro     = "OUTRO"
)

const (
	CioIntensidadeFraco     = "FRACO"
	CioIntensidadeModerado  = "MODERADO"
	CioIntensidadeForte     = "FORTE"
)

func ValidMetodosCio() []string {
	return []string{CioMetodoVisual, CioMetodoPedometro, CioMetodoRufiao, CioMetodoOutro}
}

func ValidIntensidadesCio() []string {
	return []string{CioIntensidadeFraco, CioIntensidadeModerado, CioIntensidadeForte}
}
