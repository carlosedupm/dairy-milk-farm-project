package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/ceialmilk/api/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AreaRepository struct {
	db *pgxpool.Pool
}

func NewAreaRepository(db *pgxpool.Pool) *AreaRepository {
	return &AreaRepository{db: db}
}

func (r *AreaRepository) Create(ctx context.Context, a *models.Area) error {
	query := `
		INSERT INTO areas (fazenda_id, nome, hectares, descricao)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at, updated_at
	`
	return r.db.QueryRow(ctx, query, a.FazendaID, a.Nome, a.Hectares, a.Descricao).
		Scan(&a.ID, &a.CreatedAt, &a.UpdatedAt)
}

func (r *AreaRepository) GetByID(ctx context.Context, id int64) (*models.Area, error) {
	query := `SELECT id, fazenda_id, nome, hectares, descricao, created_at, updated_at FROM areas WHERE id = $1`
	var a models.Area
	err := r.db.QueryRow(ctx, query, id).Scan(&a.ID, &a.FazendaID, &a.Nome, &a.Hectares, &a.Descricao, &a.CreatedAt, &a.UpdatedAt)
	if err == pgx.ErrNoRows {
		return nil, pgx.ErrNoRows
	}
	return &a, err
}

func (r *AreaRepository) GetByFazendaID(ctx context.Context, fazendaID int64) ([]*models.Area, error) {
	query := `SELECT id, fazenda_id, nome, hectares, descricao, created_at, updated_at FROM areas WHERE fazenda_id = $1 ORDER BY nome ASC`
	rows, err := r.db.Query(ctx, query, fazendaID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []*models.Area
	for rows.Next() {
		var a models.Area
		if err := rows.Scan(&a.ID, &a.FazendaID, &a.Nome, &a.Hectares, &a.Descricao, &a.CreatedAt, &a.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, &a)
	}
	return list, rows.Err()
}

func (r *AreaRepository) Update(ctx context.Context, a *models.Area) error {
	if a.ID <= 0 {
		return fmt.Errorf("id da area invalido: %d", a.ID)
	}
	query := `UPDATE areas SET nome = $1, hectares = $2, descricao = $3, updated_at = $4 WHERE id = $5`
	cmd, err := r.db.Exec(ctx, query, a.Nome, a.Hectares, a.Descricao, time.Now(), a.ID)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return errors.New("nenhuma linha atualizada")
	}
	return nil
}

func (r *AreaRepository) Delete(ctx context.Context, id int64) error {
	_, err := r.db.Exec(ctx, `DELETE FROM areas WHERE id = $1`, id)
	return err
}
