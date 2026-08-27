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

type CoberturaRepository struct {
	db *pgxpool.Pool
}

func NewCoberturaRepository(db *pgxpool.Pool) *CoberturaRepository {
	return &CoberturaRepository{db: db}
}

func (r *CoberturaRepository) Create(ctx context.Context, c *models.Cobertura) error {
	return r.createWithQuerier(ctx, r.db, c)
}

func (r *CoberturaRepository) CreateTx(ctx context.Context, tx pgx.Tx, c *models.Cobertura) error {
	return r.createWithQuerier(ctx, tx, c)
}

func (r *CoberturaRepository) createWithQuerier(ctx context.Context, q interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}, c *models.Cobertura) error {
	query := `INSERT INTO coberturas (animal_id, cio_id, tipo, data, touro_animal_id, touro_info, semen_partida, tecnico, protocolo_id, observacoes, fazenda_id, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id, created_at, updated_at`
	return q.QueryRow(ctx, query, c.AnimalID, c.CioID, c.Tipo, c.Data, c.TouroAnimalID, c.TouroInfo, c.SemenPartida, c.Tecnico, c.ProtocoloID, c.Observacoes, c.FazendaID, c.CreatedBy).
		Scan(&c.ID, &c.CreatedAt, &c.UpdatedAt)
}

func (r *CoberturaRepository) GetByID(ctx context.Context, id int64) (*models.Cobertura, error) {
	query := `SELECT id, animal_id, cio_id, tipo, data, touro_animal_id, touro_info, semen_partida, tecnico, protocolo_id, observacoes, fazenda_id, created_by, created_at, updated_at FROM coberturas WHERE id = $1`
	var c models.Cobertura
	err := r.db.QueryRow(ctx, query, id).Scan(&c.ID, &c.AnimalID, &c.CioID, &c.Tipo, &c.Data, &c.TouroAnimalID, &c.TouroInfo, &c.SemenPartida, &c.Tecnico, &c.ProtocoloID, &c.Observacoes, &c.FazendaID, &c.CreatedBy, &c.CreatedAt, &c.UpdatedAt)
	if err == pgx.ErrNoRows {
		return nil, pgx.ErrNoRows
	}
	return &c, err
}

func (r *CoberturaRepository) GetByAnimalID(ctx context.Context, animalID int64) ([]*models.Cobertura, error) {
	query := `SELECT id, animal_id, cio_id, tipo, data, touro_animal_id, touro_info, semen_partida, tecnico, protocolo_id, observacoes, fazenda_id, created_by, created_at, updated_at
		FROM coberturas WHERE animal_id = $1 ORDER BY data DESC`
	rows, err := r.db.Query(ctx, query, animalID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []*models.Cobertura
	for rows.Next() {
		var c models.Cobertura
		if err := rows.Scan(&c.ID, &c.AnimalID, &c.CioID, &c.Tipo, &c.Data, &c.TouroAnimalID, &c.TouroInfo, &c.SemenPartida, &c.Tecnico, &c.ProtocoloID, &c.Observacoes, &c.FazendaID, &c.CreatedBy, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, &c)
	}
	return list, rows.Err()
}

func (r *CoberturaRepository) GetByFazendaID(ctx context.Context, fazendaID int64) ([]*models.Cobertura, error) {
	query := `SELECT id, animal_id, cio_id, tipo, data, touro_animal_id, touro_info, semen_partida, tecnico, protocolo_id, observacoes, fazenda_id, created_at, updated_at
		FROM coberturas WHERE fazenda_id = $1 ORDER BY data DESC`
	rows, err := r.db.Query(ctx, query, fazendaID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []*models.Cobertura
	for rows.Next() {
		var c models.Cobertura
		if err := rows.Scan(&c.ID, &c.AnimalID, &c.CioID, &c.Tipo, &c.Data, &c.TouroAnimalID, &c.TouroInfo, &c.SemenPartida, &c.Tecnico, &c.ProtocoloID, &c.Observacoes, &c.FazendaID, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, &c)
	}
	return list, rows.Err()
}

func (r *CoberturaRepository) Update(ctx context.Context, c *models.Cobertura) error {
	if c.ID <= 0 {
		return fmt.Errorf("id invalido: %d", c.ID)
	}
	query := `UPDATE coberturas SET animal_id = $1, cio_id = $2, tipo = $3, data = $4, touro_animal_id = $5, touro_info = $6, semen_partida = $7, tecnico = $8, protocolo_id = $9, observacoes = $10, updated_at = $11 WHERE id = $12`
	cmd, err := r.db.Exec(ctx, query, c.AnimalID, c.CioID, c.Tipo, c.Data, c.TouroAnimalID, c.TouroInfo, c.SemenPartida, c.Tecnico, c.ProtocoloID, c.Observacoes, time.Now(), c.ID)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return errors.New("nenhuma linha atualizada")
	}
	return nil
}

func (r *CoberturaRepository) Delete(ctx context.Context, id int64) error {
	_, err := r.db.Exec(ctx, `DELETE FROM coberturas WHERE id = $1`, id)
	return err
}

func (r *CoberturaRepository) DeleteTx(ctx context.Context, tx pgx.Tx, id int64) error {
	_, err := tx.Exec(ctx, `DELETE FROM coberturas WHERE id = $1`, id)
	return err
}

// ExistsByCioID indica se alguma cobertura (exceto excludeID) já referencia o cio.
func (r *CoberturaRepository) ExistsByCioID(ctx context.Context, cioID, excludeID int64) (bool, error) {
	query := `SELECT EXISTS (SELECT 1 FROM coberturas WHERE cio_id = $1 AND id <> $2)`
	var exists bool
	err := r.db.QueryRow(ctx, query, cioID, excludeID).Scan(&exists)
	return exists, err
}

// HasCoberturaAbertaByAnimalID: resta cobertura sem toque e sem gestação (BR-COBERTURAS-011).
func (r *CoberturaRepository) HasCoberturaAbertaByAnimalID(ctx context.Context, tx pgx.Tx, animalID int64) (bool, error) {
	query := `
		SELECT EXISTS (
			SELECT 1 FROM coberturas cb
			WHERE cb.animal_id = $1
			AND NOT EXISTS (SELECT 1 FROM diagnosticos_gestacao dg WHERE dg.cobertura_id = cb.id)
			AND NOT EXISTS (SELECT 1 FROM gestacoes g WHERE g.cobertura_id = cb.id)
		)`
	var exists bool
	var err error
	if tx != nil {
		err = tx.QueryRow(ctx, query, animalID).Scan(&exists)
	} else {
		err = r.db.QueryRow(ctx, query, animalID).Scan(&exists)
	}
	return exists, err
}

// HasCioSemCoberturaByAnimalID: cio do animal ainda sem cobertura vinculada (BR-COBERTURAS-008).
func (r *CoberturaRepository) HasCioSemCoberturaByAnimalID(ctx context.Context, animalID, fazendaID int64) (bool, error) {
	query := `
		SELECT EXISTS (
			SELECT 1 FROM cios ci
			WHERE ci.animal_id = $1 AND ci.fazenda_id = $2
			AND NOT EXISTS (SELECT 1 FROM coberturas cb WHERE cb.cio_id = ci.id)
		)`
	var exists bool
	err := r.db.QueryRow(ctx, query, animalID, fazendaID).Scan(&exists)
	return exists, err
}

// HasPendenteToqueByAnimalID indica cobertura há diasMinimos+ dias sem diagnóstico de gestação.
func (r *CoberturaRepository) HasPendenteToqueByAnimalID(ctx context.Context, animalID, fazendaID int64, diasMinimos int) (bool, error) {
	query := `
		SELECT EXISTS (
			SELECT 1 FROM coberturas cb
			WHERE cb.animal_id = $1 AND cb.fazenda_id = $2
			AND cb.data <= CURRENT_TIMESTAMP - ($3 * interval '1 day')
			AND NOT EXISTS (
				SELECT 1 FROM diagnosticos_gestacao dg WHERE dg.cobertura_id = cb.id
			)
		)`
	var exists bool
	err := r.db.QueryRow(ctx, query, animalID, fazendaID, diasMinimos).Scan(&exists)
	return exists, err
}
