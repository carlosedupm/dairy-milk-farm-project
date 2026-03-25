package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/ceialmilk/api/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AnaliseSoloRepository struct {
	db *pgxpool.Pool
}

func NewAnaliseSoloRepository(db *pgxpool.Pool) *AnaliseSoloRepository {
	return &AnaliseSoloRepository{db: db}
}

func (r *AnaliseSoloRepository) Create(ctx context.Context, a *models.AnaliseSolo) error {
	query := `
		INSERT INTO analises_solo (area_id, data_coleta, data_resultado, ph, fosforo_p, potassio_k, materia_organica, outros_resultados, recomendacoes, laboratorio)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id, created_at
	`
	return r.db.QueryRow(ctx, query,
		a.AreaID, a.DataColeta, a.DataResultado, a.Ph, a.FosforoP, a.PotassioK, a.MateriaOrganica,
		a.OutrosResultados, a.Recomendacoes, a.Laboratorio,
	).Scan(&a.ID, &a.CreatedAt)
}

func (r *AnaliseSoloRepository) GetByID(ctx context.Context, id int64) (*models.AnaliseSolo, error) {
	query := `SELECT id, area_id, data_coleta, data_resultado, ph, fosforo_p, potassio_k, materia_organica, outros_resultados, recomendacoes, laboratorio, created_at FROM analises_solo WHERE id = $1`
	var a models.AnaliseSolo
	err := r.db.QueryRow(ctx, query, id).Scan(
		&a.ID, &a.AreaID, &a.DataColeta, &a.DataResultado, &a.Ph, &a.FosforoP, &a.PotassioK, &a.MateriaOrganica,
		&a.OutrosResultados, &a.Recomendacoes, &a.Laboratorio, &a.CreatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, pgx.ErrNoRows
	}
	return &a, err
}

func (r *AnaliseSoloRepository) GetByAreaID(ctx context.Context, areaID int64) ([]*models.AnaliseSolo, error) {
	query := `SELECT id, area_id, data_coleta, data_resultado, ph, fosforo_p, potassio_k, materia_organica, outros_resultados, recomendacoes, laboratorio, created_at FROM analises_solo WHERE area_id = $1 ORDER BY data_coleta DESC`
	rows, err := r.db.Query(ctx, query, areaID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []*models.AnaliseSolo
	for rows.Next() {
		var a models.AnaliseSolo
		if err := rows.Scan(&a.ID, &a.AreaID, &a.DataColeta, &a.DataResultado, &a.Ph, &a.FosforoP, &a.PotassioK, &a.MateriaOrganica, &a.OutrosResultados, &a.Recomendacoes, &a.Laboratorio, &a.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, &a)
	}
	return list, rows.Err()
}

func (r *AnaliseSoloRepository) Update(ctx context.Context, a *models.AnaliseSolo) error {
	if a.ID <= 0 {
		return fmt.Errorf("id da analise invalido: %d", a.ID)
	}
	query := `UPDATE analises_solo SET data_coleta = $1, data_resultado = $2, ph = $3, fosforo_p = $4, potassio_k = $5, materia_organica = $6, outros_resultados = $7, recomendacoes = $8, laboratorio = $9 WHERE id = $10`
	cmd, err := r.db.Exec(ctx, query, a.DataColeta, a.DataResultado, a.Ph, a.FosforoP, a.PotassioK, a.MateriaOrganica, a.OutrosResultados, a.Recomendacoes, a.Laboratorio, a.ID)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return errors.New("nenhuma linha atualizada")
	}
	return nil
}

func (r *AnaliseSoloRepository) Delete(ctx context.Context, id int64) error {
	_, err := r.db.Exec(ctx, `DELETE FROM analises_solo WHERE id = $1`, id)
	return err
}
