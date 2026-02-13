package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/ceialmilk/api/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PartoRepository struct {
	db *pgxpool.Pool
}

func NewPartoRepository(db *pgxpool.Pool) *PartoRepository {
	return &PartoRepository{db: db}
}

func (r *PartoRepository) Create(ctx context.Context, p *models.Parto) error {
	query := `INSERT INTO partos (animal_id, gestacao_id, data, tipo, numero_crias, complicacoes, observacoes, fazenda_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, created_at`
	return r.db.QueryRow(ctx, query, p.AnimalID, p.GestacaoID, p.Data, p.Tipo, p.NumeroCrias, p.Complicacoes, p.Observacoes, p.FazendaID).
		Scan(&p.ID, &p.CreatedAt)
}

func (r *PartoRepository) GetByID(ctx context.Context, id int64) (*models.Parto, error) {
	query := `SELECT id, animal_id, gestacao_id, data, tipo, numero_crias, complicacoes, observacoes, fazenda_id, created_at FROM partos WHERE id = $1`
	var p models.Parto
	err := r.db.QueryRow(ctx, query, id).Scan(&p.ID, &p.AnimalID, &p.GestacaoID, &p.Data, &p.Tipo, &p.NumeroCrias, &p.Complicacoes, &p.Observacoes, &p.FazendaID, &p.CreatedAt)
	if err == pgx.ErrNoRows {
		return nil, pgx.ErrNoRows
	}
	return &p, err
}

func (r *PartoRepository) GetByAnimalID(ctx context.Context, animalID int64) ([]*models.Parto, error) {
	query := `SELECT id, animal_id, gestacao_id, data, tipo, numero_crias, complicacoes, observacoes, fazenda_id, created_at
		FROM partos WHERE animal_id = $1 ORDER BY data DESC`
	rows, err := r.db.Query(ctx, query, animalID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []*models.Parto
	for rows.Next() {
		var p models.Parto
		if err := rows.Scan(&p.ID, &p.AnimalID, &p.GestacaoID, &p.Data, &p.Tipo, &p.NumeroCrias, &p.Complicacoes, &p.Observacoes, &p.FazendaID, &p.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, &p)
	}
	return list, rows.Err()
}

func (r *PartoRepository) GetByFazendaID(ctx context.Context, fazendaID int64) ([]*models.Parto, error) {
	query := `SELECT id, animal_id, gestacao_id, data, tipo, numero_crias, complicacoes, observacoes, fazenda_id, created_at
		FROM partos WHERE fazenda_id = $1 ORDER BY data DESC`
	rows, err := r.db.Query(ctx, query, fazendaID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []*models.Parto
	for rows.Next() {
		var p models.Parto
		if err := rows.Scan(&p.ID, &p.AnimalID, &p.GestacaoID, &p.Data, &p.Tipo, &p.NumeroCrias, &p.Complicacoes, &p.Observacoes, &p.FazendaID, &p.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, &p)
	}
	return list, rows.Err()
}

func (r *PartoRepository) Update(ctx context.Context, p *models.Parto) error {
	if p.ID <= 0 {
		return fmt.Errorf("id invalido: %d", p.ID)
	}
	query := `UPDATE partos SET tipo = $1, numero_crias = $2, complicacoes = $3, observacoes = $4 WHERE id = $5`
	cmd, err := r.db.Exec(ctx, query, p.Tipo, p.NumeroCrias, p.Complicacoes, p.Observacoes, p.ID)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return errors.New("nenhuma linha atualizada")
	}
	return nil
}
