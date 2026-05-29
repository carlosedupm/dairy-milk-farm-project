package models

import "time"

const (
	AlertaTipoTratamentoVencido   = "TRATAMENTO_VENCIDO"
	AlertaTipoPartoPrevisto       = "PARTO_PREVISTO"
	AlertaTipoRestricaoLeiteAtiva = "RESTRICAO_LEITE_ATIVA"
	AlertaTipoNaoConformidade     = "NAO_CONFORMIDADE"
	AlertaTipoGestacaoSemSecagem  = "GESTACAO_SEM_SECAGEM"
	AlertaTipoCioDetectado        = "CIO_DETECTADO"
	AlertaTipoManual              = "MANUAL"
)

const (
	AlertaSeveridadeCritica = "CRITICA"
	AlertaSeveridadeAlta    = "ALTA"
	AlertaSeveridadeMedia   = "MEDIA"
	AlertaSeveridadeBaixa   = "BAIXA"
)

const (
	AlertaStatusAberto       = "ABERTO"
	AlertaStatusEmAndamento  = "EM_ANDAMENTO"
	AlertaStatusResolvido    = "RESOLVIDO"
	AlertaStatusIgnorado     = "IGNORADO"
)

type Alerta struct {
	ID           int64      `json:"id" db:"id"`
	FazendaID    int64      `json:"fazenda_id" db:"fazenda_id"`
	AnimalID     *int64     `json:"animal_id,omitempty" db:"animal_id"`
	Tipo         string     `json:"tipo" db:"tipo"`
	Severidade   string     `json:"severidade" db:"severidade"`
	Titulo       string     `json:"titulo" db:"titulo"`
	Descricao    *string    `json:"descricao,omitempty" db:"descricao"`
	DataPrevista *time.Time `json:"data_prevista,omitempty" db:"data_prevista"`
	Status       string     `json:"status" db:"status"`
	ResolvidoPor *int64     `json:"resolvido_por,omitempty" db:"resolvido_por"`
	ResolvidoEm  *time.Time `json:"resolvido_em,omitempty" db:"resolvido_em"`
	CreatedBy    int64      `json:"created_by" db:"created_by"`
	CreatedAt    time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at" db:"updated_at"`
}

type AlertaWithNames struct {
	Alerta
	AnimalIdentificacao *string `json:"animal_identificacao,omitempty" db:"animal_identificacao"`
	CreatedByNome       *string `json:"created_by_nome,omitempty" db:"created_by_nome"`
	ResolvidoPorNome    *string `json:"resolvido_por_nome,omitempty" db:"resolvido_por_nome"`
}

func ValidAlertaTipos() []string {
	return []string{
		AlertaTipoTratamentoVencido,
		AlertaTipoPartoPrevisto,
		AlertaTipoRestricaoLeiteAtiva,
		AlertaTipoNaoConformidade,
		AlertaTipoGestacaoSemSecagem,
		AlertaTipoCioDetectado,
		AlertaTipoManual,
	}
}

func IsValidAlertaTipo(v string) bool {
	for _, t := range ValidAlertaTipos() {
		if t == v {
			return true
		}
	}
	return false
}

func ValidAlertaSeveridades() []string {
	return []string{
		AlertaSeveridadeCritica,
		AlertaSeveridadeAlta,
		AlertaSeveridadeMedia,
		AlertaSeveridadeBaixa,
	}
}

func IsValidAlertaSeveridade(v string) bool {
	for _, s := range ValidAlertaSeveridades() {
		if s == v {
			return true
		}
	}
	return false
}

func ValidAlertaStatus() []string {
	return []string{
		AlertaStatusAberto,
		AlertaStatusEmAndamento,
		AlertaStatusResolvido,
		AlertaStatusIgnorado,
	}
}

func IsValidAlertaStatus(v string) bool {
	for _, s := range ValidAlertaStatus() {
		if s == v {
			return true
		}
	}
	return false
}

func SeveridadePadraoPorTipo(tipo string) (string, bool) {
	switch tipo {
	case AlertaTipoTratamentoVencido, AlertaTipoPartoPrevisto, AlertaTipoGestacaoSemSecagem:
		return AlertaSeveridadeAlta, true
	case AlertaTipoRestricaoLeiteAtiva:
		return AlertaSeveridadeMedia, true
	case AlertaTipoNaoConformidade:
		return AlertaSeveridadeCritica, true
	case AlertaTipoCioDetectado:
		return AlertaSeveridadeBaixa, true
	default:
		return "", false
	}
}

func PodeCriarAlertaManual(perfil string) bool {
	return PodeGerenciarFolgas(perfil)
}

func PodeExcluirAlerta(perfil string) bool {
	return PodeGerenciarFolgas(perfil)
}

func PodeResolverOuIgnorarAlerta(perfil string) bool {
	return PodeGerenciarFolgas(perfil)
}

func PodeMarcarAlertaEmAndamento(perfil string) bool {
	switch perfil {
	case PerfilUser:
		return false
	default:
		return true
	}
}

func IsAlertaStatusTerminal(status string) bool {
	return status == AlertaStatusResolvido || status == AlertaStatusIgnorado
}

func IsTransicaoAlertaStatusValida(from, to string) bool {
	if from == to {
		return false
	}
	if IsAlertaStatusTerminal(from) {
		return false
	}
	switch from {
	case AlertaStatusAberto:
		return to == AlertaStatusEmAndamento || to == AlertaStatusResolvido || to == AlertaStatusIgnorado
	case AlertaStatusEmAndamento:
		return to == AlertaStatusResolvido || to == AlertaStatusIgnorado
	default:
		return false
	}
}
