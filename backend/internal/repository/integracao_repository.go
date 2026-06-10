package repository

import (
	"context"
	"encoding/json"
	"time"

	"github.com/ceialmilk/api/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type IntegracaoRepository struct {
	db *pgxpool.Pool
}

func NewIntegracaoRepository(db *pgxpool.Pool) *IntegracaoRepository {
	return &IntegracaoRepository{db: db}
}

func (r *IntegracaoRepository) CreateCliente(ctx context.Context, c *models.IntegracaoCliente) error {
	query := `
		INSERT INTO integracao_clientes (nome, actor_user_id, key_prefix, key_hash, ativo, criado_por_admin_id)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at, updated_at
	`
	return r.db.QueryRow(ctx, query, c.Nome, c.ActorUserID, c.KeyPrefix, c.KeyHash, c.Ativo, c.CriadoPorAdminID).
		Scan(&c.ID, &c.CreatedAt, &c.UpdatedAt)
}

func (r *IntegracaoRepository) GetByID(ctx context.Context, id int64) (*models.IntegracaoCliente, error) {
	query := `
		SELECT id, nome, actor_user_id, key_prefix, key_hash, ativo, revogado_em, criado_por_admin_id, created_at, updated_at
		FROM integracao_clientes WHERE id = $1
	`
	var c models.IntegracaoCliente
	err := r.db.QueryRow(ctx, query, id).Scan(
		&c.ID, &c.Nome, &c.ActorUserID, &c.KeyPrefix, &c.KeyHash, &c.Ativo, &c.RevogadoEm,
		&c.CriadoPorAdminID, &c.CreatedAt, &c.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, pgx.ErrNoRows
	}
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *IntegracaoRepository) GetByKeyPrefix(ctx context.Context, prefix string) (*models.IntegracaoCliente, error) {
	query := `
		SELECT id, nome, actor_user_id, key_prefix, key_hash, ativo, revogado_em, criado_por_admin_id, created_at, updated_at
		FROM integracao_clientes WHERE key_prefix = $1
	`
	var c models.IntegracaoCliente
	err := r.db.QueryRow(ctx, query, prefix).Scan(
		&c.ID, &c.Nome, &c.ActorUserID, &c.KeyPrefix, &c.KeyHash, &c.Ativo, &c.RevogadoEm,
		&c.CriadoPorAdminID, &c.CreatedAt, &c.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, pgx.ErrNoRows
	}
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *IntegracaoRepository) List(ctx context.Context, limit, offset int) ([]*models.IntegracaoCliente, error) {
	if limit <= 0 {
		limit = 50
	}
	query := `
		SELECT id, nome, actor_user_id, key_prefix, key_hash, ativo, revogado_em, criado_por_admin_id, created_at, updated_at
		FROM integracao_clientes
		ORDER BY nome ASC
		LIMIT $1 OFFSET $2
	`
	rows, err := r.db.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []*models.IntegracaoCliente
	for rows.Next() {
		var c models.IntegracaoCliente
		if err := rows.Scan(
			&c.ID, &c.Nome, &c.ActorUserID, &c.KeyPrefix, &c.KeyHash, &c.Ativo, &c.RevogadoEm,
			&c.CriadoPorAdminID, &c.CreatedAt, &c.UpdatedAt,
		); err != nil {
			return nil, err
		}
		out = append(out, &c)
	}
	return out, rows.Err()
}

func (r *IntegracaoRepository) Count(ctx context.Context) (int64, error) {
	var n int64
	err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM integracao_clientes`).Scan(&n)
	return n, err
}

func (r *IntegracaoRepository) UpdateCliente(ctx context.Context, c *models.IntegracaoCliente) error {
	query := `
		UPDATE integracao_clientes
		SET nome = $2, ativo = $3, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
		RETURNING updated_at
	`
	return r.db.QueryRow(ctx, query, c.ID, c.Nome, c.Ativo).Scan(&c.UpdatedAt)
}

func (r *IntegracaoRepository) UpdateKey(ctx context.Context, id int64, keyPrefix, keyHash string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE integracao_clientes SET key_prefix = $2, key_hash = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $1
	`, id, keyPrefix, keyHash)
	return err
}

func (r *IntegracaoRepository) Revogar(ctx context.Context, id int64) error {
	_, err := r.db.Exec(ctx, `
		UPDATE integracao_clientes SET ativo = false, revogado_em = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1
	`, id)
	return err
}

func (r *IntegracaoRepository) SetFazendas(ctx context.Context, clienteID int64, fazendaIDs []int64) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	if _, err := tx.Exec(ctx, `DELETE FROM integracao_cliente_fazendas WHERE cliente_id = $1`, clienteID); err != nil {
		return err
	}
	for _, fid := range fazendaIDs {
		if _, err := tx.Exec(ctx, `INSERT INTO integracao_cliente_fazendas (cliente_id, fazenda_id) VALUES ($1, $2)`, clienteID, fid); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

func (r *IntegracaoRepository) SetScopes(ctx context.Context, clienteID int64, scopes []string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	if _, err := tx.Exec(ctx, `DELETE FROM integracao_cliente_scopes WHERE cliente_id = $1`, clienteID); err != nil {
		return err
	}
	for _, s := range scopes {
		if _, err := tx.Exec(ctx, `INSERT INTO integracao_cliente_scopes (cliente_id, scope) VALUES ($1, $2)`, clienteID, s); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

func (r *IntegracaoRepository) GetFazendaIDs(ctx context.Context, clienteID int64) ([]int64, error) {
	rows, err := r.db.Query(ctx, `SELECT fazenda_id FROM integracao_cliente_fazendas WHERE cliente_id = $1 ORDER BY fazenda_id`, clienteID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var ids []int64
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

func (r *IntegracaoRepository) GetScopes(ctx context.Context, clienteID int64) ([]string, error) {
	rows, err := r.db.Query(ctx, `SELECT scope FROM integracao_cliente_scopes WHERE cliente_id = $1 ORDER BY scope`, clienteID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var scopes []string
	for rows.Next() {
		var s string
		if err := rows.Scan(&s); err != nil {
			return nil, err
		}
		scopes = append(scopes, s)
	}
	return scopes, rows.Err()
}

func (r *IntegracaoRepository) LoadClienteRelations(ctx context.Context, c *models.IntegracaoCliente) error {
	fids, err := r.GetFazendaIDs(ctx, c.ID)
	if err != nil {
		return err
	}
	c.FazendaIDs = fids
	scopes, err := r.GetScopes(ctx, c.ID)
	if err != nil {
		return err
	}
	c.Scopes = scopes
	return nil
}

func (r *IntegracaoRepository) InsertChamada(ctx context.Context, ch *models.IntegracaoChamada) error {
	query := `
		INSERT INTO integracao_chamadas (cliente_id, method, path, status_code, correlation_id, idempotency_key, duracao_ms, erro_resumo)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, created_at
	`
	return r.db.QueryRow(ctx, query,
		ch.ClienteID, ch.Method, ch.Path, ch.StatusCode, ch.CorrelationID, ch.IdempotencyKey, ch.DuracaoMs, ch.ErroResumo,
	).Scan(&ch.ID, &ch.CreatedAt)
}

func (r *IntegracaoRepository) ListChamadas(ctx context.Context, clienteID int64, limit, offset int) ([]*models.IntegracaoChamada, error) {
	if limit <= 0 {
		limit = 50
	}
	rows, err := r.db.Query(ctx, `
		SELECT id, cliente_id, method, path, status_code, correlation_id, idempotency_key, duracao_ms, erro_resumo, created_at
		FROM integracao_chamadas WHERE cliente_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3
	`, clienteID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []*models.IntegracaoChamada
	for rows.Next() {
		var ch models.IntegracaoChamada
		if err := rows.Scan(
			&ch.ID, &ch.ClienteID, &ch.Method, &ch.Path, &ch.StatusCode, &ch.CorrelationID,
			&ch.IdempotencyKey, &ch.DuracaoMs, &ch.ErroResumo, &ch.CreatedAt,
		); err != nil {
			return nil, err
		}
		out = append(out, &ch)
	}
	return out, rows.Err()
}

func (r *IntegracaoRepository) GetIdempotencia(ctx context.Context, clienteID int64, key string) (*models.IntegracaoIdempotencia, error) {
	query := `
		SELECT id, cliente_id, idempotency_key, request_hash, response_body, status_code, expires_at, created_at
		FROM integracao_idempotencia
		WHERE cliente_id = $1 AND idempotency_key = $2 AND expires_at > CURRENT_TIMESTAMP
	`
	var row models.IntegracaoIdempotencia
	err := r.db.QueryRow(ctx, query, clienteID, key).Scan(
		&row.ID, &row.ClienteID, &row.IdempotencyKey, &row.RequestHash, &row.ResponseBody,
		&row.StatusCode, &row.ExpiresAt, &row.CreatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, pgx.ErrNoRows
	}
	if err != nil {
		return nil, err
	}
	return &row, nil
}

func (r *IntegracaoRepository) SaveIdempotencia(ctx context.Context, clienteID int64, key, requestHash string, statusCode int, responseBody interface{}, ttl time.Duration) error {
	body, err := json.Marshal(responseBody)
	if err != nil {
		return err
	}
	expires := time.Now().UTC().Add(ttl)
	_, err = r.db.Exec(ctx, `
		INSERT INTO integracao_idempotencia (cliente_id, idempotency_key, request_hash, response_body, status_code, expires_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (cliente_id, idempotency_key) DO UPDATE SET
			request_hash = EXCLUDED.request_hash,
			response_body = EXCLUDED.response_body,
			status_code = EXCLUDED.status_code,
			expires_at = EXCLUDED.expires_at
	`, clienteID, key, requestHash, body, statusCode, expires)
	return err
}

func (r *IntegracaoRepository) DeleteExpiredIdempotencia(ctx context.Context) error {
	_, err := r.db.Exec(ctx, `DELETE FROM integracao_idempotencia WHERE expires_at <= CURRENT_TIMESTAMP`)
	return err
}
