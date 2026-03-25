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

type FornecedorRepository struct {
	db *pgxpool.Pool
}

func NewFornecedorRepository(db *pgxpool.Pool) *FornecedorRepository {
	return &FornecedorRepository{db: db}
}

func (r *FornecedorRepository) Create(ctx context.Context, f *models.Fornecedor) error {
	query := `
		INSERT INTO fornecedores (fazenda_id, nome, tipo, contato, observacoes, ativo)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at, updated_at
	`
	return r.db.QueryRow(ctx, query, f.FazendaID, f.Nome, f.Tipo, f.Contato, f.Observacoes, f.Ativo).
		Scan(&f.ID, &f.CreatedAt, &f.UpdatedAt)
}

func (r *FornecedorRepository) GetByID(ctx context.Context, id int64) (*models.Fornecedor, error) {
	query := `SELECT id, fazenda_id, nome, tipo, contato, observacoes, ativo, created_at, updated_at FROM fornecedores WHERE id = $1`
	var f models.Fornecedor
	err := r.db.QueryRow(ctx, query, id).Scan(&f.ID, &f.FazendaID, &f.Nome, &f.Tipo, &f.Contato, &f.Observacoes, &f.Ativo, &f.CreatedAt, &f.UpdatedAt)
	if err == pgx.ErrNoRows {
		return nil, pgx.ErrNoRows
	}
	return &f, err
}

func (r *FornecedorRepository) GetByFazendaID(ctx context.Context, fazendaID int64) ([]*models.Fornecedor, error) {
	query := `SELECT id, fazenda_id, nome, tipo, contato, observacoes, ativo, created_at, updated_at FROM fornecedores WHERE fazenda_id = $1 ORDER BY nome ASC`
	rows, err := r.db.Query(ctx, query, fazendaID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []*models.Fornecedor
	for rows.Next() {
		var f models.Fornecedor
		if err := rows.Scan(&f.ID, &f.FazendaID, &f.Nome, &f.Tipo, &f.Contato, &f.Observacoes, &f.Ativo, &f.CreatedAt, &f.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, &f)
	}
	return list, rows.Err()
}

func (r *FornecedorRepository) Update(ctx context.Context, f *models.Fornecedor) error {
	if f.ID <= 0 {
		return fmt.Errorf("id do fornecedor invalido: %d", f.ID)
	}
	query := `UPDATE fornecedores SET nome = $1, tipo = $2, contato = $3, observacoes = $4, ativo = $5, updated_at = $6 WHERE id = $7`
	cmd, err := r.db.Exec(ctx, query, f.Nome, f.Tipo, f.Contato, f.Observacoes, f.Ativo, time.Now(), f.ID)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return errors.New("nenhuma linha atualizada")
	}
	return nil
}

func (r *FornecedorRepository) Delete(ctx context.Context, id int64) error {
	_, err := r.db.Exec(ctx, `DELETE FROM fornecedores WHERE id = $1`, id)
	return err
}
