package models

import "time"

// FolgasEscalaConfig define âncora e os 3 usuários do rodízio 5x1 (slots 0,1,2).
type FolgasEscalaConfig struct {
	FazendaID      int64     `json:"fazenda_id" db:"fazenda_id"`
	DataAnchor     time.Time `json:"data_anchor" db:"data_anchor"`
	UsuarioSlot0   int64     `json:"usuario_slot_0" db:"usuario_slot_0"`
	UsuarioSlot1   int64     `json:"usuario_slot_1" db:"usuario_slot_1"`
	UsuarioSlot2   int64     `json:"usuario_slot_2" db:"usuario_slot_2"`
	UpdatedAt      time.Time `json:"updated_at" db:"updated_at"`
}

const (
	FolgaOrigemAuto   = "AUTO"
	FolgaOrigemManual = "MANUAL"
)

// EscalaFolga um registro de folga na escala.
type EscalaFolga struct {
	ID           int64      `json:"id" db:"id"`
	FazendaID    int64      `json:"fazenda_id" db:"fazenda_id"`
	Data         time.Time  `json:"data" db:"data"`
	UsuarioID    int64      `json:"usuario_id" db:"usuario_id"`
	Origem       string     `json:"origem" db:"origem"`
	Justificada  bool       `json:"justificada" db:"justificada"`
	Motivo       *string    `json:"motivo,omitempty" db:"motivo"`
	ExcecaoMotivoDia *string `json:"excecao_motivo_dia,omitempty" db:"excecao_motivo_dia"`
	Observacoes  *string    `json:"observacoes,omitempty" db:"observacoes"`
	CreatedBy    *int64     `json:"created_by,omitempty" db:"created_by"`
	CreatedAt    time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at" db:"updated_at"`
	UsuarioNome  string     `json:"usuario_nome,omitempty" db:"-"`
	// Rodízio 5x1 previsto (UsuarioParaDia); preenchido na listagem enriquecida, não vem do banco.
	RodizioEsperadoTemFolga    bool    `json:"rodizio_esperado_tem_folga" db:"-"`
	RodizioEsperadoUsuarioID   *int64  `json:"rodizio_esperado_usuario_id,omitempty" db:"-"`
	RodizioEsperadoUsuarioNome *string `json:"rodizio_esperado_usuario_nome,omitempty" db:"-"`
}

// FolgasRodizioDia previsto pelo ciclo 5x1 para uma data (independente de haver linha na escala).
type FolgasRodizioDia struct {
	Data         time.Time `json:"data"`
	TemFolga     bool      `json:"tem_folga"`
	UsuarioID    *int64    `json:"usuario_id,omitempty"`
	UsuarioNome  *string   `json:"usuario_nome,omitempty"`
}

// FolgasEscalaListResponse escala + mapa diário do rodízio (para dias sem registros).
type FolgasEscalaListResponse struct {
	Linhas         []EscalaFolga       `json:"linhas"`
	RodizioPorDia  []FolgasRodizioDia  `json:"rodizio_por_dia"`
}

// FolgaEquidadeResumo compara folgas registradas vs teóricas do rodízio no intervalo.
type FolgaEquidadeResumo struct {
	UsuarioID          int64  `json:"usuario_id"`
	UsuarioNome        string `json:"usuario_nome"`
	FolgasRegistradas  int    `json:"folgas_registradas"`
	FolgasTeoricasAuto int    `json:"folgas_teoricas_auto"`
	Delta              int    `json:"delta"`
}

// FolgaJustificativa trilha de justificativa do funcionário.
type FolgaJustificativa struct {
	ID         int64     `json:"id" db:"id"`
	FazendaID  int64     `json:"fazenda_id" db:"fazenda_id"`
	Data       time.Time `json:"data" db:"data"`
	UsuarioID  int64     `json:"usuario_id" db:"usuario_id"`
	Motivo     string    `json:"motivo" db:"motivo"`
	CreatedBy  int64     `json:"created_by" db:"created_by"`
	CreatedAt  time.Time `json:"created_at" db:"created_at"`
}

// FolgaExcecaoDia autoriza dia com mais de um de folga (gestão).
type FolgaExcecaoDia struct {
	ID         int64     `json:"id" db:"id"`
	FazendaID  int64     `json:"fazenda_id" db:"fazenda_id"`
	Data       time.Time `json:"data" db:"data"`
	Motivo     string    `json:"motivo" db:"motivo"`
	CreatedBy  *int64    `json:"created_by,omitempty" db:"created_by"`
	CreatedAt  time.Time `json:"created_at" db:"created_at"`
}

// FolgaAlteracao registro de auditoria.
type FolgaAlteracao struct {
	ID         int64          `json:"id" db:"id"`
	FazendaID  int64          `json:"fazenda_id" db:"fazenda_id"`
	ActorID    *int64         `json:"actor_id,omitempty" db:"actor_id"`
	Tipo       string         `json:"tipo" db:"tipo"`
	Detalhes   map[string]any `json:"detalhes,omitempty" db:"detalhes"`
	CreatedAt  time.Time      `json:"created_at" db:"created_at"`
}

// FolgaAlertaDia dia com possível conflito (mais de um de folga sem exceção/justificativa completa).
type FolgaAlertaDia struct {
	Data            time.Time `json:"data"`
	QuantidadeFolga int       `json:"quantidade_folga"`
	MotivoAlerta    string    `json:"motivo_alerta"`
}
