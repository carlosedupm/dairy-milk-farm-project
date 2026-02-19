package models

import "time"

// Animal representa um animal cadastrado no sistema
// Estrutura baseada na tabela existente no banco de dados
type Animal struct {
	ID                int64      `json:"id" db:"id"`
	Identificacao     string     `json:"identificacao" db:"identificacao"`
	Raca              *string    `json:"raca,omitempty" db:"raca"`
	DataNascimento    *time.Time `json:"data_nascimento,omitempty" db:"data_nascimento"`
	Sexo              *string    `json:"sexo,omitempty" db:"sexo"`
	StatusSaude       *string    `json:"status_saude,omitempty" db:"status_saude"`
	FazendaID         int64      `json:"fazenda_id" db:"fazenda_id"`
	Categoria         *string    `json:"categoria,omitempty" db:"categoria"`
	StatusReprodutivo *string    `json:"status_reprodutivo,omitempty" db:"status_reprodutivo"`
	MaeID             *int64     `json:"mae_id,omitempty" db:"mae_id"`
	PaiInfo           *string    `json:"pai_info,omitempty" db:"pai_info"`
	LoteID            *int64     `json:"lote_id,omitempty" db:"lote_id"`
	PesoNascimento    *float64   `json:"peso_nascimento,omitempty" db:"peso_nascimento"`
	DataEntrada       *time.Time `json:"data_entrada,omitempty" db:"data_entrada"`
	DataSaida         *time.Time `json:"data_saida,omitempty" db:"data_saida"`
	MotivoSaida       *string    `json:"motivo_saida,omitempty" db:"motivo_saida"`
	OrigemAquisicao   *string    `json:"origem_aquisicao,omitempty" db:"origem_aquisicao"`
	CreatedAt         time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at" db:"updated_at"`
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

// Constantes para Categoria do animal
const (
	CategoriaMatriz   = "MATRIZ"
	CategoriaNovilha  = "NOVILHA"
	CategoriaBezerra  = "BEZERRA"
	CategoriaBezerro  = "BEZERRO"
	CategoriaTouro   = "TOURO"
	CategoriaBoi     = "BOI"
)

// Constantes para StatusReprodutivo (apenas fêmeas)
const (
	StatusReprodutivoVazia   = "VAZIA"
	StatusReprodutivoServida = "SERVIDA"
	StatusReprodutivoPrenhe  = "PRENHE"
	StatusReprodutivoParida  = "PARIDA"
	StatusReprodutivoSeca    = "SECA"
)

// Constantes para OrigemAquisicao (nascido na propriedade vs comprado)
const (
	OrigemNascido  = "NASCIDO"
	OrigemComprado = "COMPRADO"
)

// ValidOrigensAquisicao retorna os valores válidos de origem de aquisição
func ValidOrigensAquisicao() []string {
	return []string{OrigemNascido, OrigemComprado}
}

// IsValidOrigemAquisicao verifica se a origem de aquisição é válida
func IsValidOrigemAquisicao(origem string) bool {
	for _, o := range ValidOrigensAquisicao() {
		if o == origem {
			return true
		}
	}
	return false
}

// Constantes para MotivoSaida
const (
	MotivoSaidaVenda    = "VENDA"
	MotivoSaidaMorte    = "MORTE"
	MotivoSaidaDescarte = "DESCARTE"
	MotivoSaidaDoacao   = "DOACAO"
)

// ValidCategorias retorna os valores válidos de categoria
func ValidCategorias() []string {
	return []string{CategoriaMatriz, CategoriaNovilha, CategoriaBezerra, CategoriaBezerro, CategoriaTouro, CategoriaBoi}
}

// ValidStatusReprodutivo retorna os valores válidos de status reprodutivo
func ValidStatusReprodutivo() []string {
	return []string{StatusReprodutivoVazia, StatusReprodutivoServida, StatusReprodutivoPrenhe, StatusReprodutivoParida, StatusReprodutivoSeca}
}

// ValidMotivosSaida retorna os valores válidos de motivo de saída
func ValidMotivosSaida() []string {
	return []string{MotivoSaidaVenda, MotivoSaidaMorte, MotivoSaidaDescarte, MotivoSaidaDoacao}
}

// IsValidCategoria verifica se a categoria é válida
func IsValidCategoria(categoria string) bool {
	for _, c := range ValidCategorias() {
		if c == categoria {
			return true
		}
	}
	return false
}

// IsBezerra retorna true se o animal é uma bezerra (categoria BEZERRA).
func (a *Animal) IsBezerra() bool {
	return a.Categoria != nil && *a.Categoria == CategoriaBezerra
}

// IsMatriz retorna true se o animal é uma vaca/matriz (categoria MATRIZ).
func (a *Animal) IsMatriz() bool {
	return a.Categoria != nil && *a.Categoria == CategoriaMatriz
}

// IsNovilha retorna true se o animal é uma novilha (categoria NOVILHA).
func (a *Animal) IsNovilha() bool {
	return a.Categoria != nil && *a.Categoria == CategoriaNovilha
}

// IsValidStatusReprodutivo verifica se o status reprodutivo é válido
func IsValidStatusReprodutivo(status string) bool {
	for _, s := range ValidStatusReprodutivo() {
		if s == status {
			return true
		}
	}
	return false
}

// IsValidMotivoSaida verifica se o motivo de saída é válido
func IsValidMotivoSaida(motivo string) bool {
	for _, m := range ValidMotivosSaida() {
		if m == motivo {
			return true
		}
	}
	return false
}
