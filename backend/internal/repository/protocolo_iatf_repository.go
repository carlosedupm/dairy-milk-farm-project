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

type ProtocoloIATFRepository struct {
	db *pgxpool.Pool
}

func NewProtocoloIATFRepository(db *pgxpool.Pool) *ProtocoloIATFRepository {
	return &ProtocoloIATFRepository{db: db}
}

func (r *ProtocoloIATFRepository) Create(ctx context.Context, p *models.ProtocoloIATF) error {
	query := `INSERT INTO protocolos_iatf (nome, descricao, dias_protocolo, fazenda_id, ativo)
		VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at, updated_at`
	return r.db.QueryRow(ctx, query, p.Nome, p.Descricao, p.DiasProtocolo, p.FazendaID, p.Ativo).
		Scan(&p.ID, &p.CreatedAt, &p.UpdatedAt)
}

func (r *ProtocoloIATFRepository) GetByID(ctx context.Context, id int64) (*models.ProtocoloIATF, error) {
	query := `SELECT id, nome, descricao, dias_protocolo, fazenda_id, ativo, created_at, updated_at FROM protocolos_iatf WHERE id = $1`
	var p models.ProtocoloIATF
	err := r.db.QueryRow(ctx, query, id).Scan(&p.ID, &p.Nome, &p.Descricao, &p.DiasProtocolo, &p.FazendaID, &p.Ativo, &p.CreatedAt, &p.UpdatedAt)
	if err == pgx.ErrNoRows {
		return nil, pgx.ErrNoRows
	}
	return &p, err
}

func (r *ProtocoloIATFRepository) GetByFazendaID(ctx context.Context, fazendaID int64) ([]*models.ProtocoloIATF, error) {
	query := `SELECT id, nome, descricao, dias_protocolo, fazenda_id, ativo, created_at, updated_at FROM protocolos_iatf WHERE fazenda_id = $1 ORDER BY nome ASC`
	rows, err := r.db.Query(ctx, query, fazendaID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []*models.ProtocoloIATF
	for rows.Next() {
		var p models.ProtocoloIATF
		if err := rows.Scan(&p.ID, &p.Nome, &p.Descricao, &p.DiasProtocolo, &p.FazendaID, &p.Ativo, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, &p)
	}
	return list, rows.Err()
}

func (r *ProtocoloIATFRepository) Update(ctx context.Context, p *models.ProtocoloIATF) error {
	if p.ID <= 0 {
		return fmt.Errorf("id invalido: %d", p.ID)
	}
	query := `UPDATE protocolos_iatf SET nome = $1, descricao = $2, dias_protocolo = $3, ativo = $4, updated_at = $5 WHERE id = $6`
	cmd, err := r.db.Exec(ctx, query, p.Nome, p.Descricao, p.DiasProtocolo, p.Ativo, time.Now(), p.ID)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return errors.New("nenhuma linha atualizada")
	}
	return nil
}

func (r *ProtocoloIATFRepository) Delete(ctx context.Context, id int64) error {
	_, err := r.db.Exec(ctx, `DELETE FROM protocolos_iatf WHERE id = $1`, id)
	return err
}
