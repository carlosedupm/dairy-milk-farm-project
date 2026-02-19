package models

import "time"

type Cobertura struct {
	ID            int64     `json:"id" db:"id"`
	AnimalID      int64     `json:"animal_id" db:"animal_id"`
	CioID         *int64    `json:"cio_id,omitempty" db:"cio_id"`
	Tipo          string    `json:"tipo" db:"tipo"`
	Data          time.Time `json:"data" db:"data"`
	TouroAnimalID *int64    `json:"touro_animal_id,omitempty" db:"touro_animal_id"`
	TouroInfo     *string   `json:"touro_info,omitempty" db:"touro_info"`
	SemenPartida *string   `json:"semen_partida,omitempty" db:"semen_partida"`
	Tecnico      *string   `json:"tecnico,omitempty" db:"tecnico"`
	ProtocoloID  *int64    `json:"protocolo_id,omitempty" db:"protocolo_id"`
	Observacoes  *string   `json:"observacoes,omitempty" db:"observacoes"`
	FazendaID    int64     `json:"fazenda_id" db:"fazenda_id"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time `json:"updated_at" db:"updated_at"`
}

const (
	CoberturaTipoIA            = "IA"
	CoberturaTipoIATF          = "IATF"
	CoberturaTipoMontaNatural  = "MONTA_NATURAL"
	CoberturaTipoTE            = "TE"
)

func ValidTiposCobertura() []string {
	return []string{CoberturaTipoIA, CoberturaTipoIATF, CoberturaTipoMontaNatural, CoberturaTipoTE}
}

func IsValidTipoCobertura(tipo string) bool {
	for _, t := range ValidTiposCobertura() {
		if t == tipo {
			return true
		}
	}
	return false
}
