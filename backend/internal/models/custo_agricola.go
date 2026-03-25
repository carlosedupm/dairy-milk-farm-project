package models

import "time"

type CustoAgricola struct {
	ID               int64     `json:"id" db:"id"`
	SafraCulturaID   int64     `json:"safra_cultura_id" db:"safra_cultura_id"`
	Tipo             string    `json:"tipo" db:"tipo"`
	Subcategoria     *string   `json:"subcategoria,omitempty" db:"subcategoria"`
	Descricao        *string   `json:"descricao,omitempty" db:"descricao"`
	Valor            float64   `json:"valor" db:"valor"`
	Data             time.Time `json:"data" db:"data"`
	Quantidade       *float64  `json:"quantidade,omitempty" db:"quantidade"`
	Unidade          *string   `json:"unidade,omitempty" db:"unidade"`
	FornecedorID     *int64    `json:"fornecedor_id,omitempty" db:"fornecedor_id"`
	CreatedAt        time.Time `json:"created_at" db:"created_at"`
}

const (
	CustoTipoInsumo         = "INSUMO"
	CustoTipoServicoProprio  = "SERVICO_PROPRIO"
	CustoTipoServicoTerceiro = "SERVICO_TERCEIRO"
)

func ValidTiposCustoAgricola() []string {
	return []string{CustoTipoInsumo, CustoTipoServicoProprio, CustoTipoServicoTerceiro}
}
