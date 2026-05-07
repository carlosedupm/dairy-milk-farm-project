package repository

import (
	"context"
	"errors"
	"time"

	"github.com/ceialmilk/api/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type RestricaoLeiteRepository struct {
	db *pgxpool.Pool
}

func NewRestricaoLeiteRepository(db *pgxpool.Pool) *RestricaoLeiteRepository {
	return &RestricaoLeiteRepository{db: db}
}

func (r *RestricaoLeiteRepository) ListAtivasByFazendaID(ctx context.Context, fazendaID int64) ([]models.RestricaoLeiteAtiva, error) {
	const q = `
		SELECT r.id, r.animal_id, a.identificacao, r.motivo, r.inicio_em, r.observacao, r.status, r.created_at, r.updated_at
		FROM restricoes_leite r
		INNER JOIN animais a ON a.id = r.animal_id
		WHERE r.fazenda_id = $1 AND r.status = 'AGUARDANDO_LAB'
		ORDER BY a.identificacao ASC
	`
	rows, err := r.db.Query(ctx, q, fazendaID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []models.RestricaoLeiteAtiva
	for rows.Next() {
		var item models.RestricaoLeiteAtiva
		if err := rows.Scan(
			&item.ID,
			&item.AnimalID,
			&item.Identificacao,
			&item.Motivo,
			&item.InicioEm,
			&item.Observacao,
			&item.Status,
			&item.CreatedAt,
			&item.UpdatedAt,
		); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (r *RestricaoLeiteRepository) GetAtivaByAnimalID(ctx context.Context, animalID int64) (*models.RestricaoLeite, error) {
	const q = `
		SELECT id, fazenda_id, animal_id, motivo, inicio_em, observacao, status, liberado_em, liberado_observacao, created_at, updated_at
		FROM restricoes_leite
		WHERE animal_id = $1 AND status = 'AGUARDANDO_LAB'
		LIMIT 1
	`
	var m models.RestricaoLeite
	err := r.db.QueryRow(ctx, q, animalID).Scan(
		&m.ID,
		&m.FazendaID,
		&m.AnimalID,
		&m.Motivo,
		&m.InicioEm,
		&m.Observacao,
		&m.Status,
		&m.LiberadoEm,
		&m.LiberadoObservacao,
		&m.CreatedAt,
		&m.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &m, nil
}

func (r *RestricaoLeiteRepository) GetByID(ctx context.Context, id int64) (*models.RestricaoLeite, error) {
	const q = `
		SELECT id, fazenda_id, animal_id, motivo, inicio_em, observacao, status, liberado_em, liberado_observacao, created_at, updated_at
		FROM restricoes_leite
		WHERE id = $1
	`
	var m models.RestricaoLeite
	err := r.db.QueryRow(ctx, q, id).Scan(
		&m.ID,
		&m.FazendaID,
		&m.AnimalID,
		&m.Motivo,
		&m.InicioEm,
		&m.Observacao,
		&m.Status,
		&m.LiberadoEm,
		&m.LiberadoObservacao,
		&m.CreatedAt,
		&m.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &m, nil
}

func (r *RestricaoLeiteRepository) Create(ctx context.Context, row *models.RestricaoLeite) error {
	const q = `
		INSERT INTO restricoes_leite (fazenda_id, animal_id, motivo, inicio_em, observacao, status)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at, updated_at
	`
	return r.db.QueryRow(ctx, q,
		row.FazendaID,
		row.AnimalID,
		row.Motivo,
		row.InicioEm,
		row.Observacao,
		row.Status,
	).Scan(&row.ID, &row.CreatedAt, &row.UpdatedAt)
}

func (r *RestricaoLeiteRepository) Liberar(ctx context.Context, id int64, liberadoEm time.Time, liberadoObs *string) error {
	const q = `
		UPDATE restricoes_leite
		SET status = 'LIBERADO', liberado_em = $2, liberado_observacao = $3, updated_at = NOW()
		WHERE id = $1 AND status = 'AGUARDANDO_LAB'
	`
	tag, err := r.db.Exec(ctx, q, id, liberadoEm, liberadoObs)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}
