package repository

import (
	"context"

	"github.com/ceialmilk/api/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ReceitaAgricolaRepository struct {
	db *pgxpool.Pool
}

func NewReceitaAgricolaRepository(db *pgxpool.Pool) *ReceitaAgricolaRepository {
	return &ReceitaAgricolaRepository{db: db}
}

func (r *ReceitaAgricolaRepository) Create(ctx context.Context, rec *models.ReceitaAgricola) error {
	query := `
		INSERT INTO receitas_agricolas (safra_cultura_id, descricao, valor, quantidade_kg, preco_por_kg, data, fornecedor_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, created_at
	`
	return r.db.QueryRow(ctx, query, rec.SafraCulturaID, rec.Descricao, rec.Valor, rec.QuantidadeKg, rec.PrecoPorKg, rec.Data, rec.FornecedorID).
		Scan(&rec.ID, &rec.CreatedAt)
}

func (r *ReceitaAgricolaRepository) GetByID(ctx context.Context, id int64) (*models.ReceitaAgricola, error) {
	query := `SELECT id, safra_cultura_id, descricao, valor, quantidade_kg, preco_por_kg, data, fornecedor_id, created_at FROM receitas_agricolas WHERE id = $1`
	var rec models.ReceitaAgricola
	err := r.db.QueryRow(ctx, query, id).Scan(&rec.ID, &rec.SafraCulturaID, &rec.Descricao, &rec.Valor, &rec.QuantidadeKg, &rec.PrecoPorKg, &rec.Data, &rec.FornecedorID, &rec.CreatedAt)
	if err == pgx.ErrNoRows {
		return nil, pgx.ErrNoRows
	}
	return &rec, err
}

func (r *ReceitaAgricolaRepository) GetBySafraCulturaID(ctx context.Context, safraCulturaID int64) ([]*models.ReceitaAgricola, error) {
	query := `SELECT id, safra_cultura_id, descricao, valor, quantidade_kg, preco_por_kg, data, fornecedor_id, created_at FROM receitas_agricolas WHERE safra_cultura_id = $1 ORDER BY data ASC, id ASC`
	rows, err := r.db.Query(ctx, query, safraCulturaID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []*models.ReceitaAgricola
	for rows.Next() {
		var rec models.ReceitaAgricola
		if err := rows.Scan(&rec.ID, &rec.SafraCulturaID, &rec.Descricao, &rec.Valor, &rec.QuantidadeKg, &rec.PrecoPorKg, &rec.Data, &rec.FornecedorID, &rec.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, &rec)
	}
	return list, rows.Err()
}

func (r *ReceitaAgricolaRepository) TotalBySafraCulturaID(ctx context.Context, safraCulturaID int64) (float64, error) {
	var total float64
	err := r.db.QueryRow(ctx, `SELECT COALESCE(SUM(valor), 0) FROM receitas_agricolas WHERE safra_cultura_id = $1`, safraCulturaID).Scan(&total)
	return total, err
}

func (r *ReceitaAgricolaRepository) TotalByFornecedorIDAndAno(ctx context.Context, fornecedorID int64, ano int) (float64, error) {
	query := `
		SELECT COALESCE(SUM(r.valor), 0) FROM receitas_agricolas r
		INNER JOIN safras_culturas sc ON sc.id = r.safra_cultura_id
		WHERE r.fornecedor_id = $1 AND sc.ano = $2
	`
	var total float64
	err := r.db.QueryRow(ctx, query, fornecedorID, ano).Scan(&total)
	return total, err
}
