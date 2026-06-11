package models

import "time"

const (
	HormonioProdutoLactropin = "LACTROPIN"
	HormonioProdutoBust      = "BUST"
	HormonioProdutoOutro     = "OUTRO"
)

const (
	HormonioProtocoloStatusAtivo     = "ATIVO"
	HormonioProtocoloStatusEncerrado = "ENCERRADO"
)

const (
	HormonioMotivoBaixaProducao = "BAIXA_PRODUCAO"
	HormonioMotivoPreParto      = "PRE_PARTO"
	HormonioMotivoSecagem       = "SECAGEM"
	HormonioMotivoOutro         = "OUTRO"
)

const (
	HormonioPendenciaPrimeiraDose = "PRIMEIRA_DOSE"
	HormonioPendenciaDoseVencida  = "DOSE_VENCIDA"
)

type AnimalHormonioLactacaoProtocolo struct {
	ID                      int64      `json:"id" db:"id"`
	AnimalID                int64      `json:"animal_id" db:"animal_id"`
	FazendaID               int64      `json:"fazenda_id" db:"fazenda_id"`
	LactacaoID              int64      `json:"lactacao_id" db:"lactacao_id"`
	GestacaoID              int64      `json:"gestacao_id" db:"gestacao_id"`
	ToqueReferenciaID       int64      `json:"toque_referencia_id" db:"toque_referencia_id"`
	Produto                 string     `json:"produto" db:"produto"`
	Status                  string     `json:"status" db:"status"`
	MotivoEncerramento      *string    `json:"motivo_encerramento,omitempty" db:"motivo_encerramento"`
	DataInicio              time.Time  `json:"data_inicio" db:"data_inicio"`
	DataEncerramento        *time.Time `json:"data_encerramento,omitempty" db:"data_encerramento"`
	ObservacoesEncerramento *string    `json:"observacoes_encerramento,omitempty" db:"observacoes_encerramento"`
	CreatedBy               *int64     `json:"created_by,omitempty" db:"created_by"`
	CreatedAt               time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt               *time.Time `json:"updated_at,omitempty" db:"updated_at"`
	// Enriquecimento opcional (não persistido).
	DataPrevistaParto *time.Time `json:"data_prevista_parto,omitempty" db:"-"`
	DiasAteTeto70     *int       `json:"dias_ate_teto_70,omitempty" db:"-"`
}

type AnimalHormonioLactacaoAplicacao struct {
	ID                   int64      `json:"id" db:"id"`
	ProtocoloID          int64      `json:"protocolo_id" db:"protocolo_id"`
	AnimalID             int64      `json:"animal_id" db:"animal_id"`
	FazendaID            int64      `json:"fazenda_id" db:"fazenda_id"`
	Produto              string     `json:"produto" db:"produto"`
	DataAplicacao        time.Time  `json:"data_aplicacao" db:"data_aplicacao"`
	DataProximaAplicacao *time.Time `json:"data_proxima_aplicacao,omitempty" db:"data_proxima_aplicacao"`
	NumeroDose           int        `json:"numero_dose" db:"numero_dose"`
	Lote                 *string    `json:"lote,omitempty" db:"lote"`
	Observacoes          *string    `json:"observacoes,omitempty" db:"observacoes"`
	CreatedBy            *int64     `json:"created_by,omitempty" db:"created_by"`
	CreatedAt            time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt            *time.Time `json:"updated_at,omitempty" db:"updated_at"`
}

type HormonioLactacaoPendente struct {
	AnimalID             int64      `json:"animal_id"`
	AnimalIdentificacao  string     `json:"animal_identificacao"`
	LactacaoID           int64      `json:"lactacao_id"`
	GestacaoID           int64      `json:"gestacao_id"`
	DataPrevistaParto    *time.Time `json:"data_prevista_parto,omitempty"`
	TipoPendencia        string     `json:"tipo_pendencia"`
	DataProximaAplicacao *time.Time `json:"data_proxima_aplicacao,omitempty"`
	NumeroDoseUltima     *int       `json:"numero_dose_ultima,omitempty"`
	ProdutoUltimo        *string    `json:"produto_ultimo,omitempty"`
}

func ValidHormonioProdutos() []string {
	return []string{HormonioProdutoLactropin, HormonioProdutoBust, HormonioProdutoOutro}
}

func IsValidHormonioProduto(v string) bool {
	for _, p := range ValidHormonioProdutos() {
		if p == v {
			return true
		}
	}
	return false
}

func LabelHormonioProduto(produto string) string {
	switch produto {
	case HormonioProdutoLactropin:
		return "Lactropin"
	case HormonioProdutoBust:
		return "Bust"
	case HormonioProdutoOutro:
		return "Outro"
	default:
		return produto
	}
}

func ValidHormonioMotivosEncerramento() []string {
	return []string{
		HormonioMotivoBaixaProducao,
		HormonioMotivoPreParto,
		HormonioMotivoSecagem,
		HormonioMotivoOutro,
	}
}

func IsValidHormonioMotivoEncerramentoManual(v string) bool {
	return v == HormonioMotivoBaixaProducao || v == HormonioMotivoOutro
}
