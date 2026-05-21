package models

import "time"

const (
	RestricaoLeiteMotivoTratamentoAntibiotico = "TRATAMENTO_ANTIBIOTICO"
	RestricaoLeiteMotivoPosPartoAmostra       = "POS_PARTO_AMOSTRA"
	RestricaoLeiteMotivoSintomaOrdenha        = "SINTOMA_ORDENHA"
	RestricaoLeiteMotivoOutro                 = "OUTRO"
)

const (
	RestricaoLeiteStatusAguardandoLab = "AGUARDANDO_LAB"
	RestricaoLeiteStatusLiberado      = "LIBERADO"
	RestricaoLeiteStatusCancelado     = "CANCELADO"
)

// RestricaoLeite episódio de leite para descarte até retorno do laboratório.
type RestricaoLeite struct {
	ID                   int64      `json:"id" db:"id"`
	FazendaID            int64      `json:"fazenda_id" db:"fazenda_id"`
	AnimalID             int64      `json:"animal_id" db:"animal_id"`
	Motivo               string     `json:"motivo" db:"motivo"`
	InicioEm             time.Time  `json:"inicio_em" db:"inicio_em"`
	Observacao           *string    `json:"observacao,omitempty" db:"observacao"`
	Status               string     `json:"status" db:"status"`
	LiberadoEm           *time.Time `json:"liberado_em,omitempty" db:"liberado_em"`
	LiberadoObservacao   *string    `json:"liberado_observacao,omitempty" db:"liberado_observacao"`
	CreatedBy            *int64     `json:"created_by,omitempty" db:"created_by"`
	LiberadoPor          *int64     `json:"liberado_por,omitempty" db:"liberado_por"`
	CreatedAt            time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt            time.Time  `json:"updated_at" db:"updated_at"`
}

// RestricaoLeiteAtiva item para listagem na home (apenas aguardando lab).
type RestricaoLeiteAtiva struct {
	ID              int64     `json:"id"`
	AnimalID        int64     `json:"animal_id"`
	Identificacao   string    `json:"identificacao"`
	Motivo          string    `json:"motivo"`
	InicioEm        time.Time `json:"inicio_em"`
	Observacao      *string   `json:"observacao,omitempty"`
	Status          string    `json:"status"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

func ValidMotivosRestricaoLeite() []string {
	return []string{
		RestricaoLeiteMotivoTratamentoAntibiotico,
		RestricaoLeiteMotivoPosPartoAmostra,
		RestricaoLeiteMotivoSintomaOrdenha,
		RestricaoLeiteMotivoOutro,
	}
}

func IsValidMotivoRestricaoLeite(m string) bool {
	for _, v := range ValidMotivosRestricaoLeite() {
		if v == m {
			return true
		}
	}
	return false
}

// PodeLiberarRestricaoLeite perfis que podem encerrar episódio após laboratório (não FUNCIONARIO).
func PodeLiberarRestricaoLeite(perfil string) bool {
	switch perfil {
	case PerfilUser, PerfilAdmin, PerfilDeveloper, PerfilGerente, PerfilGestao, PerfilProprietario:
		return true
	default:
		return false
	}
}
