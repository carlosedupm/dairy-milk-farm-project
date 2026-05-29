package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/ceialmilk/api/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AlertaListFilters struct {
	Status     string
	Tipo       string
	Severidade string
	Limit      int
	Offset     int
}

type AlertaRepository struct {
	db *pgxpool.Pool
}

func NewAlertaRepository(db *pgxpool.Pool) *AlertaRepository {
	return &AlertaRepository{db: db}
}

const alertaSelectWithNames = `
	SELECT
		a.id, a.fazenda_id, a.animal_id, a.tipo, a.severidade, a.titulo, a.descricao,
		a.data_prevista, a.status, a.resolvido_por, a.resolvido_em, a.created_by,
		a.created_at, a.updated_at,
		an.identificacao AS animal_identificacao,
		uc.nome AS created_by_nome,
		ur.nome AS resolvido_por_nome
	FROM alertas a
	LEFT JOIN animais an ON an.id = a.animal_id
	LEFT JOIN usuarios uc ON uc.id = a.created_by
	LEFT JOIN usuarios ur ON ur.id = a.resolvido_por
`

func (r *AlertaRepository) scanAlertaWithNames(row pgx.Row) (*models.AlertaWithNames, error) {
	var m models.AlertaWithNames
	err := row.Scan(
		&m.ID,
		&m.FazendaID,
		&m.AnimalID,
		&m.Tipo,
		&m.Severidade,
		&m.Titulo,
		&m.Descricao,
		&m.DataPrevista,
		&m.Status,
		&m.ResolvidoPor,
		&m.ResolvidoEm,
		&m.CreatedBy,
		&m.CreatedAt,
		&m.UpdatedAt,
		&m.AnimalIdentificacao,
		&m.CreatedByNome,
		&m.ResolvidoPorNome,
	)
	if err != nil {
		return nil, err
	}
	return &m, nil
}

func buildAlertaListWhere(fazendaID int64, f AlertaListFilters) (string, []interface{}) {
	var conds []string
	args := []interface{}{fazendaID}
	idx := 2

	conds = append(conds, "a.fazenda_id = $1")

	if f.Status != "" {
		conds = append(conds, fmt.Sprintf("a.status = $%d", idx))
		args = append(args, f.Status)
		idx++
	}
	if f.Tipo != "" {
		conds = append(conds, fmt.Sprintf("a.tipo = $%d", idx))
		args = append(args, f.Tipo)
		idx++
	}
	if f.Severidade != "" {
		conds = append(conds, fmt.Sprintf("a.severidade = $%d", idx))
		args = append(args, f.Severidade)
		idx++
	}

	return strings.Join(conds, " AND "), args
}

const alertaOrderBy = `
	ORDER BY
		CASE a.status WHEN 'ABERTO' THEN 0 WHEN 'EM_ANDAMENTO' THEN 1 ELSE 2 END,
		CASE a.severidade WHEN 'CRITICA' THEN 0 WHEN 'ALTA' THEN 1 WHEN 'MEDIA' THEN 2 ELSE 3 END,
		a.created_at DESC
`

func (r *AlertaRepository) ListByFazenda(ctx context.Context, fazendaID int64, f AlertaListFilters) ([]models.AlertaWithNames, int64, error) {
	where, args := buildAlertaListWhere(fazendaID, f)

	countQ := fmt.Sprintf(`SELECT COUNT(*) FROM alertas a WHERE %s`, where)
	var total int64
	if err := r.db.QueryRow(ctx, countQ, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	limit := f.Limit
	if limit <= 0 {
		limit = 25
	}
	offset := f.Offset
	if offset < 0 {
		offset = 0
	}

	listArgs := append(append([]interface{}{}, args...), limit, offset)
	listQ := fmt.Sprintf(`%s WHERE %s %s LIMIT $%d OFFSET $%d`,
		alertaSelectWithNames, where, alertaOrderBy, len(args)+1, len(args)+2)

	rows, err := r.db.Query(ctx, listQ, listArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var out []models.AlertaWithNames
	for rows.Next() {
		var m models.AlertaWithNames
		if err := rows.Scan(
			&m.ID,
			&m.FazendaID,
			&m.AnimalID,
			&m.Tipo,
			&m.Severidade,
			&m.Titulo,
			&m.Descricao,
			&m.DataPrevista,
			&m.Status,
			&m.ResolvidoPor,
			&m.ResolvidoEm,
			&m.CreatedBy,
			&m.CreatedAt,
			&m.UpdatedAt,
			&m.AnimalIdentificacao,
			&m.CreatedByNome,
			&m.ResolvidoPorNome,
		); err != nil {
			return nil, 0, err
		}
		out = append(out, m)
	}
	if out == nil {
		out = []models.AlertaWithNames{}
	}
	return out, total, rows.Err()
}

func (r *AlertaRepository) GetByID(ctx context.Context, fazendaID, alertaID int64) (*models.AlertaWithNames, error) {
	q := alertaSelectWithNames + ` WHERE a.id = $1 AND a.fazenda_id = $2`
	m, err := r.scanAlertaWithNames(r.db.QueryRow(ctx, q, alertaID, fazendaID))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return m, nil
}

func (r *AlertaRepository) Create(ctx context.Context, row *models.Alerta) error {
	const q = `
		INSERT INTO alertas (
			fazenda_id, animal_id, tipo, severidade, titulo, descricao,
			data_prevista, status, created_by
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, created_at, updated_at
	`
	return r.db.QueryRow(ctx, q,
		row.FazendaID,
		row.AnimalID,
		row.Tipo,
		row.Severidade,
		row.Titulo,
		row.Descricao,
		row.DataPrevista,
		row.Status,
		row.CreatedBy,
	).Scan(&row.ID, &row.CreatedAt, &row.UpdatedAt)
}

func (r *AlertaRepository) UpdateStatus(ctx context.Context, fazendaID, alertaID int64, status string, resolvidoPor *int64, resolvidoEm *time.Time) error {
	const q = `
		UPDATE alertas
		SET status = $3,
		    resolvido_por = $4,
		    resolvido_em = $5,
		    updated_at = NOW()
		WHERE id = $1 AND fazenda_id = $2
	`
	tag, err := r.db.Exec(ctx, q, alertaID, fazendaID, status, resolvidoPor, resolvidoEm)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

func (r *AlertaRepository) Delete(ctx context.Context, fazendaID, alertaID int64) error {
	const q = `DELETE FROM alertas WHERE id = $1 AND fazenda_id = $2`
	tag, err := r.db.Exec(ctx, q, alertaID, fazendaID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

func (r *AlertaRepository) ExistsOpenByFazendaTipoAnimal(ctx context.Context, fazendaID int64, tipo string, animalID int64) (bool, error) {
	const q = `
		SELECT EXISTS(
			SELECT 1 FROM alertas
			WHERE fazenda_id = $1 AND tipo = $2 AND animal_id = $3
			  AND status IN ('ABERTO', 'EM_ANDAMENTO')
		)
	`
	var exists bool
	err := r.db.QueryRow(ctx, q, fazendaID, tipo, animalID).Scan(&exists)
	return exists, err
}

func (r *AlertaRepository) ResolveOpenByFazendaTipoAnimal(ctx context.Context, fazendaID int64, tipo string, animalID int64) error {
	const q = `
		UPDATE alertas
		SET status = 'RESOLVIDO',
		    resolvido_por = NULL,
		    resolvido_em = NOW(),
		    updated_at = NOW()
		WHERE fazenda_id = $1 AND tipo = $2 AND animal_id = $3
		  AND status IN ('ABERTO', 'EM_ANDAMENTO')
	`
	_, err := r.db.Exec(ctx, q, fazendaID, tipo, animalID)
	return err
}
