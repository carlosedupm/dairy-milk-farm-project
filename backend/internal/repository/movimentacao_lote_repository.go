package repository

import (
	"context"

	"github.com/ceialmilk/api/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type MovimentacaoLoteRepository struct {
	db *pgxpool.Pool
}

func NewMovimentacaoLoteRepository(db *pgxpool.Pool) *MovimentacaoLoteRepository {
	return &MovimentacaoLoteRepository{db: db}
}

func (r *MovimentacaoLoteRepository) Create(ctx context.Context, m *models.MovimentacaoLote) error {
	query := `INSERT INTO movimentacoes_lote (animal_id, lote_origem_id, lote_destino_id, data, motivo, usuario_id)
		VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at`
	return r.db.QueryRow(ctx, query, m.AnimalID, m.LoteOrigemID, m.LoteDestinoID, m.Data, m.Motivo, m.UsuarioID).
		Scan(&m.ID, &m.CreatedAt)
}

func (r *MovimentacaoLoteRepository) GetByAnimalID(ctx context.Context, animalID int64) ([]*models.MovimentacaoLote, error) {
	query := `SELECT id, animal_id, lote_origem_id, lote_destino_id, data, motivo, usuario_id, created_at
		FROM movimentacoes_lote WHERE animal_id = $1 ORDER BY data DESC`
	rows, err := r.db.Query(ctx, query, animalID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []*models.MovimentacaoLote
	for rows.Next() {
		var m models.MovimentacaoLote
		if err := rows.Scan(&m.ID, &m.AnimalID, &m.LoteOrigemID, &m.LoteDestinoID, &m.Data, &m.Motivo, &m.UsuarioID, &m.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, &m)
	}
	return list, rows.Err()
}

func (r *MovimentacaoLoteRepository) GetByID(ctx context.Context, id int64) (*models.MovimentacaoLote, error) {
	query := `SELECT id, animal_id, lote_origem_id, lote_destino_id, data, motivo, usuario_id, created_at
		FROM movimentacoes_lote WHERE id = $1`
	var m models.MovimentacaoLote
	err := r.db.QueryRow(ctx, query, id).Scan(&m.ID, &m.AnimalID, &m.LoteOrigemID, &m.LoteDestinoID, &m.Data, &m.Motivo, &m.UsuarioID, &m.CreatedAt)
	if err == pgx.ErrNoRows {
		return nil, pgx.ErrNoRows
	}
	return &m, err
}
