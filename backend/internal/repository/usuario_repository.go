package repository

import (
	"context"

	"github.com/ceialmilk/api/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type UsuarioRepository struct {
	db *pgxpool.Pool
}

func NewUsuarioRepository(db *pgxpool.Pool) *UsuarioRepository {
	return &UsuarioRepository{db: db}
}

func (r *UsuarioRepository) GetByEmail(ctx context.Context, email string) (*models.Usuario, error) {
	query := `
		SELECT id, nome, email, senha, perfil, enabled, created_at, updated_at
		FROM usuarios
		WHERE email = $1
	`

	var u models.Usuario
	err := r.db.QueryRow(ctx, query, email).Scan(
		&u.ID,
		&u.Nome,
		&u.Email,
		&u.Senha,
		&u.Perfil,
		&u.Enabled,
		&u.CreatedAt,
		&u.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, pgx.ErrNoRows
	}
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *UsuarioRepository) GetByID(ctx context.Context, id int64) (*models.Usuario, error) {
	query := `
		SELECT id, nome, email, senha, perfil, enabled, created_at, updated_at
		FROM usuarios
		WHERE id = $1
	`

	var u models.Usuario
	err := r.db.QueryRow(ctx, query, id).Scan(
		&u.ID,
		&u.Nome,
		&u.Email,
		&u.Senha,
		&u.Perfil,
		&u.Enabled,
		&u.CreatedAt,
		&u.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, pgx.ErrNoRows
	}
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *UsuarioRepository) List(ctx context.Context, limit, offset int) ([]*models.Usuario, error) {
	query := `
		SELECT id, nome, email, senha, perfil, enabled, created_at, updated_at
		FROM usuarios
		ORDER BY nome ASC
		LIMIT $1 OFFSET $2
	`

	rows, err := r.db.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []*models.Usuario
	for rows.Next() {
		var u models.Usuario
		if err := rows.Scan(
			&u.ID,
			&u.Nome,
			&u.Email,
			&u.Senha,
			&u.Perfil,
			&u.Enabled,
			&u.CreatedAt,
			&u.UpdatedAt,
		); err != nil {
			return nil, err
		}
		u.Senha = "" // Não expor hash na listagem
		users = append(users, &u)
	}
	return users, rows.Err()
}

func (r *UsuarioRepository) Count(ctx context.Context) (int64, error) {
	query := `SELECT COUNT(*) FROM usuarios`
	var n int64
	err := r.db.QueryRow(ctx, query).Scan(&n)
	return n, err
}

func (r *UsuarioRepository) CountByPerfil(ctx context.Context, perfil string) (int64, error) {
	query := `SELECT COUNT(*) FROM usuarios WHERE perfil = $1`
	var n int64
	err := r.db.QueryRow(ctx, query, perfil).Scan(&n)
	return n, err
}

func (r *UsuarioRepository) ExistsByEmail(ctx context.Context, email string, excludeID int64) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM usuarios WHERE email = $1 AND id != $2)`
	var exists bool
	err := r.db.QueryRow(ctx, query, email, excludeID).Scan(&exists)
	return exists, err
}

func (r *UsuarioRepository) Create(ctx context.Context, u *models.Usuario) error {
	query := `
		INSERT INTO usuarios (nome, email, senha, perfil, enabled)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at, updated_at
	`
	return r.db.QueryRow(ctx, query, u.Nome, u.Email, u.Senha, u.Perfil, u.Enabled).
		Scan(&u.ID, &u.CreatedAt, &u.UpdatedAt)
}

func (r *UsuarioRepository) Update(ctx context.Context, u *models.Usuario) error {
	query := `
		UPDATE usuarios
		SET nome = $2, email = $3, perfil = $4, enabled = $5, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
		RETURNING updated_at
	`
	return r.db.QueryRow(ctx, query, u.ID, u.Nome, u.Email, u.Perfil, u.Enabled).
		Scan(&u.UpdatedAt)
}

func (r *UsuarioRepository) UpdateWithPassword(ctx context.Context, u *models.Usuario) error {
	query := `
		UPDATE usuarios
		SET nome = $2, email = $3, senha = $4, perfil = $5, enabled = $6, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
		RETURNING updated_at
	`
	return r.db.QueryRow(ctx, query, u.ID, u.Nome, u.Email, u.Senha, u.Perfil, u.Enabled).
		Scan(&u.UpdatedAt)
}

func (r *UsuarioRepository) ToggleEnabled(ctx context.Context, id int64, enabled bool) error {
	query := `UPDATE usuarios SET enabled = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1`
	_, err := r.db.Exec(ctx, query, id, enabled)
	return err
}
