package repository

import (
	"context"

	"github.com/ceialmilk/api/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type SecagemRepository struct {
	db *pgxpool.Pool
}

func NewSecagemRepository(db *pgxpool.Pool) *SecagemRepository {
	return &SecagemRepository{db: db}
}

func (r *SecagemRepository) Create(ctx context.Context, s *models.Secagem) error {
	query := `INSERT INTO secagens (animal_id, gestacao_id, data_secagem, data_prevista_parto, protocolo, motivo, observacoes, fazenda_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, created_at`
	return r.db.QueryRow(ctx, query, s.AnimalID, s.GestacaoID, s.DataSecagem, s.DataPrevistaParto, s.Protocolo, s.Motivo, s.Observacoes, s.FazendaID).
		Scan(&s.ID, &s.CreatedAt)
}

func (r *SecagemRepository) GetByID(ctx context.Context, id int64) (*models.Secagem, error) {
	query := `SELECT id, animal_id, gestacao_id, data_secagem, data_prevista_parto, protocolo, motivo, observacoes, fazenda_id, created_at FROM secagens WHERE id = $1`
	var s models.Secagem
	err := r.db.QueryRow(ctx, query, id).Scan(&s.ID, &s.AnimalID, &s.GestacaoID, &s.DataSecagem, &s.DataPrevistaParto, &s.Protocolo, &s.Motivo, &s.Observacoes, &s.FazendaID, &s.CreatedAt)
	if err == pgx.ErrNoRows {
		return nil, pgx.ErrNoRows
	}
	return &s, err
}

func (r *SecagemRepository) GetByAnimalID(ctx context.Context, animalID int64) ([]*models.Secagem, error) {
	query := `SELECT id, animal_id, gestacao_id, data_secagem, data_prevista_parto, protocolo, motivo, observacoes, fazenda_id, created_at
		FROM secagens WHERE animal_id = $1 ORDER BY data_secagem DESC`
	rows, err := r.db.Query(ctx, query, animalID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []*models.Secagem
	for rows.Next() {
		var s models.Secagem
		if err := rows.Scan(&s.ID, &s.AnimalID, &s.GestacaoID, &s.DataSecagem, &s.DataPrevistaParto, &s.Protocolo, &s.Motivo, &s.Observacoes, &s.FazendaID, &s.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, &s)
	}
	return list, rows.Err()
}

func (r *SecagemRepository) GetByFazendaID(ctx context.Context, fazendaID int64) ([]*models.Secagem, error) {
	query := `SELECT id, animal_id, gestacao_id, data_secagem, data_prevista_parto, protocolo, motivo, observacoes, fazenda_id, created_at
		FROM secagens WHERE fazenda_id = $1 ORDER BY data_secagem DESC`
	rows, err := r.db.Query(ctx, query, fazendaID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []*models.Secagem
	for rows.Next() {
		var s models.Secagem
		if err := rows.Scan(&s.ID, &s.AnimalID, &s.GestacaoID, &s.DataSecagem, &s.DataPrevistaParto, &s.Protocolo, &s.Motivo, &s.Observacoes, &s.FazendaID, &s.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, &s)
	}
	return list, rows.Err()
}

func (r *SecagemRepository) Delete(ctx context.Context, id int64) error {
	_, err := r.db.Exec(ctx, `DELETE FROM secagens WHERE id = $1`, id)
	return err
}
