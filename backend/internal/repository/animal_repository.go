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
		INSERT INTO animais (identificacao, raca, data_nascimento, sexo, status_saude, fazenda_id, categoria, status_reprodutivo, mae_id, pai_info, lote_id, peso_nascimento, data_entrada, data_saida, motivo_saida)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
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
		animal.Categoria,
		animal.StatusReprodutivo,
		animal.MaeID,
		animal.PaiInfo,
		animal.LoteID,
		animal.PesoNascimento,
		animal.DataEntrada,
		animal.DataSaida,
		animal.MotivoSaida,
	).Scan(&animal.ID, &animal.CreatedAt, &animal.UpdatedAt)

	return err
}

func (r *AnimalRepository) GetByID(ctx context.Context, id int64) (*models.Animal, error) {
	query := `
		SELECT id, identificacao, raca, data_nascimento, sexo, status_saude, fazenda_id, categoria, status_reprodutivo, mae_id, pai_info, lote_id, peso_nascimento, data_entrada, data_saida, motivo_saida, created_at, updated_at
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
		&animal.Categoria,
		&animal.StatusReprodutivo,
		&animal.MaeID,
		&animal.PaiInfo,
		&animal.LoteID,
		&animal.PesoNascimento,
		&animal.DataEntrada,
		&animal.DataSaida,
		&animal.MotivoSaida,
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
		SELECT id, identificacao, raca, data_nascimento, sexo, status_saude, fazenda_id, categoria, status_reprodutivo, mae_id, pai_info, lote_id, peso_nascimento, data_entrada, data_saida, motivo_saida, created_at, updated_at
		FROM animais
		ORDER BY created_at DESC
	`

	return r.queryList(ctx, query)
}

func (r *AnimalRepository) GetByFazendaID(ctx context.Context, fazendaID int64) ([]*models.Animal, error) {
	query := `
		SELECT id, identificacao, raca, data_nascimento, sexo, status_saude, fazenda_id, categoria, status_reprodutivo, mae_id, pai_info, lote_id, peso_nascimento, data_entrada, data_saida, motivo_saida, created_at, updated_at
		FROM animais
		WHERE fazenda_id = $1
		ORDER BY created_at DESC
	`

	return r.queryList(ctx, query, fazendaID)
}

func (r *AnimalRepository) GetByLoteID(ctx context.Context, loteID int64) ([]*models.Animal, error) {
	query := `
		SELECT id, identificacao, raca, data_nascimento, sexo, status_saude, fazenda_id, categoria, status_reprodutivo, mae_id, pai_info, lote_id, peso_nascimento, data_entrada, data_saida, motivo_saida, created_at, updated_at
		FROM animais
		WHERE lote_id = $1
		ORDER BY identificacao ASC
	`
	return r.queryList(ctx, query, loteID)
}

func (r *AnimalRepository) GetByCategoria(ctx context.Context, fazendaID int64, categoria string) ([]*models.Animal, error) {
	query := `
		SELECT id, identificacao, raca, data_nascimento, sexo, status_saude, fazenda_id, categoria, status_reprodutivo, mae_id, pai_info, lote_id, peso_nascimento, data_entrada, data_saida, motivo_saida, created_at, updated_at
		FROM animais
		WHERE fazenda_id = $1 AND categoria = $2
		ORDER BY created_at DESC
	`
	return r.queryList(ctx, query, fazendaID, categoria)
}

func (r *AnimalRepository) GetByStatusReprodutivo(ctx context.Context, fazendaID int64, status string) ([]*models.Animal, error) {
	query := `
		SELECT id, identificacao, raca, data_nascimento, sexo, status_saude, fazenda_id, categoria, status_reprodutivo, mae_id, pai_info, lote_id, peso_nascimento, data_entrada, data_saida, motivo_saida, created_at, updated_at
		FROM animais
		WHERE fazenda_id = $1 AND status_reprodutivo = $2
		ORDER BY created_at DESC
	`
	return r.queryList(ctx, query, fazendaID, status)
}

func (r *AnimalRepository) Update(ctx context.Context, animal *models.Animal) error {
	if animal.ID <= 0 {
		return fmt.Errorf("id do animal inválido: %d", animal.ID)
	}
	query := `
		UPDATE animais
		SET identificacao = $1, raca = $2, data_nascimento = $3, sexo = $4, status_saude = $5, fazenda_id = $6, categoria = $7, status_reprodutivo = $8, mae_id = $9, pai_info = $10, lote_id = $11, peso_nascimento = $12, data_entrada = $13, data_saida = $14, motivo_saida = $15, updated_at = $16
		WHERE id = $17
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
		animal.Categoria,
		animal.StatusReprodutivo,
		animal.MaeID,
		animal.PaiInfo,
		animal.LoteID,
		animal.PesoNascimento,
		animal.DataEntrada,
		animal.DataSaida,
		animal.MotivoSaida,
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
		SELECT id, identificacao, raca, data_nascimento, sexo, status_saude, fazenda_id, categoria, status_reprodutivo, mae_id, pai_info, lote_id, peso_nascimento, data_entrada, data_saida, motivo_saida, created_at, updated_at
		FROM animais
		WHERE identificacao ILIKE '%' || $1 || '%'
		ORDER BY created_at DESC
	`
	return r.queryList(ctx, query, identificacao)
}

func (r *AnimalRepository) GetByStatusSaude(ctx context.Context, statusSaude string) ([]*models.Animal, error) {
	query := `
		SELECT id, identificacao, raca, data_nascimento, sexo, status_saude, fazenda_id, categoria, status_reprodutivo, mae_id, pai_info, lote_id, peso_nascimento, data_entrada, data_saida, motivo_saida, created_at, updated_at
		FROM animais
		WHERE status_saude = $1
		ORDER BY created_at DESC
	`
	return r.queryList(ctx, query, statusSaude)
}

func (r *AnimalRepository) GetBySexo(ctx context.Context, sexo string) ([]*models.Animal, error) {
	query := `
		SELECT id, identificacao, raca, data_nascimento, sexo, status_saude, fazenda_id, categoria, status_reprodutivo, mae_id, pai_info, lote_id, peso_nascimento, data_entrada, data_saida, motivo_saida, created_at, updated_at
		FROM animais
		WHERE sexo = $1
		ORDER BY created_at DESC
	`
	return r.queryList(ctx, query, sexo)
}

func (r *AnimalRepository) UpdateLoteID(ctx context.Context, animalID int64, loteID *int64) error {
	query := `UPDATE animais SET lote_id = $1, updated_at = $2 WHERE id = $3`
	_, err := r.db.Exec(ctx, query, loteID, time.Now(), animalID)
	return err
}

func (r *AnimalRepository) UpdateStatusReprodutivo(ctx context.Context, animalID int64, status *string) error {
	query := `UPDATE animais SET status_reprodutivo = $1, updated_at = $2 WHERE id = $3`
	_, err := r.db.Exec(ctx, query, status, time.Now(), animalID)
	return err
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
			&a.Categoria,
			&a.StatusReprodutivo,
			&a.MaeID,
			&a.PaiInfo,
			&a.LoteID,
			&a.PesoNascimento,
			&a.DataEntrada,
			&a.DataSaida,
			&a.MotivoSaida,
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
