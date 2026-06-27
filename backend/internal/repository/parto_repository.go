package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/ceialmilk/api/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrPartoDeleteNoRows indica DELETE sem linhas afetadas (ex.: concorrência/race).
var ErrPartoDeleteNoRows = errors.New("parto delete: nenhuma linha")

type PartoRepository struct {
	db *pgxpool.Pool
}

func NewPartoRepository(db *pgxpool.Pool) *PartoRepository {
	return &PartoRepository{db: db}
}

func (r *PartoRepository) Create(ctx context.Context, p *models.Parto) error {
	query := `INSERT INTO partos (animal_id, gestacao_id, data, tipo, numero_crias, complicacoes, observacoes, fazenda_id, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, created_at`
	return r.db.QueryRow(ctx, query, p.AnimalID, p.GestacaoID, p.Data, p.Tipo, p.NumeroCrias, p.Complicacoes, p.Observacoes, p.FazendaID, p.CreatedBy).
		Scan(&p.ID, &p.CreatedAt)
}

func (r *PartoRepository) CreateTx(ctx context.Context, tx pgx.Tx, p *models.Parto) error {
	query := `INSERT INTO partos (animal_id, gestacao_id, data, tipo, numero_crias, complicacoes, observacoes, fazenda_id, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, created_at`
	return tx.QueryRow(ctx, query, p.AnimalID, p.GestacaoID, p.Data, p.Tipo, p.NumeroCrias, p.Complicacoes, p.Observacoes, p.FazendaID, p.CreatedBy).
		Scan(&p.ID, &p.CreatedAt)
}

func (r *PartoRepository) GetByIDForUpdateTx(ctx context.Context, tx pgx.Tx, id int64) (*models.Parto, error) {
	query := `SELECT id, animal_id, gestacao_id, data, tipo, numero_crias, complicacoes, observacoes, fazenda_id, created_at FROM partos WHERE id = $1 FOR UPDATE`
	var p models.Parto
	err := tx.QueryRow(ctx, query, id).Scan(&p.ID, &p.AnimalID, &p.GestacaoID, &p.Data, &p.Tipo, &p.NumeroCrias, &p.Complicacoes, &p.Observacoes, &p.FazendaID, &p.CreatedAt)
	if err == pgx.ErrNoRows {
		return nil, pgx.ErrNoRows
	}
	return &p, err
}

func (r *PartoRepository) GetByAnimalIDTx(ctx context.Context, tx pgx.Tx, animalID int64) ([]*models.Parto, error) {
	query := `SELECT id, animal_id, gestacao_id, data, tipo, numero_crias, complicacoes, observacoes, fazenda_id, created_at
		FROM partos WHERE animal_id = $1 ORDER BY data DESC`
	rows, err := tx.Query(ctx, query, animalID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []*models.Parto
	for rows.Next() {
		var p models.Parto
		if err := rows.Scan(&p.ID, &p.AnimalID, &p.GestacaoID, &p.Data, &p.Tipo, &p.NumeroCrias, &p.Complicacoes, &p.Observacoes, &p.FazendaID, &p.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, &p)
	}
	return list, rows.Err()
}

// UpdateGestacaoIDTx atualiza o campo gestacao_id de um parto (versão transacional).
// Usado quando o parto foi criado sem vínculo e o backend resolve
// a gestação automaticamente (resolveGestacaoIDTx).
func (r *PartoRepository) UpdateGestacaoIDTx(ctx context.Context, tx pgx.Tx, partoID, gestacaoID int64) error {
	query := `UPDATE partos SET gestacao_id = $1 WHERE id = $2`
	_, err := tx.Exec(ctx, query, gestacaoID, partoID)
	return err
}

// UpdateGestacaoID atualiza o campo gestacao_id de um parto (sem transação explícita).
func (r *PartoRepository) UpdateGestacaoID(ctx context.Context, partoID, gestacaoID int64) error {
	query := `UPDATE partos SET gestacao_id = $1 WHERE id = $2`
	_, err := r.db.Exec(ctx, query, gestacaoID, partoID)
	return err
}

func (r *PartoRepository) GetByID(ctx context.Context, id int64) (*models.Parto, error) {
	query := `SELECT id, animal_id, gestacao_id, data, tipo, numero_crias, complicacoes, observacoes, fazenda_id, created_at FROM partos WHERE id = $1`
	var p models.Parto
	err := r.db.QueryRow(ctx, query, id).Scan(&p.ID, &p.AnimalID, &p.GestacaoID, &p.Data, &p.Tipo, &p.NumeroCrias, &p.Complicacoes, &p.Observacoes, &p.FazendaID, &p.CreatedAt)
	if err == pgx.ErrNoRows {
		return nil, pgx.ErrNoRows
	}
	return &p, err
}

func (r *PartoRepository) GetByAnimalID(ctx context.Context, animalID int64) ([]*models.Parto, error) {
	query := `SELECT id, animal_id, gestacao_id, data, tipo, numero_crias, complicacoes, observacoes, fazenda_id, created_by, created_at
		FROM partos WHERE animal_id = $1 ORDER BY data DESC`
	rows, err := r.db.Query(ctx, query, animalID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []*models.Parto
	for rows.Next() {
		var p models.Parto
		if err := rows.Scan(&p.ID, &p.AnimalID, &p.GestacaoID, &p.Data, &p.Tipo, &p.NumeroCrias, &p.Complicacoes, &p.Observacoes, &p.FazendaID, &p.CreatedBy, &p.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, &p)
	}
	return list, rows.Err()
}

func (r *PartoRepository) GetByFazendaID(ctx context.Context, fazendaID int64) ([]*models.Parto, error) {
	query := `SELECT id, animal_id, gestacao_id, data, tipo, numero_crias, complicacoes, observacoes, fazenda_id, created_at
		FROM partos WHERE fazenda_id = $1 ORDER BY data DESC`
	rows, err := r.db.Query(ctx, query, fazendaID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []*models.Parto
	for rows.Next() {
		var p models.Parto
		if err := rows.Scan(&p.ID, &p.AnimalID, &p.GestacaoID, &p.Data, &p.Tipo, &p.NumeroCrias, &p.Complicacoes, &p.Observacoes, &p.FazendaID, &p.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, &p)
	}
	return list, rows.Err()
}

func (r *PartoRepository) Update(ctx context.Context, p *models.Parto) error {
	if p.ID <= 0 {
		return fmt.Errorf("id invalido: %d", p.ID)
	}
	query := `UPDATE partos
		SET animal_id = $1, gestacao_id = $2, data = $3, tipo = $4, numero_crias = $5, complicacoes = $6, observacoes = $7, fazenda_id = $8
		WHERE id = $9`
	cmd, err := r.db.Exec(ctx, query, p.AnimalID, p.GestacaoID, p.Data, p.Tipo, p.NumeroCrias, p.Complicacoes, p.Observacoes, p.FazendaID, p.ID)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return errors.New("nenhuma linha atualizada")
	}
	return nil
}

func (r *PartoRepository) Delete(ctx context.Context, id int64) error {
	if id <= 0 {
		return fmt.Errorf("id invalido: %d", id)
	}
	cmd, err := r.db.Exec(ctx, `DELETE FROM partos WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return ErrPartoDeleteNoRows
	}
	return nil
}

func (r *PartoRepository) DeleteTx(ctx context.Context, tx pgx.Tx, id int64) error {
	if id <= 0 {
		return fmt.Errorf("id invalido: %d", id)
	}
	cmd, err := tx.Exec(ctx, `DELETE FROM partos WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return ErrPartoDeleteNoRows
	}
	return nil
}
