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
