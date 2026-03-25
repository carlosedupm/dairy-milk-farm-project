package repository

import (
	"context"

	"github.com/ceialmilk/api/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type CustoAgricolaRepository struct {
	db *pgxpool.Pool
}

func NewCustoAgricolaRepository(db *pgxpool.Pool) *CustoAgricolaRepository {
	return &CustoAgricolaRepository{db: db}
}

func (r *CustoAgricolaRepository) Create(ctx context.Context, c *models.CustoAgricola) error {
	query := `
		INSERT INTO custos_agricolas (safra_cultura_id, tipo, subcategoria, descricao, valor, data, quantidade, unidade, fornecedor_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, created_at
	`
	return r.db.QueryRow(ctx, query, c.SafraCulturaID, c.Tipo, c.Subcategoria, c.Descricao, c.Valor, c.Data, c.Quantidade, c.Unidade, c.FornecedorID).
		Scan(&c.ID, &c.CreatedAt)
}

func (r *CustoAgricolaRepository) GetByID(ctx context.Context, id int64) (*models.CustoAgricola, error) {
	query := `SELECT id, safra_cultura_id, tipo, subcategoria, descricao, valor, data, quantidade, unidade, fornecedor_id, created_at FROM custos_agricolas WHERE id = $1`
	var c models.CustoAgricola
	err := r.db.QueryRow(ctx, query, id).Scan(&c.ID, &c.SafraCulturaID, &c.Tipo, &c.Subcategoria, &c.Descricao, &c.Valor, &c.Data, &c.Quantidade, &c.Unidade, &c.FornecedorID, &c.CreatedAt)
	if err == pgx.ErrNoRows {
		return nil, pgx.ErrNoRows
	}
	return &c, err
}

func (r *CustoAgricolaRepository) GetBySafraCulturaID(ctx context.Context, safraCulturaID int64) ([]*models.CustoAgricola, error) {
	query := `SELECT id, safra_cultura_id, tipo, subcategoria, descricao, valor, data, quantidade, unidade, fornecedor_id, created_at FROM custos_agricolas WHERE safra_cultura_id = $1 ORDER BY data ASC, id ASC`
	rows, err := r.db.Query(ctx, query, safraCulturaID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []*models.CustoAgricola
	for rows.Next() {
		var c models.CustoAgricola
		if err := rows.Scan(&c.ID, &c.SafraCulturaID, &c.Tipo, &c.Subcategoria, &c.Descricao, &c.Valor, &c.Data, &c.Quantidade, &c.Unidade, &c.FornecedorID, &c.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, &c)
	}
	return list, rows.Err()
}

func (r *CustoAgricolaRepository) TotalBySafraCulturaID(ctx context.Context, safraCulturaID int64) (float64, error) {
	var total float64
	err := r.db.QueryRow(ctx, `SELECT COALESCE(SUM(valor), 0) FROM custos_agricolas WHERE safra_cultura_id = $1`, safraCulturaID).Scan(&total)
	return total, err
}

func (r *CustoAgricolaRepository) TotalByFornecedorIDAndAno(ctx context.Context, fornecedorID int64, ano int) (float64, error) {
	query := `
		SELECT COALESCE(SUM(c.valor), 0) FROM custos_agricolas c
		INNER JOIN safras_culturas sc ON sc.id = c.safra_cultura_id
		WHERE c.fornecedor_id = $1 AND sc.ano = $2
	`
	var total float64
	err := r.db.QueryRow(ctx, query, fornecedorID, ano).Scan(&total)
	return total, err
}
