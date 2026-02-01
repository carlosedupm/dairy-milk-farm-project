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

type FazendaRepository struct {
	db *pgxpool.Pool
}

func NewFazendaRepository(db *pgxpool.Pool) *FazendaRepository {
	return &FazendaRepository{db: db}
}

func (r *FazendaRepository) Create(ctx context.Context, fazenda *models.Fazenda) error {
	query := `
		INSERT INTO fazendas (nome, localizacao, quantidade_vacas, fundacao)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at, updated_at
	`

	err := r.db.QueryRow(
		ctx,
		query,
		fazenda.Nome,
		fazenda.Localizacao,
		fazenda.QuantidadeVacas,
		fazenda.Fundacao,
	).Scan(&fazenda.ID, &fazenda.CreatedAt, &fazenda.UpdatedAt)

	return err
}

func (r *FazendaRepository) GetByID(ctx context.Context, id int64) (*models.Fazenda, error) {
	query := `
		SELECT id, nome, localizacao, quantidade_vacas, fundacao, created_at, updated_at
		FROM fazendas
		WHERE id = $1
	`

	var fazenda models.Fazenda
	err := r.db.QueryRow(ctx, query, id).Scan(
		&fazenda.ID,
		&fazenda.Nome,
		&fazenda.Localizacao,
		&fazenda.QuantidadeVacas,
		&fazenda.Fundacao,
		&fazenda.CreatedAt,
		&fazenda.UpdatedAt,
	)

	if err == pgx.ErrNoRows {
		return nil, pgx.ErrNoRows
	}

	return &fazenda, err
}

func (r *FazendaRepository) GetAll(ctx context.Context) ([]*models.Fazenda, error) {
	query := `
		SELECT id, nome, localizacao, quantidade_vacas, fundacao, created_at, updated_at
		FROM fazendas
		ORDER BY created_at DESC
	`

	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var fazendas []*models.Fazenda
	for rows.Next() {
		var fazenda models.Fazenda
		err := rows.Scan(
			&fazenda.ID,
			&fazenda.Nome,
			&fazenda.Localizacao,
			&fazenda.QuantidadeVacas,
			&fazenda.Fundacao,
			&fazenda.CreatedAt,
			&fazenda.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		fazendas = append(fazendas, &fazenda)
	}

	return fazendas, rows.Err()
}

func (r *FazendaRepository) Update(ctx context.Context, fazenda *models.Fazenda) error {
	if fazenda.ID <= 0 {
		return fmt.Errorf("id da fazenda inválido: %d", fazenda.ID)
	}
	query := `
		UPDATE fazendas
		SET nome = $1, localizacao = $2, quantidade_vacas = $3, fundacao = $4, updated_at = $5
		WHERE id = $6
	`

	cmd, err := r.db.Exec(
		ctx,
		query,
		fazenda.Nome,
		fazenda.Localizacao,
		fazenda.QuantidadeVacas,
		fazenda.Fundacao,
		time.Now(),
		fazenda.ID,
	)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return errors.New("nenhuma linha atualizada (id não encontrado ou sem alteração)")
	}
	return nil
}

func (r *FazendaRepository) Delete(ctx context.Context, id int64) error {
	query := `DELETE FROM fazendas WHERE id = $1`
	_, err := r.db.Exec(ctx, query, id)
	return err
}

func (r *FazendaRepository) SearchByNome(ctx context.Context, nome string) ([]*models.Fazenda, error) {
	return r.search(ctx, `nome ILIKE '%' || $1 || '%'`, nome)
}

func (r *FazendaRepository) SearchByLocalizacao(ctx context.Context, loc string) ([]*models.Fazenda, error) {
	return r.search(ctx, `localizacao ILIKE '%' || $1 || '%'`, loc)
}

func (r *FazendaRepository) SearchByVacasMin(ctx context.Context, qty int) ([]*models.Fazenda, error) {
	query := `
		SELECT id, nome, localizacao, quantidade_vacas, fundacao, created_at, updated_at
		FROM fazendas
		WHERE quantidade_vacas >= $1
		ORDER BY quantidade_vacas ASC, created_at DESC
	`
	return r.queryList(ctx, query, qty)
}

func (r *FazendaRepository) SearchByVacasRange(ctx context.Context, min, max int) ([]*models.Fazenda, error) {
	query := `
		SELECT id, nome, localizacao, quantidade_vacas, fundacao, created_at, updated_at
		FROM fazendas
		WHERE quantidade_vacas BETWEEN $1 AND $2
		ORDER BY quantidade_vacas ASC, created_at DESC
	`
	return r.queryList(ctx, query, min, max)
}

func (r *FazendaRepository) Count(ctx context.Context) (int64, error) {
	var n int64
	err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM fazendas`).Scan(&n)
	return n, err
}

func (r *FazendaRepository) ExistsByNome(ctx context.Context, nome string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM fazendas WHERE nome = $1)`, nome).Scan(&exists)
	return exists, err
}

// ExistsByNomeAndLocalizacao retorna true se já existir fazenda com o mesmo nome e localização.
// localizacao nil e string vazia são tratados como mesma "localização ausente".
// Comparação case-insensitive (ignora maiúsculas/minúsculas).
func (r *FazendaRepository) ExistsByNomeAndLocalizacao(ctx context.Context, nome string, localizacao *string) (bool, error) {
	var exists bool
	var err error
	if localizacao == nil || *localizacao == "" {
		err = r.db.QueryRow(ctx,
			`SELECT EXISTS(SELECT 1 FROM fazendas WHERE LOWER(nome) = LOWER($1) AND (localizacao IS NULL OR localizacao = ''))`,
			nome,
		).Scan(&exists)
	} else {
		err = r.db.QueryRow(ctx,
			`SELECT EXISTS(SELECT 1 FROM fazendas WHERE LOWER(nome) = LOWER($1) AND LOWER(localizacao) = LOWER($2))`,
			nome, *localizacao,
		).Scan(&exists)
	}
	return exists, err
}

// ExistsByNomeAndLocalizacaoExcluding igual a ExistsByNomeAndLocalizacao mas ignora a fazenda com id = excludeID (para Update).
// Comparação case-insensitive (ignora maiúsculas/minúsculas).
func (r *FazendaRepository) ExistsByNomeAndLocalizacaoExcluding(ctx context.Context, nome string, localizacao *string, excludeID int64) (bool, error) {
	var exists bool
	var err error
	if localizacao == nil || *localizacao == "" {
		err = r.db.QueryRow(ctx,
			`SELECT EXISTS(SELECT 1 FROM fazendas WHERE LOWER(nome) = LOWER($1) AND (localizacao IS NULL OR localizacao = '') AND id != $2)`,
			nome, excludeID,
		).Scan(&exists)
	} else {
		err = r.db.QueryRow(ctx,
			`SELECT EXISTS(SELECT 1 FROM fazendas WHERE LOWER(nome) = LOWER($1) AND LOWER(localizacao) = LOWER($2) AND id != $3)`,
			nome, *localizacao, excludeID,
		).Scan(&exists)
	}
	return exists, err
}

func (r *FazendaRepository) search(ctx context.Context, where string, arg interface{}) ([]*models.Fazenda, error) {
	query := `
		SELECT id, nome, localizacao, quantidade_vacas, fundacao, created_at, updated_at
		FROM fazendas
		WHERE ` + where + `
		ORDER BY created_at DESC
	`
	return r.queryList(ctx, query, arg)
}

func (r *FazendaRepository) queryList(ctx context.Context, query string, args ...interface{}) ([]*models.Fazenda, error) {
	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*models.Fazenda
	for rows.Next() {
		var f models.Fazenda
		err := rows.Scan(
			&f.ID,
			&f.Nome,
			&f.Localizacao,
			&f.QuantidadeVacas,
			&f.Fundacao,
			&f.CreatedAt,
			&f.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		fCopy := f
		list = append(list, &fCopy)
	}
	return list, rows.Err()
}
