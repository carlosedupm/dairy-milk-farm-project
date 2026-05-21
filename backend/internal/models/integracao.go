package models

import "time"

// Scopes de integração (v1).
const (
	ScopeAnimaisRead    = "animais:read"
	ScopeToquesWrite    = "toques:write"
	ScopeCoberturasRead = "coberturas:read"
)

// ValidIntegrationScopes lista scopes permitidos na criação admin.
func ValidIntegrationScopes() []string {
	return []string{ScopeAnimaisRead, ScopeToquesWrite, ScopeCoberturasRead}
}

func IsValidIntegrationScope(scope string) bool {
	for _, s := range ValidIntegrationScopes() {
		if s == scope {
			return true
		}
	}
	return false
}

type IntegracaoCliente struct {
	ID                int64      `json:"id" db:"id"`
	Nome              string     `json:"nome" db:"nome"`
	ActorUserID       int64      `json:"actor_user_id" db:"actor_user_id"`
	KeyPrefix         string     `json:"key_prefix" db:"key_prefix"`
	KeyHash           string     `json:"-" db:"key_hash"`
	Ativo             bool       `json:"ativo" db:"ativo"`
	RevogadoEm        *time.Time `json:"revogado_em,omitempty" db:"revogado_em"`
	CriadoPorAdminID  *int64     `json:"criado_por_admin_id,omitempty" db:"criado_por_admin_id"`
	CreatedAt         time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at" db:"updated_at"`
	FazendaIDs        []int64    `json:"fazenda_ids,omitempty" db:"-"`
	Scopes            []string   `json:"scopes,omitempty" db:"-"`
}

type IntegracaoChamada struct {
	ID             int64     `json:"id" db:"id"`
	ClienteID      int64     `json:"cliente_id" db:"cliente_id"`
	Method         string    `json:"method" db:"method"`
	Path           string    `json:"path" db:"path"`
	StatusCode     int       `json:"status_code" db:"status_code"`
	CorrelationID  *string   `json:"correlation_id,omitempty" db:"correlation_id"`
	IdempotencyKey *string   `json:"idempotency_key,omitempty" db:"idempotency_key"`
	DuracaoMs      int       `json:"duracao_ms" db:"duracao_ms"`
	ErroResumo     *string   `json:"erro_resumo,omitempty" db:"erro_resumo"`
	CreatedAt      time.Time `json:"created_at" db:"created_at"`
}

type IntegracaoIdempotencia struct {
	ID             int64     `json:"id" db:"id"`
	ClienteID      int64     `json:"cliente_id" db:"cliente_id"`
	IdempotencyKey string    `json:"idempotency_key" db:"idempotency_key"`
	RequestHash    string    `json:"request_hash" db:"request_hash"`
	ResponseBody   []byte    `json:"response_body" db:"response_body"`
	StatusCode     int       `json:"status_code" db:"status_code"`
	ExpiresAt      time.Time `json:"expires_at" db:"expires_at"`
	CreatedAt      time.Time `json:"created_at" db:"created_at"`
}

// ToqueLoteItem linha de importação em lote.
type ToqueLoteItem struct {
	Identificacao string  `json:"identificacao"`
	Data          string  `json:"data"`
	Resultado     string  `json:"resultado"`
	CoberturaID   *int64  `json:"cobertura_id,omitempty"`
	Veterinario   *string `json:"veterinario,omitempty"`
	Observacoes   *string `json:"observacoes,omitempty"`
}

// ToqueLoteFalha erro por linha no lote.
type ToqueLoteFalha struct {
	Linha         int     `json:"linha"`
	Identificacao string  `json:"identificacao"`
	Code          string  `json:"code"`
	Message       string  `json:"message"`
	AnimalIDs     []int64 `json:"animal_ids,omitempty"`
}

// ToqueLoteResultado resposta agregada do lote.
type ToqueLoteResultado struct {
	Total         int                        `json:"total"`
	Sucesso       int                        `json:"sucesso"`
	Falhas        []ToqueLoteFalha           `json:"falhas"`
	ToquesCriados []*DiagnosticoGestacao     `json:"toques_criados"`
}
