package models

import "time"

type SafraCultura struct {
	ID            int64      `json:"id" db:"id"`
	AreaID        int64      `json:"area_id" db:"area_id"`
	Ano           int        `json:"ano" db:"ano"`
	Cultura       string     `json:"cultura" db:"cultura"`
	Status        string     `json:"status" db:"status"`
	DataPlantio   *time.Time `json:"data_plantio,omitempty" db:"data_plantio"`
	DataColheita  *time.Time `json:"data_colheita,omitempty" db:"data_colheita"`
	Observacoes   *string    `json:"observacoes,omitempty" db:"observacoes"`
	CreatedAt     time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at" db:"updated_at"`
}

const (
	SafraCulturaStatusPlanejada     = "PLANEJADA"
	SafraCulturaStatusPlantada      = "PLANTADA"
	SafraCulturaStatusEmCrescimento = "EM_CRESCIMENTO"
	SafraCulturaStatusColhida       = "COLHIDA"
)

const (
	CulturaMilho = "MILHO"
	CulturaSoja  = "SOJA"
)

func ValidStatusSafraCultura() []string {
	return []string{SafraCulturaStatusPlanejada, SafraCulturaStatusPlantada, SafraCulturaStatusEmCrescimento, SafraCulturaStatusColhida}
}

func ValidCulturas() []string {
	return []string{CulturaMilho, CulturaSoja}
}
