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

type SafraCulturaRepository struct {
	db *pgxpool.Pool
}

func NewSafraCulturaRepository(db *pgxpool.Pool) *SafraCulturaRepository {
	return &SafraCulturaRepository{db: db}
}

func (r *SafraCulturaRepository) Create(ctx context.Context, s *models.SafraCultura) error {
	query := `
		INSERT INTO safras_culturas (area_id, ano, cultura, status, data_plantio, data_colheita, observacoes)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, created_at, updated_at
	`
	return r.db.QueryRow(ctx, query, s.AreaID, s.Ano, s.Cultura, s.Status, s.DataPlantio, s.DataColheita, s.Observacoes).
		Scan(&s.ID, &s.CreatedAt, &s.UpdatedAt)
}

func (r *SafraCulturaRepository) GetByID(ctx context.Context, id int64) (*models.SafraCultura, error) {
	query := `SELECT id, area_id, ano, cultura, status, data_plantio, data_colheita, observacoes, created_at, updated_at FROM safras_culturas WHERE id = $1`
	var s models.SafraCultura
	err := r.db.QueryRow(ctx, query, id).Scan(&s.ID, &s.AreaID, &s.Ano, &s.Cultura, &s.Status, &s.DataPlantio, &s.DataColheita, &s.Observacoes, &s.CreatedAt, &s.UpdatedAt)
	if err == pgx.ErrNoRows {
		return nil, pgx.ErrNoRows
	}
	return &s, err
}

func (r *SafraCulturaRepository) GetByAreaIDAndAno(ctx context.Context, areaID int64, ano int) ([]*models.SafraCultura, error) {
	query := `SELECT id, area_id, ano, cultura, status, data_plantio, data_colheita, observacoes, created_at, updated_at FROM safras_culturas WHERE area_id = $1 AND ano = $2 ORDER BY cultura ASC`
	rows, err := r.db.Query(ctx, query, areaID, ano)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []*models.SafraCultura
	for rows.Next() {
		var s models.SafraCultura
		if err := rows.Scan(&s.ID, &s.AreaID, &s.Ano, &s.Cultura, &s.Status, &s.DataPlantio, &s.DataColheita, &s.Observacoes, &s.CreatedAt, &s.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, &s)
	}
	return list, rows.Err()
}

func (r *SafraCulturaRepository) Update(ctx context.Context, s *models.SafraCultura) error {
	if s.ID <= 0 {
		return fmt.Errorf("id da safra cultura invalido: %d", s.ID)
	}
	query := `UPDATE safras_culturas SET status = $1, data_plantio = $2, data_colheita = $3, observacoes = $4, updated_at = $5 WHERE id = $6`
	cmd, err := r.db.Exec(ctx, query, s.Status, s.DataPlantio, s.DataColheita, s.Observacoes, time.Now(), s.ID)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return errors.New("nenhuma linha atualizada")
	}
	return nil
}

func (r *SafraCulturaRepository) Delete(ctx context.Context, id int64) error {
	_, err := r.db.Exec(ctx, `DELETE FROM safras_culturas WHERE id = $1`, id)
	return err
}
