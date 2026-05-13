package models

import "time"

type Usuario struct {
	ID        int64     `json:"id" db:"id"`
	Nome      string    `json:"nome" db:"nome"`
	Email     string    `json:"email" db:"email"`
	Senha     string    `json:"-" db:"senha"` // Nunca serializar senha
	Perfil    string    `json:"perfil" db:"perfil"`
	Enabled   bool      `json:"enabled" db:"enabled"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// UsuarioPublico dados mínimos para listagens (ex.: vínculo com fazenda).
type UsuarioPublico struct {
	ID     int64  `json:"id"`
	Nome   string `json:"nome"`
	Email  string `json:"email"`
	Perfil string `json:"perfil"`
}

// UsuarioPendenteProvisao utilizador USER ativo aguardando vínculo a fazenda(s) e/ou elevação de perfil (admin).
type UsuarioPendenteProvisao struct {
	ID            int64     `json:"id"`
	Nome          string    `json:"nome"`
	Email         string    `json:"email"`
	FazendasCount int64     `json:"fazendas_count"`
	TipoPendencia string    `json:"tipo_pendencia"` // SEM_VINCULO_FAZENDA | PERFIL_OPERACIONAL
	CreatedAt     time.Time `json:"created_at"`
}
