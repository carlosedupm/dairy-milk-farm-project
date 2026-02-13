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

type LactacaoRepository struct {
	db *pgxpool.Pool
}

func NewLactacaoRepository(db *pgxpool.Pool) *LactacaoRepository {
	return &LactacaoRepository{db: db}
}

func (r *LactacaoRepository) Create(ctx context.Context, l *models.Lactacao) error {
	query := `INSERT INTO lactacoes (animal_id, numero_lactacao, parto_id, data_inicio, data_fim, dias_lactacao, producao_total, media_diaria, status, fazenda_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id, created_at, updated_at`
	return r.db.QueryRow(ctx, query, l.AnimalID, l.NumeroLactacao, l.PartoID, l.DataInicio, l.DataFim, l.DiasLactacao, l.ProducaoTotal, l.MediaDiaria, l.Status, l.FazendaID).
		Scan(&l.ID, &l.CreatedAt, &l.UpdatedAt)
}

func (r *LactacaoRepository) GetByID(ctx context.Context, id int64) (*models.Lactacao, error) {
	query := `SELECT id, animal_id, numero_lactacao, parto_id, data_inicio, data_fim, dias_lactacao, producao_total, media_diaria, status, fazenda_id, created_at, updated_at FROM lactacoes WHERE id = $1`
	var l models.Lactacao
	err := r.db.QueryRow(ctx, query, id).Scan(&l.ID, &l.AnimalID, &l.NumeroLactacao, &l.PartoID, &l.DataInicio, &l.DataFim, &l.DiasLactacao, &l.ProducaoTotal, &l.MediaDiaria, &l.Status, &l.FazendaID, &l.CreatedAt, &l.UpdatedAt)
	if err == pgx.ErrNoRows {
		return nil, pgx.ErrNoRows
	}
	return &l, err
}

func (r *LactacaoRepository) GetByAnimalID(ctx context.Context, animalID int64) ([]*models.Lactacao, error) {
	query := `SELECT id, animal_id, numero_lactacao, parto_id, data_inicio, data_fim, dias_lactacao, producao_total, media_diaria, status, fazenda_id, created_at, updated_at
		FROM lactacoes WHERE animal_id = $1 ORDER BY numero_lactacao DESC`
	rows, err := r.db.Query(ctx, query, animalID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []*models.Lactacao
	for rows.Next() {
		var l models.Lactacao
		if err := rows.Scan(&l.ID, &l.AnimalID, &l.NumeroLactacao, &l.PartoID, &l.DataInicio, &l.DataFim, &l.DiasLactacao, &l.ProducaoTotal, &l.MediaDiaria, &l.Status, &l.FazendaID, &l.CreatedAt, &l.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, &l)
	}
	return list, rows.Err()
}

func (r *LactacaoRepository) GetByFazendaID(ctx context.Context, fazendaID int64) ([]*models.Lactacao, error) {
	query := `SELECT id, animal_id, numero_lactacao, parto_id, data_inicio, data_fim, dias_lactacao, producao_total, media_diaria, status, fazenda_id, created_at, updated_at
		FROM lactacoes WHERE fazenda_id = $1 ORDER BY data_inicio DESC`
	rows, err := r.db.Query(ctx, query, fazendaID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []*models.Lactacao
	for rows.Next() {
		var l models.Lactacao
		if err := rows.Scan(&l.ID, &l.AnimalID, &l.NumeroLactacao, &l.PartoID, &l.DataInicio, &l.DataFim, &l.DiasLactacao, &l.ProducaoTotal, &l.MediaDiaria, &l.Status, &l.FazendaID, &l.CreatedAt, &l.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, &l)
	}
	return list, rows.Err()
}

func (r *LactacaoRepository) Update(ctx context.Context, l *models.Lactacao) error {
	if l.ID <= 0 {
		return fmt.Errorf("id invalido: %d", l.ID)
	}
	query := `UPDATE lactacoes SET data_fim = $1, dias_lactacao = $2, producao_total = $3, media_diaria = $4, status = $5, updated_at = $6 WHERE id = $7`
	cmd, err := r.db.Exec(ctx, query, l.DataFim, l.DiasLactacao, l.ProducaoTotal, l.MediaDiaria, l.Status, time.Now(), l.ID)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return errors.New("nenhuma linha atualizada")
	}
	return nil
}

func (r *LactacaoRepository) GetEmAndamentoByAnimalID(ctx context.Context, animalID int64) (*models.Lactacao, error) {
	query := `SELECT id, animal_id, numero_lactacao, parto_id, data_inicio, data_fim, dias_lactacao, producao_total, media_diaria, status, fazenda_id, created_at, updated_at
		FROM lactacoes WHERE animal_id = $1 AND (status IS NULL OR status = 'EM_ANDAMENTO') ORDER BY data_inicio DESC LIMIT 1`
	var l models.Lactacao
	err := r.db.QueryRow(ctx, query, animalID).Scan(&l.ID, &l.AnimalID, &l.NumeroLactacao, &l.PartoID, &l.DataInicio, &l.DataFim, &l.DiasLactacao, &l.ProducaoTotal, &l.MediaDiaria, &l.Status, &l.FazendaID, &l.CreatedAt, &l.UpdatedAt)
	if err == pgx.ErrNoRows {
		return nil, pgx.ErrNoRows
	}
	return &l, err
}

func (r *LactacaoRepository) CountByAnimalID(ctx context.Context, animalID int64) (int, error) {
	var n int
	err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM lactacoes WHERE animal_id = $1`, animalID).Scan(&n)
	return n, err
}
