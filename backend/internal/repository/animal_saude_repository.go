package repository

import (
	"context"
	"time"

	"github.com/ceialmilk/api/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AnimalSaudeRepository struct {
	db *pgxpool.Pool
}

func NewAnimalSaudeRepository(db *pgxpool.Pool) *AnimalSaudeRepository {
	return &AnimalSaudeRepository{db: db}
}

func (r *AnimalSaudeRepository) ListByAnimalID(ctx context.Context, animalID int64) ([]*models.AnimalSaude, error) {
	const q = `
		SELECT id, animal_id, tipo_caso, data_inicio, data_fim, status, observacoes, created_by, created_at, updated_at
		FROM animal_saude
		WHERE animal_id = $1
		ORDER BY data_inicio DESC, id DESC
	`
	rows, err := r.db.Query(ctx, q, animalID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*models.AnimalSaude
	for rows.Next() {
		var item models.AnimalSaude
		if err := rows.Scan(
			&item.ID,
			&item.AnimalID,
			&item.TipoCaso,
			&item.DataInicio,
			&item.DataFim,
			&item.Status,
			&item.Observacoes,
			&item.CreatedBy,
			&item.CreatedAt,
			&item.UpdatedAt,
		); err != nil {
			return nil, err
		}
		copyItem := item
		list = append(list, &copyItem)
	}
	return list, rows.Err()
}

func (r *AnimalSaudeRepository) ListAtivosByAnimalID(ctx context.Context, animalID int64) ([]*models.AnimalSaude, error) {
	const q = `
		SELECT id, animal_id, tipo_caso, data_inicio, data_fim, status, observacoes, created_by, created_at, updated_at
		FROM animal_saude
		WHERE animal_id = $1 AND status = 'ATIVO'
		ORDER BY data_inicio DESC, id DESC
	`
	rows, err := r.db.Query(ctx, q, animalID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*models.AnimalSaude
	for rows.Next() {
		var item models.AnimalSaude
		if err := rows.Scan(
			&item.ID,
			&item.AnimalID,
			&item.TipoCaso,
			&item.DataInicio,
			&item.DataFim,
			&item.Status,
			&item.Observacoes,
			&item.CreatedBy,
			&item.CreatedAt,
			&item.UpdatedAt,
		); err != nil {
			return nil, err
		}
		copyItem := item
		list = append(list, &copyItem)
	}
	return list, rows.Err()
}

func (r *AnimalSaudeRepository) GetByID(ctx context.Context, animalID, saudeID int64) (*models.AnimalSaude, error) {
	const q = `
		SELECT id, animal_id, tipo_caso, data_inicio, data_fim, status, observacoes, created_by, created_at, updated_at
		FROM animal_saude
		WHERE id = $1 AND animal_id = $2
	`
	var item models.AnimalSaude
	err := r.db.QueryRow(ctx, q, saudeID, animalID).Scan(
		&item.ID,
		&item.AnimalID,
		&item.TipoCaso,
		&item.DataInicio,
		&item.DataFim,
		&item.Status,
		&item.Observacoes,
		&item.CreatedBy,
		&item.CreatedAt,
		&item.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *AnimalSaudeRepository) Create(ctx context.Context, row *models.AnimalSaude) error {
	const q = `
		INSERT INTO animal_saude (animal_id, tipo_caso, data_inicio, data_fim, status, observacoes, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, created_at, updated_at
	`
	return r.db.QueryRow(
		ctx,
		q,
		row.AnimalID,
		row.TipoCaso,
		row.DataInicio,
		row.DataFim,
		row.Status,
		row.Observacoes,
		row.CreatedBy,
	).Scan(&row.ID, &row.CreatedAt, &row.UpdatedAt)
}

func (r *AnimalSaudeRepository) Update(ctx context.Context, row *models.AnimalSaude) error {
	const q = `
		UPDATE animal_saude
		SET tipo_caso = $1, data_inicio = $2, data_fim = $3, status = $4, observacoes = $5, updated_at = NOW()
		WHERE id = $6 AND animal_id = $7
		RETURNING updated_at
	`
	return r.db.QueryRow(
		ctx,
		q,
		row.TipoCaso,
		row.DataInicio,
		row.DataFim,
		row.Status,
		row.Observacoes,
		row.ID,
		row.AnimalID,
	).Scan(&row.UpdatedAt)
}

func (r *AnimalSaudeRepository) Delete(ctx context.Context, animalID, saudeID int64) error {
	const q = `DELETE FROM animal_saude WHERE id = $1 AND animal_id = $2`
	tag, err := r.db.Exec(ctx, q, saudeID, animalID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

// AlertaAnimalIdentificacao candidato para alertas automáticos de saúde.
type AlertaAnimalIdentificacao struct {
	AnimalID      int64
	Identificacao string
}

func (r *AnimalSaudeRepository) ListTratamentosSemFimVencidosByFazendaID(ctx context.Context, fazendaID int64, limiteDataInicio time.Time) ([]AlertaAnimalIdentificacao, error) {
	q := `
		SELECT DISTINCT a.id, a.identificacao
		FROM animal_saude s
		INNER JOIN animais a ON a.id = s.animal_id
		WHERE a.fazenda_id = $1
		  AND s.status = 'ATIVO'
		  AND s.tipo_caso = 'TRATAMENTO'
		  AND s.data_fim IS NULL
		  AND s.data_inicio::date <= $2::date
		  AND ` + SQLNoRebanhoFor("a") + `
		ORDER BY a.identificacao ASC
	`
	rows, err := r.db.Query(ctx, q, fazendaID, limiteDataInicio)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []AlertaAnimalIdentificacao
	for rows.Next() {
		var item AlertaAnimalIdentificacao
		if err := rows.Scan(&item.AnimalID, &item.Identificacao); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	if out == nil {
		out = []AlertaAnimalIdentificacao{}
	}
	return out, rows.Err()
}
