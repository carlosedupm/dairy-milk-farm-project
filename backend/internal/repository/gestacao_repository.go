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

type GestacaoRepository struct {
	db *pgxpool.Pool
}

func NewGestacaoRepository(db *pgxpool.Pool) *GestacaoRepository {
	return &GestacaoRepository{db: db}
}

func (r *GestacaoRepository) Create(ctx context.Context, g *models.Gestacao) error {
	query := `INSERT INTO gestacoes (animal_id, cobertura_id, data_confirmacao, data_prevista_parto, status, observacoes, fazenda_id, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, created_at, updated_at`
	return r.db.QueryRow(ctx, query, g.AnimalID, g.CoberturaID, g.DataConfirmacao, g.DataPrevistaParto, g.Status, g.Observacoes, g.FazendaID, g.CreatedBy).
		Scan(&g.ID, &g.CreatedAt, &g.UpdatedAt)
}

func (r *GestacaoRepository) GetByID(ctx context.Context, id int64) (*models.Gestacao, error) {
	query := `SELECT id, animal_id, cobertura_id, data_confirmacao, data_prevista_parto, status, observacoes, fazenda_id, created_at, updated_at FROM gestacoes WHERE id = $1`
	var g models.Gestacao
	err := r.db.QueryRow(ctx, query, id).Scan(&g.ID, &g.AnimalID, &g.CoberturaID, &g.DataConfirmacao, &g.DataPrevistaParto, &g.Status, &g.Observacoes, &g.FazendaID, &g.CreatedAt, &g.UpdatedAt)
	if err == pgx.ErrNoRows {
		return nil, pgx.ErrNoRows
	}
	return &g, err
}

// GetAtivaConfirmadaByAnimalID retorna a gestação CONFIRMADA mais recente do animal, ou nil se não houver.
func (r *GestacaoRepository) GetAtivaConfirmadaByAnimalID(ctx context.Context, animalID int64) (*models.Gestacao, error) {
	query := `SELECT id, animal_id, cobertura_id, data_confirmacao, data_prevista_parto, status, observacoes, fazenda_id, created_at, updated_at
		FROM gestacoes WHERE animal_id = $1 AND status = $2
		ORDER BY data_confirmacao DESC LIMIT 1`
	var g models.Gestacao
	err := r.db.QueryRow(ctx, query, animalID, models.GestacaoStatusConfirmada).Scan(
		&g.ID, &g.AnimalID, &g.CoberturaID, &g.DataConfirmacao, &g.DataPrevistaParto,
		&g.Status, &g.Observacoes, &g.FazendaID, &g.CreatedAt, &g.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &g, nil
}

func (r *GestacaoRepository) GetByAnimalID(ctx context.Context, animalID int64) ([]*models.Gestacao, error) {
	query := `SELECT id, animal_id, cobertura_id, data_confirmacao, data_prevista_parto, status, observacoes, fazenda_id, created_by, created_at, updated_at
		FROM gestacoes WHERE animal_id = $1 ORDER BY data_confirmacao DESC`
	rows, err := r.db.Query(ctx, query, animalID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []*models.Gestacao
	for rows.Next() {
		var g models.Gestacao
		if err := rows.Scan(&g.ID, &g.AnimalID, &g.CoberturaID, &g.DataConfirmacao, &g.DataPrevistaParto, &g.Status, &g.Observacoes, &g.FazendaID, &g.CreatedBy, &g.CreatedAt, &g.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, &g)
	}
	return list, rows.Err()
}

func (r *GestacaoRepository) GetByFazendaID(ctx context.Context, fazendaID int64) ([]*models.Gestacao, error) {
	query := `SELECT id, animal_id, cobertura_id, data_confirmacao, data_prevista_parto, status, observacoes, fazenda_id, created_at, updated_at
		FROM gestacoes WHERE fazenda_id = $1 ORDER BY data_confirmacao DESC`
	rows, err := r.db.Query(ctx, query, fazendaID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []*models.Gestacao
	for rows.Next() {
		var g models.Gestacao
		if err := rows.Scan(&g.ID, &g.AnimalID, &g.CoberturaID, &g.DataConfirmacao, &g.DataPrevistaParto, &g.Status, &g.Observacoes, &g.FazendaID, &g.CreatedAt, &g.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, &g)
	}
	return list, rows.Err()
}

// ExistsByCoberturaID retorna true se alguma gestação referencia a cobertura.
func (r *GestacaoRepository) ExistsByCoberturaID(ctx context.Context, coberturaID int64) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM gestacoes WHERE cobertura_id = $1)`,
		coberturaID,
	).Scan(&exists)
	return exists, err
}

func (r *GestacaoRepository) Update(ctx context.Context, g *models.Gestacao) error {
	if g.ID <= 0 {
		return fmt.Errorf("id invalido: %d", g.ID)
	}
	query := `UPDATE gestacoes SET data_prevista_parto = $1, status = $2, observacoes = $3, updated_at = $4 WHERE id = $5`
	cmd, err := r.db.Exec(ctx, query, g.DataPrevistaParto, g.Status, g.Observacoes, time.Now(), g.ID)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return errors.New("nenhuma linha atualizada")
	}
	return nil
}

func (r *GestacaoRepository) GetByIDTx(ctx context.Context, tx pgx.Tx, id int64) (*models.Gestacao, error) {
	query := `SELECT id, animal_id, cobertura_id, data_confirmacao, data_prevista_parto, status, observacoes, fazenda_id, created_at, updated_at FROM gestacoes WHERE id = $1`
	var g models.Gestacao
	err := tx.QueryRow(ctx, query, id).Scan(&g.ID, &g.AnimalID, &g.CoberturaID, &g.DataConfirmacao, &g.DataPrevistaParto, &g.Status, &g.Observacoes, &g.FazendaID, &g.CreatedAt, &g.UpdatedAt)
	if err == pgx.ErrNoRows {
		return nil, pgx.ErrNoRows
	}
	return &g, err
}

func (r *GestacaoRepository) CountConfirmadasByFazendaID(ctx context.Context, fazendaID int64) (int, error) {
	var n int
	err := r.db.QueryRow(ctx,
		`SELECT COUNT(*) FROM gestacoes WHERE fazenda_id = $1 AND status = $2`,
		fazendaID, models.GestacaoStatusConfirmada,
	).Scan(&n)
	return n, err
}

func (r *GestacaoRepository) ListPartosPrevistosByFazendaID(ctx context.Context, fazendaID int64, ate time.Time) ([]models.PartoPrevistoResumo, error) {
	const q = `
		SELECT g.animal_id, a.identificacao, g.id, g.data_prevista_parto
		FROM gestacoes g
		INNER JOIN animais a ON a.id = g.animal_id
		WHERE g.fazenda_id = $1 AND g.status = $2
		  AND g.data_prevista_parto IS NOT NULL
		  AND g.data_prevista_parto::date <= $3::date
		ORDER BY g.data_prevista_parto ASC
		LIMIT 50
	`
	rows, err := r.db.Query(ctx, q, fazendaID, models.GestacaoStatusConfirmada, ate)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []models.PartoPrevistoResumo
	for rows.Next() {
		var item models.PartoPrevistoResumo
		if err := rows.Scan(&item.AnimalID, &item.Identificacao, &item.GestacaoID, &item.DataPrevistaParto); err != nil {
			return nil, err
		}
		list = append(list, item)
	}
	return list, rows.Err()
}

func (r *GestacaoRepository) GetAtivaConfirmadaByAnimalIDTx(ctx context.Context, tx pgx.Tx, animalID int64) (*models.Gestacao, error) {
	query := `SELECT id, animal_id, cobertura_id, data_confirmacao, data_prevista_parto, status, observacoes, fazenda_id, created_at, updated_at
		FROM gestacoes WHERE animal_id = $1 AND status = $2
		ORDER BY data_confirmacao DESC LIMIT 1`
	var g models.Gestacao
	err := tx.QueryRow(ctx, query, animalID, models.GestacaoStatusConfirmada).Scan(
		&g.ID, &g.AnimalID, &g.CoberturaID, &g.DataConfirmacao, &g.DataPrevistaParto,
		&g.Status, &g.Observacoes, &g.FazendaID, &g.CreatedAt, &g.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &g, nil
}

// CloseConfirmadaComoPerdaTx altera gestação CONFIRMADA do animal para PERDA.
func (r *GestacaoRepository) CloseConfirmadaComoPerdaTx(ctx context.Context, tx pgx.Tx, animalID int64) error {
	g, err := r.GetAtivaConfirmadaByAnimalIDTx(ctx, tx, animalID)
	if err != nil {
		return err
	}
	if g == nil {
		return nil
	}
	g.Status = models.GestacaoStatusPerda
	return r.UpdateTx(ctx, tx, g)
}

func (r *GestacaoRepository) UpdateTx(ctx context.Context, tx pgx.Tx, g *models.Gestacao) error {
	if g.ID <= 0 {
		return fmt.Errorf("id invalido: %d", g.ID)
	}
	query := `UPDATE gestacoes SET data_prevista_parto = $1, status = $2, observacoes = $3, updated_at = $4 WHERE id = $5`
	cmd, err := tx.Exec(ctx, query, g.DataPrevistaParto, g.Status, g.Observacoes, time.Now(), g.ID)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return errors.New("nenhuma linha atualizada")
	}
	return nil
}
