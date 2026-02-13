package repository

import (
	"context"

	"github.com/ceialmilk/api/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type CriaRepository struct {
	db *pgxpool.Pool
}

func NewCriaRepository(db *pgxpool.Pool) *CriaRepository {
	return &CriaRepository{db: db}
}

func (r *CriaRepository) Create(ctx context.Context, c *models.Cria) error {
	query := `INSERT INTO crias (parto_id, animal_id, sexo, peso, condicao, observacoes)
		VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at`
	return r.db.QueryRow(ctx, query, c.PartoID, c.AnimalID, c.Sexo, c.Peso, c.Condicao, c.Observacoes).
		Scan(&c.ID, &c.CreatedAt)
}

func (r *CriaRepository) GetByID(ctx context.Context, id int64) (*models.Cria, error) {
	query := `SELECT id, parto_id, animal_id, sexo, peso, condicao, observacoes, created_at FROM crias WHERE id = $1`
	var c models.Cria
	err := r.db.QueryRow(ctx, query, id).Scan(&c.ID, &c.PartoID, &c.AnimalID, &c.Sexo, &c.Peso, &c.Condicao, &c.Observacoes, &c.CreatedAt)
	if err == pgx.ErrNoRows {
		return nil, pgx.ErrNoRows
	}
	return &c, err
}

func (r *CriaRepository) GetByPartoID(ctx context.Context, partoID int64) ([]*models.Cria, error) {
	query := `SELECT id, parto_id, animal_id, sexo, peso, condicao, observacoes, created_at FROM crias WHERE parto_id = $1 ORDER BY id ASC`
	rows, err := r.db.Query(ctx, query, partoID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []*models.Cria
	for rows.Next() {
		var c models.Cria
		if err := rows.Scan(&c.ID, &c.PartoID, &c.AnimalID, &c.Sexo, &c.Peso, &c.Condicao, &c.Observacoes, &c.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, &c)
	}
	return list, rows.Err()
}

func (r *CriaRepository) Update(ctx context.Context, c *models.Cria) error {
	query := `UPDATE crias SET animal_id = $1, peso = $2, condicao = $3, observacoes = $4 WHERE id = $5`
	_, err := r.db.Exec(ctx, query, c.AnimalID, c.Peso, c.Condicao, c.Observacoes, c.ID)
	return err
}
