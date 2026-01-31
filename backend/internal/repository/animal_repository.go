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

type AnimalRepository struct {
	db *pgxpool.Pool
}

func NewAnimalRepository(db *pgxpool.Pool) *AnimalRepository {
	return &AnimalRepository{db: db}
}

func (r *AnimalRepository) Create(ctx context.Context, animal *models.Animal) error {
	query := `
		INSERT INTO animais (identificacao, raca, data_nascimento, sexo, status_saude, fazenda_id)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at, updated_at
	`

	err := r.db.QueryRow(
		ctx,
		query,
		animal.Identificacao,
		animal.Raca,
		animal.DataNascimento,
		animal.Sexo,
		animal.StatusSaude,
		animal.FazendaID,
	).Scan(&animal.ID, &animal.CreatedAt, &animal.UpdatedAt)

	return err
}

func (r *AnimalRepository) GetByID(ctx context.Context, id int64) (*models.Animal, error) {
	query := `
		SELECT id, identificacao, raca, data_nascimento, sexo, status_saude, fazenda_id, created_at, updated_at
		FROM animais
		WHERE id = $1
	`

	var animal models.Animal
	err := r.db.QueryRow(ctx, query, id).Scan(
		&animal.ID,
		&animal.Identificacao,
		&animal.Raca,
		&animal.DataNascimento,
		&animal.Sexo,
		&animal.StatusSaude,
		&animal.FazendaID,
		&animal.CreatedAt,
		&animal.UpdatedAt,
	)

	if err == pgx.ErrNoRows {
		return nil, pgx.ErrNoRows
	}

	return &animal, err
}

func (r *AnimalRepository) GetAll(ctx context.Context) ([]*models.Animal, error) {
	query := `
		SELECT id, identificacao, raca, data_nascimento, sexo, status_saude, fazenda_id, created_at, updated_at
		FROM animais
		ORDER BY created_at DESC
	`

	return r.queryList(ctx, query)
}

func (r *AnimalRepository) GetByFazendaID(ctx context.Context, fazendaID int64) ([]*models.Animal, error) {
	query := `
		SELECT id, identificacao, raca, data_nascimento, sexo, status_saude, fazenda_id, created_at, updated_at
		FROM animais
		WHERE fazenda_id = $1
		ORDER BY created_at DESC
	`

	return r.queryList(ctx, query, fazendaID)
}

func (r *AnimalRepository) Update(ctx context.Context, animal *models.Animal) error {
	if animal.ID <= 0 {
		return fmt.Errorf("id do animal inválido: %d", animal.ID)
	}
	query := `
		UPDATE animais
		SET identificacao = $1, raca = $2, data_nascimento = $3, sexo = $4, status_saude = $5, fazenda_id = $6, updated_at = $7
		WHERE id = $8
	`

	cmd, err := r.db.Exec(
		ctx,
		query,
		animal.Identificacao,
		animal.Raca,
		animal.DataNascimento,
		animal.Sexo,
		animal.StatusSaude,
		animal.FazendaID,
		time.Now(),
		animal.ID,
	)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return errors.New("nenhuma linha atualizada (id não encontrado ou sem alteração)")
	}
	return nil
}

func (r *AnimalRepository) Delete(ctx context.Context, id int64) error {
	query := `DELETE FROM animais WHERE id = $1`
	_, err := r.db.Exec(ctx, query, id)
	return err
}

func (r *AnimalRepository) SearchByIdentificacao(ctx context.Context, identificacao string) ([]*models.Animal, error) {
	query := `
		SELECT id, identificacao, raca, data_nascimento, sexo, status_saude, fazenda_id, created_at, updated_at
		FROM animais
		WHERE identificacao ILIKE '%' || $1 || '%'
		ORDER BY created_at DESC
	`
	return r.queryList(ctx, query, identificacao)
}

func (r *AnimalRepository) GetByStatusSaude(ctx context.Context, statusSaude string) ([]*models.Animal, error) {
	query := `
		SELECT id, identificacao, raca, data_nascimento, sexo, status_saude, fazenda_id, created_at, updated_at
		FROM animais
		WHERE status_saude = $1
		ORDER BY created_at DESC
	`
	return r.queryList(ctx, query, statusSaude)
}

func (r *AnimalRepository) GetBySexo(ctx context.Context, sexo string) ([]*models.Animal, error) {
	query := `
		SELECT id, identificacao, raca, data_nascimento, sexo, status_saude, fazenda_id, created_at, updated_at
		FROM animais
		WHERE sexo = $1
		ORDER BY created_at DESC
	`
	return r.queryList(ctx, query, sexo)
}

func (r *AnimalRepository) Count(ctx context.Context) (int64, error) {
	var n int64
	err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM animais`).Scan(&n)
	return n, err
}

func (r *AnimalRepository) CountByFazenda(ctx context.Context, fazendaID int64) (int64, error) {
	var n int64
	err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM animais WHERE fazenda_id = $1`, fazendaID).Scan(&n)
	return n, err
}

func (r *AnimalRepository) ExistsByIdentificacao(ctx context.Context, identificacao string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM animais WHERE identificacao = $1)`, identificacao).Scan(&exists)
	return exists, err
}

func (r *AnimalRepository) queryList(ctx context.Context, query string, args ...interface{}) ([]*models.Animal, error) {
	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*models.Animal
	for rows.Next() {
		var a models.Animal
		err := rows.Scan(
			&a.ID,
			&a.Identificacao,
			&a.Raca,
			&a.DataNascimento,
			&a.Sexo,
			&a.StatusSaude,
			&a.FazendaID,
			&a.CreatedAt,
			&a.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		aCopy := a
		list = append(list, &aCopy)
	}
	return list, rows.Err()
}
