package models

import "time"

// Tipos de vacina (BR-SAUDE-007).
const (
	VacinaTipoAftosa        = "AFTOSA"
	VacinaTipoBrucelose     = "BRUCELOSE"
	VacinaTipoRaiva         = "RAIVA"
	VacinaTipoClostridioses = "CLOSTRIDIOSES"
	VacinaTipoIBRBVD        = "IBR_BVD"
	VacinaTipoLeptospirose  = "LEPTOSPIROSE"
	VacinaTipoOutro         = "OUTRO"
)

// Status derivado de uma vacina (não persistido; calculado por DeriveVacinaStatus).
const (
	VacinaStatusPrevista       = "PREVISTA"
	VacinaStatusAplicada       = "APLICADA"
	VacinaStatusAtrasada       = "ATRASADA"
	VacinaStatusReforcoVencido = "REFORCO_VENCIDO"
)

type AnimalVacina struct {
	ID                 int64      `json:"id" db:"id"`
	AnimalID           int64      `json:"animal_id" db:"animal_id"`
	FazendaID          int64      `json:"fazenda_id" db:"fazenda_id"`
	TipoVacina         string     `json:"tipo_vacina" db:"tipo_vacina"`
	Dose               *string    `json:"dose,omitempty" db:"dose"`
	DataPrevista       time.Time  `json:"data_prevista" db:"data_prevista"`
	DataAplicacao      *time.Time `json:"data_aplicacao,omitempty" db:"data_aplicacao"`
	ValidadeDias       *int       `json:"validade_dias,omitempty" db:"validade_dias"`
	DataProximoReforco *time.Time `json:"data_proximo_reforco,omitempty" db:"data_proximo_reforco"`
	Lote               *string    `json:"lote,omitempty" db:"lote"`
	Veterinario        *string    `json:"veterinario,omitempty" db:"veterinario"`
	Observacoes        *string    `json:"observacoes,omitempty" db:"observacoes"`
	CreatedBy          *int64     `json:"created_by,omitempty" db:"created_by"`
	CreatedAt          time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt          *time.Time `json:"updated_at,omitempty" db:"updated_at"`
	// Status derivado (PREVISTA | APLICADA | ATRASADA | REFORCO_VENCIDO); preenchido pelo service.
	Status string `json:"status" db:"-"`
}

func ValidVacinaTipos() []string {
	return []string{
		VacinaTipoAftosa,
		VacinaTipoBrucelose,
		VacinaTipoRaiva,
		VacinaTipoClostridioses,
		VacinaTipoIBRBVD,
		VacinaTipoLeptospirose,
		VacinaTipoOutro,
	}
}

func IsValidVacinaTipo(v string) bool {
	for _, t := range ValidVacinaTipos() {
		if t == v {
			return true
		}
	}
	return false
}

func LabelTipoVacina(tipo string) string {
	switch tipo {
	case VacinaTipoAftosa:
		return "Aftosa"
	case VacinaTipoBrucelose:
		return "Brucelose"
	case VacinaTipoRaiva:
		return "Raiva"
	case VacinaTipoClostridioses:
		return "Clostridioses"
	case VacinaTipoIBRBVD:
		return "IBR/BVD"
	case VacinaTipoLeptospirose:
		return "Leptospirose"
	case VacinaTipoOutro:
		return "Outra"
	default:
		return tipo
	}
}

// DeriveVacinaStatus calcula o status derivado da vacina na data de referência (data civil).
func DeriveVacinaStatus(v *AnimalVacina, ref time.Time) string {
	refDay := time.Date(ref.Year(), ref.Month(), ref.Day(), 0, 0, 0, 0, time.UTC)
	if v.DataAplicacao == nil {
		prevista := time.Date(v.DataPrevista.Year(), v.DataPrevista.Month(), v.DataPrevista.Day(), 0, 0, 0, 0, time.UTC)
		if prevista.Before(refDay) {
			return VacinaStatusAtrasada
		}
		return VacinaStatusPrevista
	}
	if v.DataProximoReforco != nil {
		reforco := time.Date(v.DataProximoReforco.Year(), v.DataProximoReforco.Month(), v.DataProximoReforco.Day(), 0, 0, 0, 0, time.UTC)
		if reforco.Before(refDay) {
			return VacinaStatusReforcoVencido
		}
	}
	return VacinaStatusAplicada
}
