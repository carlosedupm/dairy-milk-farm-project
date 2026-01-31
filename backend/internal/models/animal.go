package models

import "time"

// Animal representa um animal cadastrado no sistema
// Estrutura baseada na tabela existente no banco de dados
type Animal struct {
	ID             int64      `json:"id" db:"id"`
	Identificacao  string     `json:"identificacao" db:"identificacao"`
	Raca           *string    `json:"raca,omitempty" db:"raca"`
	DataNascimento *time.Time `json:"data_nascimento,omitempty" db:"data_nascimento"`
	Sexo           *string    `json:"sexo,omitempty" db:"sexo"`
	StatusSaude    *string    `json:"status_saude,omitempty" db:"status_saude"`
	FazendaID      int64      `json:"fazenda_id" db:"fazenda_id"`
	CreatedAt      time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at" db:"updated_at"`
}

// Constantes para valores válidos de Sexo (M = Macho, F = Fêmea)
const (
	SexoMacho = "M"
	SexoFemea = "F"
)

// Constantes para valores válidos de StatusSaude
const (
	StatusSaudavel = "SAUDAVEL"
	StatusDoente   = "DOENTE"
	StatusTratamento = "EM_TRATAMENTO"
)

// ValidSexos retorna os valores válidos de sexo
func ValidSexos() []string {
	return []string{SexoMacho, SexoFemea}
}

// ValidStatusSaude retorna os valores válidos de status de saúde
func ValidStatusSaude() []string {
	return []string{StatusSaudavel, StatusDoente, StatusTratamento}
}

// IsValidSexo verifica se o sexo é válido
func IsValidSexo(sexo string) bool {
	for _, s := range ValidSexos() {
		if s == sexo {
			return true
		}
	}
	return false
}

// IsValidStatusSaude verifica se o status de saúde é válido
func IsValidStatusSaude(status string) bool {
	for _, s := range ValidStatusSaude() {
		if s == status {
			return true
		}
	}
	return false
}
