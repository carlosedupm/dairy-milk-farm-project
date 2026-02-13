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

type GestacaoRepository struct {
	db *pgxpool.Pool
}

func NewGestacaoRepository(db *pgxpool.Pool) *GestacaoRepository {
	return &GestacaoRepository{db: db}
}

func (r *GestacaoRepository) Create(ctx context.Context, g *models.Gestacao) error {
	query := `INSERT INTO gestacoes (animal_id, cobertura_id, data_confirmacao, data_prevista_parto, status, observacoes, fazenda_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, created_at, updated_at`
	return r.db.QueryRow(ctx, query, g.AnimalID, g.CoberturaID, g.DataConfirmacao, g.DataPrevistaParto, g.Status, g.Observacoes, g.FazendaID).
		Scan(&g.ID, &g.CreatedAt, &g.UpdatedAt)
}

func (r *GestacaoRepository) GetByID(ctx context.Context, id int64) (*models.Gestacao, error) {
	query := `SELECT id, animal_id, cobertura_id, data_confirmacao, data_prevista_parto, status, observacoes, fazenda_id, created_at, updated_at FROM gestacoes WHERE id = $1`
	var g models.Gestacao
	err := r.db.QueryRow(ctx, query, id).Scan(&g.ID, &g.AnimalID, &g.CoberturaID, &g.DataConfirmacao, &g.DataPrevistaParto, &g.Status, &g.Observacoes, &g.FazendaID, &g.CreatedAt, &g.UpdatedAt)
	if err == pgx.ErrNoRows {
		return nil, pgx.ErrNoRows
	}
	return &g, err
}

func (r *GestacaoRepository) GetByAnimalID(ctx context.Context, animalID int64) ([]*models.Gestacao, error) {
	query := `SELECT id, animal_id, cobertura_id, data_confirmacao, data_prevista_parto, status, observacoes, fazenda_id, created_at, updated_at
		FROM gestacoes WHERE animal_id = $1 ORDER BY data_confirmacao DESC`
	rows, err := r.db.Query(ctx, query, animalID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []*models.Gestacao
	for rows.Next() {
		var g models.Gestacao
		if err := rows.Scan(&g.ID, &g.AnimalID, &g.CoberturaID, &g.DataConfirmacao, &g.DataPrevistaParto, &g.Status, &g.Observacoes, &g.FazendaID, &g.CreatedAt, &g.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, &g)
	}
	return list, rows.Err()
}

func (r *GestacaoRepository) GetByFazendaID(ctx context.Context, fazendaID int64) ([]*models.Gestacao, error) {
	query := `SELECT id, animal_id, cobertura_id, data_confirmacao, data_prevista_parto, status, observacoes, fazenda_id, created_at, updated_at
		FROM gestacoes WHERE fazenda_id = $1 ORDER BY data_confirmacao DESC`
	rows, err := r.db.Query(ctx, query, fazendaID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []*models.Gestacao
	for rows.Next() {
		var g models.Gestacao
		if err := rows.Scan(&g.ID, &g.AnimalID, &g.CoberturaID, &g.DataConfirmacao, &g.DataPrevistaParto, &g.Status, &g.Observacoes, &g.FazendaID, &g.CreatedAt, &g.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, &g)
	}
	return list, rows.Err()
}

func (r *GestacaoRepository) Update(ctx context.Context, g *models.Gestacao) error {
	if g.ID <= 0 {
		return fmt.Errorf("id invalido: %d", g.ID)
	}
	query := `UPDATE gestacoes SET data_prevista_parto = $1, status = $2, observacoes = $3, updated_at = $4 WHERE id = $5`
	cmd, err := r.db.Exec(ctx, query, g.DataPrevistaParto, g.Status, g.Observacoes, time.Now(), g.ID)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return errors.New("nenhuma linha atualizada")
	}
	return nil
}
