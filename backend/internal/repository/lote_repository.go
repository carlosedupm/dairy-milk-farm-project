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

type LoteRepository struct {
	db *pgxpool.Pool
}

func NewLoteRepository(db *pgxpool.Pool) *LoteRepository {
	return &LoteRepository{db: db}
}

func (r *LoteRepository) Create(ctx context.Context, lote *models.Lote) error {
	query := `
		INSERT INTO lotes (nome, fazenda_id, tipo, descricao, ativo)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at, updated_at
	`
	err := r.db.QueryRow(ctx, query, lote.Nome, lote.FazendaID, lote.Tipo, lote.Descricao, lote.Ativo).
		Scan(&lote.ID, &lote.CreatedAt, &lote.UpdatedAt)
	return err
}

func (r *LoteRepository) GetByID(ctx context.Context, id int64) (*models.Lote, error) {
	query := `SELECT id, nome, fazenda_id, tipo, descricao, ativo, created_at, updated_at FROM lotes WHERE id = $1`
	var l models.Lote
	err := r.db.QueryRow(ctx, query, id).Scan(&l.ID, &l.Nome, &l.FazendaID, &l.Tipo, &l.Descricao, &l.Ativo, &l.CreatedAt, &l.UpdatedAt)
	if err == pgx.ErrNoRows {
		return nil, pgx.ErrNoRows
	}
	return &l, err
}

func (r *LoteRepository) GetByFazendaID(ctx context.Context, fazendaID int64) ([]*models.Lote, error) {
	query := `SELECT id, nome, fazenda_id, tipo, descricao, ativo, created_at, updated_at FROM lotes WHERE fazenda_id = $1 ORDER BY nome ASC`
	rows, err := r.db.Query(ctx, query, fazendaID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []*models.Lote
	for rows.Next() {
		var l models.Lote
		if err := rows.Scan(&l.ID, &l.Nome, &l.FazendaID, &l.Tipo, &l.Descricao, &l.Ativo, &l.CreatedAt, &l.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, &l)
	}
	return list, rows.Err()
}

func (r *LoteRepository) Update(ctx context.Context, lote *models.Lote) error {
	if lote.ID <= 0 {
		return fmt.Errorf("id do lote invalido: %d", lote.ID)
	}
	query := `UPDATE lotes SET nome = $1, tipo = $2, descricao = $3, ativo = $4, updated_at = $5 WHERE id = $6`
	cmd, err := r.db.Exec(ctx, query, lote.Nome, lote.Tipo, lote.Descricao, lote.Ativo, time.Now(), lote.ID)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return errors.New("nenhuma linha atualizada")
	}
	return nil
}

func (r *LoteRepository) Delete(ctx context.Context, id int64) error {
	_, err := r.db.Exec(ctx, `DELETE FROM lotes WHERE id = $1`, id)
	return err
}
