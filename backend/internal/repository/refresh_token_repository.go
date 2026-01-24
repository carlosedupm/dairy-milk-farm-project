package repository

import (
	"context"
	"time"

	"github.com/ceialmilk/api/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type RefreshTokenRepository struct {
	db *pgxpool.Pool
}

func NewRefreshTokenRepository(db *pgxpool.Pool) *RefreshTokenRepository {
	return &RefreshTokenRepository{db: db}
}

func (r *RefreshTokenRepository) Create(ctx context.Context, token *models.RefreshToken) error {
	query := `
		INSERT INTO refresh_tokens (token, user_id, expires_at)
		VALUES ($1, $2, $3)
		RETURNING id, created_at
	`

	err := r.db.QueryRow(
		ctx,
		query,
		token.Token,
		token.UserID,
		token.ExpiresAt,
	).Scan(&token.ID, &token.CreatedAt)

	return err
}

func (r *RefreshTokenRepository) GetByToken(ctx context.Context, token string) (*models.RefreshToken, error) {
	query := `
		SELECT id, token, user_id, expires_at, created_at, revoked
		FROM refresh_tokens
		WHERE token = $1 AND revoked = FALSE
	`

	var rt models.RefreshToken
	err := r.db.QueryRow(ctx, query, token).Scan(
		&rt.ID,
		&rt.Token,
		&rt.UserID,
		&rt.ExpiresAt,
		&rt.CreatedAt,
		&rt.Revoked,
	)

	if err == pgx.ErrNoRows {
		return nil, pgx.ErrNoRows
	}

	return &rt, err
}

func (r *RefreshTokenRepository) Revoke(ctx context.Context, token string) error {
	query := `
		UPDATE refresh_tokens
		SET revoked = TRUE
		WHERE token = $1
	`

	_, err := r.db.Exec(ctx, query, token)
	return err
}

func (r *RefreshTokenRepository) RevokeAllForUser(ctx context.Context, userID int64) error {
	query := `
		UPDATE refresh_tokens
		SET revoked = TRUE
		WHERE user_id = $1 AND revoked = FALSE
	`

	_, err := r.db.Exec(ctx, query, userID)
	return err
}

func (r *RefreshTokenRepository) DeleteExpired(ctx context.Context) error {
	query := `
		DELETE FROM refresh_tokens
		WHERE expires_at < $1
	`

	_, err := r.db.Exec(ctx, query, time.Now())
	return err
}
