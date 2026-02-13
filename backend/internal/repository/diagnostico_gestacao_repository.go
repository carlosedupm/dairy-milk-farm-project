package repository

import (
	"context"

	"github.com/ceialmilk/api/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type DiagnosticoGestacaoRepository struct {
	db *pgxpool.Pool
}

func NewDiagnosticoGestacaoRepository(db *pgxpool.Pool) *DiagnosticoGestacaoRepository {
	return &DiagnosticoGestacaoRepository{db: db}
}

func (r *DiagnosticoGestacaoRepository) Create(ctx context.Context, d *models.DiagnosticoGestacao) error {
	query := `INSERT INTO diagnosticos_gestacao (animal_id, cobertura_id, data, resultado, dias_gestacao_estimados, metodo, veterinario, observacoes, fazenda_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, created_at`
	return r.db.QueryRow(ctx, query, d.AnimalID, d.CoberturaID, d.Data, d.Resultado, d.DiasGestacaoEstimados, d.Metodo, d.Veterinario, d.Observacoes, d.FazendaID).
		Scan(&d.ID, &d.CreatedAt)
}

func (r *DiagnosticoGestacaoRepository) GetByID(ctx context.Context, id int64) (*models.DiagnosticoGestacao, error) {
	query := `SELECT id, animal_id, cobertura_id, data, resultado, dias_gestacao_estimados, metodo, veterinario, observacoes, fazenda_id, created_at FROM diagnosticos_gestacao WHERE id = $1`
	var d models.DiagnosticoGestacao
	err := r.db.QueryRow(ctx, query, id).Scan(&d.ID, &d.AnimalID, &d.CoberturaID, &d.Data, &d.Resultado, &d.DiasGestacaoEstimados, &d.Metodo, &d.Veterinario, &d.Observacoes, &d.FazendaID, &d.CreatedAt)
	if err == pgx.ErrNoRows {
		return nil, pgx.ErrNoRows
	}
	return &d, err
}

func (r *DiagnosticoGestacaoRepository) GetByAnimalID(ctx context.Context, animalID int64) ([]*models.DiagnosticoGestacao, error) {
	query := `SELECT id, animal_id, cobertura_id, data, resultado, dias_gestacao_estimados, metodo, veterinario, observacoes, fazenda_id, created_at
		FROM diagnosticos_gestacao WHERE animal_id = $1 ORDER BY data DESC`
	rows, err := r.db.Query(ctx, query, animalID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []*models.DiagnosticoGestacao
	for rows.Next() {
		var d models.DiagnosticoGestacao
		if err := rows.Scan(&d.ID, &d.AnimalID, &d.CoberturaID, &d.Data, &d.Resultado, &d.DiasGestacaoEstimados, &d.Metodo, &d.Veterinario, &d.Observacoes, &d.FazendaID, &d.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, &d)
	}
	return list, rows.Err()
}

func (r *DiagnosticoGestacaoRepository) GetByFazendaID(ctx context.Context, fazendaID int64) ([]*models.DiagnosticoGestacao, error) {
	query := `SELECT id, animal_id, cobertura_id, data, resultado, dias_gestacao_estimados, metodo, veterinario, observacoes, fazenda_id, created_at
		FROM diagnosticos_gestacao WHERE fazenda_id = $1 ORDER BY data DESC`
	rows, err := r.db.Query(ctx, query, fazendaID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []*models.DiagnosticoGestacao
	for rows.Next() {
		var d models.DiagnosticoGestacao
		if err := rows.Scan(&d.ID, &d.AnimalID, &d.CoberturaID, &d.Data, &d.Resultado, &d.DiasGestacaoEstimados, &d.Metodo, &d.Veterinario, &d.Observacoes, &d.FazendaID, &d.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, &d)
	}
	return list, rows.Err()
}

func (r *DiagnosticoGestacaoRepository) Delete(ctx context.Context, id int64) error {
	_, err := r.db.Exec(ctx, `DELETE FROM diagnosticos_gestacao WHERE id = $1`, id)
	return err
}
