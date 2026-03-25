package repository

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/ceialmilk/api/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type FolgasRepository struct {
	db *pgxpool.Pool
}

func NewFolgasRepository(db *pgxpool.Pool) *FolgasRepository {
	return &FolgasRepository{db: db}
}

func (r *FolgasRepository) UsuarioTemFazenda(ctx context.Context, usuarioID, fazendaID int64) (bool, error) {
	var ok bool
	err := r.db.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM usuarios_fazendas WHERE usuario_id = $1 AND fazenda_id = $2)`,
		usuarioID, fazendaID,
	).Scan(&ok)
	return ok, err
}

func (r *FolgasRepository) GetConfig(ctx context.Context, fazendaID int64) (*models.FolgasEscalaConfig, error) {
	q := `
		SELECT fazenda_id, data_anchor, usuario_slot_0, usuario_slot_1, usuario_slot_2, updated_at
		FROM folgas_escala_config WHERE fazenda_id = $1
	`
	var c models.FolgasEscalaConfig
	err := r.db.QueryRow(ctx, q, fazendaID).Scan(
		&c.FazendaID, &c.DataAnchor, &c.UsuarioSlot0, &c.UsuarioSlot1, &c.UsuarioSlot2, &c.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *FolgasRepository) UpsertConfig(ctx context.Context, c *models.FolgasEscalaConfig) error {
	q := `
		INSERT INTO folgas_escala_config (fazenda_id, data_anchor, usuario_slot_0, usuario_slot_1, usuario_slot_2, updated_at)
		VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
		ON CONFLICT (fazenda_id) DO UPDATE SET
			data_anchor = EXCLUDED.data_anchor,
			usuario_slot_0 = EXCLUDED.usuario_slot_0,
			usuario_slot_1 = EXCLUDED.usuario_slot_1,
			usuario_slot_2 = EXCLUDED.usuario_slot_2,
			updated_at = CURRENT_TIMESTAMP
	`
	_, err := r.db.Exec(ctx, q, c.FazendaID, c.DataAnchor, c.UsuarioSlot0, c.UsuarioSlot1, c.UsuarioSlot2)
	return err
}

func (r *FolgasRepository) DeleteAutoInRange(ctx context.Context, fazendaID int64, inicio, fim time.Time) error {
	_, err := r.db.Exec(ctx,
		`DELETE FROM escala_folgas WHERE fazenda_id = $1 AND origem = 'AUTO' AND data >= $2::date AND data <= $3::date`,
		fazendaID, inicio, fim,
	)
	return err
}

func (r *FolgasRepository) HasManualOnDate(ctx context.Context, fazendaID int64, d time.Time) (bool, error) {
	var ok bool
	err := r.db.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM escala_folgas WHERE fazenda_id = $1 AND data = $2::date AND origem = 'MANUAL')`,
		fazendaID, d,
	).Scan(&ok)
	return ok, err
}

func (r *FolgasRepository) InsertEscala(ctx context.Context, e *models.EscalaFolga) error {
	q := `
		INSERT INTO escala_folgas (fazenda_id, data, usuario_id, origem, justificada, motivo, observacoes, created_by, updated_at)
		VALUES ($1, $2::date, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
		RETURNING id, created_at, updated_at
	`
	return r.db.QueryRow(ctx, q,
		e.FazendaID, e.Data, e.UsuarioID, e.Origem, e.Justificada, e.Motivo, e.Observacoes, e.CreatedBy,
	).Scan(&e.ID, &e.CreatedAt, &e.UpdatedAt)
}

func (r *FolgasRepository) UpsertEscala(ctx context.Context, e *models.EscalaFolga) error {
	q := `
		INSERT INTO escala_folgas (fazenda_id, data, usuario_id, origem, justificada, motivo, observacoes, created_by, updated_at)
		VALUES ($1, $2::date, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
		ON CONFLICT (fazenda_id, data, usuario_id) DO UPDATE SET
			origem = EXCLUDED.origem,
			justificada = escala_folgas.justificada OR EXCLUDED.justificada,
			motivo = COALESCE(EXCLUDED.motivo, escala_folgas.motivo),
			observacoes = COALESCE(EXCLUDED.observacoes, escala_folgas.observacoes),
			created_by = COALESCE(EXCLUDED.created_by, escala_folgas.created_by),
			updated_at = CURRENT_TIMESTAMP
		RETURNING id, created_at, updated_at
	`
	return r.db.QueryRow(ctx, q,
		e.FazendaID, e.Data, e.UsuarioID, e.Origem, e.Justificada, e.Motivo, e.Observacoes, e.CreatedBy,
	).Scan(&e.ID, &e.CreatedAt, &e.UpdatedAt)
}

func (r *FolgasRepository) DeleteAllForDate(ctx context.Context, fazendaID int64, d time.Time) error {
	_, err := r.db.Exec(ctx, `DELETE FROM escala_folgas WHERE fazenda_id = $1 AND data = $2::date`, fazendaID, d)
	return err
}

func (r *FolgasRepository) ListEscalaRange(ctx context.Context, fazendaID int64, inicio, fim time.Time) ([]models.EscalaFolga, error) {
	q := `
		SELECT e.id, e.fazenda_id, e.data, e.usuario_id, e.origem, e.justificada, e.motivo,
		       ex.motivo AS excecao_motivo_dia,
		       e.observacoes, e.created_by, e.created_at, e.updated_at,
		       COALESCE(u.nome, '') AS nome
		FROM escala_folgas e
		LEFT JOIN usuarios u ON u.id = e.usuario_id
		LEFT JOIN folgas_excecoes_dia ex ON ex.fazenda_id = e.fazenda_id AND ex.data = e.data
		WHERE e.fazenda_id = $1 AND e.data >= $2::date AND e.data <= $3::date
		ORDER BY e.data ASC, e.usuario_id ASC
	`
	rows, err := r.db.Query(ctx, q, fazendaID, inicio, fim)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []models.EscalaFolga
	for rows.Next() {
		var e models.EscalaFolga
		var nome string
		if err := rows.Scan(
			&e.ID, &e.FazendaID, &e.Data, &e.UsuarioID, &e.Origem, &e.Justificada, &e.Motivo, &e.ExcecaoMotivoDia,
			&e.Observacoes, &e.CreatedBy, &e.CreatedAt, &e.UpdatedAt,
			&nome,
		); err != nil {
			return nil, err
		}
		e.UsuarioNome = nome
		out = append(out, e)
	}
	return out, rows.Err()
}

func (r *FolgasRepository) CountFolgasOnDate(ctx context.Context, fazendaID int64, d time.Time) (int64, error) {
	var n int64
	err := r.db.QueryRow(ctx,
		`SELECT COUNT(*) FROM escala_folgas WHERE fazenda_id = $1 AND data = $2::date`,
		fazendaID, d,
	).Scan(&n)
	return n, err
}

func (r *FolgasRepository) ListFolgasUsuarioOnDate(ctx context.Context, fazendaID int64, d time.Time) ([]models.EscalaFolga, error) {
	q := `
		SELECT id, fazenda_id, data, usuario_id, origem, justificada, motivo, observacoes, created_by, created_at, updated_at
		FROM escala_folgas WHERE fazenda_id = $1 AND data = $2::date
	`
	rows, err := r.db.Query(ctx, q, fazendaID, d)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []models.EscalaFolga
	for rows.Next() {
		var e models.EscalaFolga
		if err := rows.Scan(
			&e.ID, &e.FazendaID, &e.Data, &e.UsuarioID, &e.Origem, &e.Justificada, &e.Motivo, &e.Observacoes, &e.CreatedBy, &e.CreatedAt, &e.UpdatedAt,
		); err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

func (r *FolgasRepository) GetExcecaoDia(ctx context.Context, fazendaID int64, d time.Time) (*models.FolgaExcecaoDia, error) {
	q := `SELECT id, fazenda_id, data, motivo, created_by, created_at FROM folgas_excecoes_dia WHERE fazenda_id = $1 AND data = $2::date`
	var x models.FolgaExcecaoDia
	err := r.db.QueryRow(ctx, q, fazendaID, d).Scan(&x.ID, &x.FazendaID, &x.Data, &x.Motivo, &x.CreatedBy, &x.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &x, nil
}

func (r *FolgasRepository) UpsertExcecaoDia(ctx context.Context, x *models.FolgaExcecaoDia) error {
	q := `
		INSERT INTO folgas_excecoes_dia (fazenda_id, data, motivo, created_by)
		VALUES ($1, $2::date, $3, $4)
		ON CONFLICT (fazenda_id, data) DO UPDATE SET motivo = EXCLUDED.motivo, created_by = EXCLUDED.created_by
		RETURNING id, created_at
	`
	return r.db.QueryRow(ctx, q, x.FazendaID, x.Data, x.Motivo, x.CreatedBy).Scan(&x.ID, &x.CreatedAt)
}

func (r *FolgasRepository) InsertJustificativa(ctx context.Context, j *models.FolgaJustificativa) error {
	q := `
		INSERT INTO folgas_justificativas (fazenda_id, data, usuario_id, motivo, created_by)
		VALUES ($1, $2::date, $3, $4, $5)
		ON CONFLICT (fazenda_id, data, usuario_id) DO UPDATE SET motivo = EXCLUDED.motivo, created_by = EXCLUDED.created_by
		RETURNING id, created_at
	`
	return r.db.QueryRow(ctx, q, j.FazendaID, j.Data, j.UsuarioID, j.Motivo, j.CreatedBy).Scan(&j.ID, &j.CreatedAt)
}

func (r *FolgasRepository) InsertAlteracao(ctx context.Context, a *models.FolgaAlteracao) error {
	raw, err := json.Marshal(a.Detalhes)
	if err != nil {
		return err
	}
	q := `INSERT INTO folgas_alteracoes (fazenda_id, actor_id, tipo, detalhes) VALUES ($1, $2, $3, $4) RETURNING id, created_at`
	return r.db.QueryRow(ctx, q, a.FazendaID, a.ActorID, a.Tipo, raw).Scan(&a.ID, &a.CreatedAt)
}

func (r *FolgasRepository) ListAlteracoes(ctx context.Context, fazendaID int64, limit int) ([]models.FolgaAlteracao, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	q := `
		SELECT id, fazenda_id, actor_id, tipo, detalhes, created_at
		FROM folgas_alteracoes WHERE fazenda_id = $1
		ORDER BY created_at DESC LIMIT $2
	`
	rows, err := r.db.Query(ctx, q, fazendaID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []models.FolgaAlteracao
	for rows.Next() {
		var a models.FolgaAlteracao
		var raw []byte
		if err := rows.Scan(&a.ID, &a.FazendaID, &a.ActorID, &a.Tipo, &raw, &a.CreatedAt); err != nil {
			return nil, err
		}
		if len(raw) > 0 {
			_ = json.Unmarshal(raw, &a.Detalhes)
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

func (r *FolgasRepository) UpdateEscalaJustificada(ctx context.Context, fazendaID int64, d time.Time, usuarioID int64, justificada bool, motivo *string) error {
	ct, err := r.db.Exec(ctx,
		`UPDATE escala_folgas SET justificada = $4, motivo = COALESCE($5, motivo), updated_at = CURRENT_TIMESTAMP
		 WHERE fazenda_id = $1 AND data = $2::date AND usuario_id = $3`,
		fazendaID, d, usuarioID, justificada, motivo,
	)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

// ErrFolgasConfigNotFound quando não há configuração.
var ErrFolgasConfigNotFound = errors.New("configuração de folgas não encontrada")

func (r *FolgasRepository) GetConfigOrErr(ctx context.Context, fazendaID int64) (*models.FolgasEscalaConfig, error) {
	c, err := r.GetConfig(ctx, fazendaID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrFolgasConfigNotFound
		}
		return nil, err
	}
	return c, nil
}
