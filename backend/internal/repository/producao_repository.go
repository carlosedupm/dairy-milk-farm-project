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

type ProducaoRepository struct {
	db *pgxpool.Pool
}

func NewProducaoRepository(db *pgxpool.Pool) *ProducaoRepository {
	return &ProducaoRepository{db: db}
}

func (r *ProducaoRepository) Create(ctx context.Context, producao *models.ProducaoLeite) error {
	query := `
		INSERT INTO producao_leite (animal_id, quantidade, data_hora, qualidade)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at
	`

	err := r.db.QueryRow(
		ctx,
		query,
		producao.AnimalID,
		producao.Quantidade,
		producao.DataHora,
		producao.Qualidade,
	).Scan(&producao.ID, &producao.CreatedAt)

	return err
}

func (r *ProducaoRepository) GetByID(ctx context.Context, id int64) (*models.ProducaoLeite, error) {
	query := `
		SELECT id, animal_id, quantidade, data_hora, qualidade, created_at
		FROM producao_leite
		WHERE id = $1
	`

	var producao models.ProducaoLeite
	err := r.db.QueryRow(ctx, query, id).Scan(
		&producao.ID,
		&producao.AnimalID,
		&producao.Quantidade,
		&producao.DataHora,
		&producao.Qualidade,
		&producao.CreatedAt,
	)

	if err == pgx.ErrNoRows {
		return nil, pgx.ErrNoRows
	}

	return &producao, err
}

func (r *ProducaoRepository) GetAll(ctx context.Context) ([]*models.ProducaoLeite, error) {
	query := `
		SELECT id, animal_id, quantidade, data_hora, qualidade, created_at
		FROM producao_leite
		ORDER BY data_hora DESC
	`

	return r.queryList(ctx, query)
}

func (r *ProducaoRepository) GetByAnimalID(ctx context.Context, animalID int64) ([]*models.ProducaoLeite, error) {
	query := `
		SELECT id, animal_id, quantidade, data_hora, qualidade, created_at
		FROM producao_leite
		WHERE animal_id = $1
		ORDER BY data_hora DESC
	`

	return r.queryList(ctx, query, animalID)
}

func (r *ProducaoRepository) GetByDateRange(ctx context.Context, startDate, endDate time.Time) ([]*models.ProducaoLeite, error) {
	query := `
		SELECT id, animal_id, quantidade, data_hora, qualidade, created_at
		FROM producao_leite
		WHERE data_hora BETWEEN $1 AND $2
		ORDER BY data_hora DESC
	`

	return r.queryList(ctx, query, startDate, endDate)
}

func (r *ProducaoRepository) GetByAnimalAndDateRange(ctx context.Context, animalID int64, startDate, endDate time.Time) ([]*models.ProducaoLeite, error) {
	query := `
		SELECT id, animal_id, quantidade, data_hora, qualidade, created_at
		FROM producao_leite
		WHERE animal_id = $1 AND data_hora BETWEEN $2 AND $3
		ORDER BY data_hora DESC
	`

	return r.queryList(ctx, query, animalID, startDate, endDate)
}

func (r *ProducaoRepository) Update(ctx context.Context, producao *models.ProducaoLeite) error {
	if producao.ID <= 0 {
		return fmt.Errorf("id da produção inválido: %d", producao.ID)
	}
	query := `
		UPDATE producao_leite
		SET animal_id = $1, quantidade = $2, data_hora = $3, qualidade = $4
		WHERE id = $5
	`

	cmd, err := r.db.Exec(
		ctx,
		query,
		producao.AnimalID,
		producao.Quantidade,
		producao.DataHora,
		producao.Qualidade,
		producao.ID,
	)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return errors.New("nenhuma linha atualizada (id não encontrado ou sem alteração)")
	}
	return nil
}

func (r *ProducaoRepository) Delete(ctx context.Context, id int64) error {
	query := `DELETE FROM producao_leite WHERE id = $1`
	_, err := r.db.Exec(ctx, query, id)
	return err
}

func (r *ProducaoRepository) Count(ctx context.Context) (int64, error) {
	var n int64
	err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM producao_leite`).Scan(&n)
	return n, err
}

func (r *ProducaoRepository) CountByAnimal(ctx context.Context, animalID int64) (int64, error) {
	var n int64
	err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM producao_leite WHERE animal_id = $1`, animalID).Scan(&n)
	return n, err
}

func (r *ProducaoRepository) GetResumoByAnimal(ctx context.Context, animalID int64) (*models.ProducaoResumo, error) {
	query := `
		SELECT COALESCE(SUM(quantidade), 0), COALESCE(AVG(quantidade), 0), COUNT(*)
		FROM producao_leite
		WHERE animal_id = $1
	`

	var resumo models.ProducaoResumo
	err := r.db.QueryRow(ctx, query, animalID).Scan(&resumo.TotalLitros, &resumo.MediaLitros, &resumo.TotalRegistros)
	return &resumo, err
}

func (r *ProducaoRepository) queryList(ctx context.Context, query string, args ...interface{}) ([]*models.ProducaoLeite, error) {
	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*models.ProducaoLeite
	for rows.Next() {
		var p models.ProducaoLeite
		err := rows.Scan(
			&p.ID,
			&p.AnimalID,
			&p.Quantidade,
			&p.DataHora,
			&p.Qualidade,
			&p.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		pCopy := p
		list = append(list, &pCopy)
	}
	return list, rows.Err()
}
