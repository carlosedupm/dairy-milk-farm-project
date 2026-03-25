package repository

import (
	"context"

	"github.com/ceialmilk/api/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ProducaoAgricolaRepository struct {
	db *pgxpool.Pool
}

func NewProducaoAgricolaRepository(db *pgxpool.Pool) *ProducaoAgricolaRepository {
	return &ProducaoAgricolaRepository{db: db}
}

func (r *ProducaoAgricolaRepository) Create(ctx context.Context, p *models.ProducaoAgricola) error {
	query := `
		INSERT INTO producoes_agricolas (safra_cultura_id, destino, quantidade_kg, data, observacoes)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at
	`
	return r.db.QueryRow(ctx, query, p.SafraCulturaID, p.Destino, p.QuantidadeKg, p.Data, p.Observacoes).
		Scan(&p.ID, &p.CreatedAt)
}

func (r *ProducaoAgricolaRepository) GetByID(ctx context.Context, id int64) (*models.ProducaoAgricola, error) {
	query := `SELECT id, safra_cultura_id, destino, quantidade_kg, data, observacoes, created_at FROM producoes_agricolas WHERE id = $1`
	var p models.ProducaoAgricola
	err := r.db.QueryRow(ctx, query, id).Scan(&p.ID, &p.SafraCulturaID, &p.Destino, &p.QuantidadeKg, &p.Data, &p.Observacoes, &p.CreatedAt)
	if err == pgx.ErrNoRows {
		return nil, pgx.ErrNoRows
	}
	return &p, err
}

func (r *ProducaoAgricolaRepository) GetBySafraCulturaID(ctx context.Context, safraCulturaID int64) ([]*models.ProducaoAgricola, error) {
	query := `SELECT id, safra_cultura_id, destino, quantidade_kg, data, observacoes, created_at FROM producoes_agricolas WHERE safra_cultura_id = $1 ORDER BY data ASC, id ASC`
	rows, err := r.db.Query(ctx, query, safraCulturaID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []*models.ProducaoAgricola
	for rows.Next() {
		var p models.ProducaoAgricola
		if err := rows.Scan(&p.ID, &p.SafraCulturaID, &p.Destino, &p.QuantidadeKg, &p.Data, &p.Observacoes, &p.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, &p)
	}
	return list, rows.Err()
}
