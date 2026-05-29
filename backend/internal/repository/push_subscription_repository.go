package repository

import (
	"context"

	"github.com/ceialmilk/api/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PushSubscriptionRepository struct {
	db *pgxpool.Pool
}

func NewPushSubscriptionRepository(db *pgxpool.Pool) *PushSubscriptionRepository {
	return &PushSubscriptionRepository{db: db}
}

func (r *PushSubscriptionRepository) Upsert(ctx context.Context, sub *models.PushSubscription) error {
	const q = `
		INSERT INTO push_subscriptions (usuario_id, endpoint, p256dh, auth, user_agent)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (endpoint) DO UPDATE SET
			usuario_id = EXCLUDED.usuario_id,
			p256dh = EXCLUDED.p256dh,
			auth = EXCLUDED.auth,
			user_agent = EXCLUDED.user_agent
		RETURNING id, created_at
	`
	return r.db.QueryRow(ctx, q,
		sub.UsuarioID,
		sub.Endpoint,
		sub.P256dh,
		sub.Auth,
		sub.UserAgent,
	).Scan(&sub.ID, &sub.CreatedAt)
}

func (r *PushSubscriptionRepository) ListByUsuarioID(ctx context.Context, usuarioID int64) ([]models.PushSubscription, error) {
	const q = `
		SELECT id, usuario_id, endpoint, p256dh, auth, user_agent, created_at
		FROM push_subscriptions
		WHERE usuario_id = $1
		ORDER BY created_at ASC
	`
	rows, err := r.db.Query(ctx, q, usuarioID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []models.PushSubscription
	for rows.Next() {
		var s models.PushSubscription
		if err := rows.Scan(
			&s.ID, &s.UsuarioID, &s.Endpoint, &s.P256dh, &s.Auth, &s.UserAgent, &s.CreatedAt,
		); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	if out == nil {
		out = []models.PushSubscription{}
	}
	return out, rows.Err()
}

func (r *PushSubscriptionRepository) DeleteByEndpoint(ctx context.Context, usuarioID int64, endpoint string) error {
	tag, err := r.db.Exec(ctx,
		`DELETE FROM push_subscriptions WHERE usuario_id = $1 AND endpoint = $2`,
		usuarioID, endpoint,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

func (r *PushSubscriptionRepository) DeleteByEndpointOnly(ctx context.Context, endpoint string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM push_subscriptions WHERE endpoint = $1`, endpoint)
	return err
}
