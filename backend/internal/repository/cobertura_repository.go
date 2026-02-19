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
	query := `INSERT INTO coberturas (animal_id, cio_id, tipo, data, touro_animal_id, touro_info, semen_partida, tecnico, protocolo_id, observacoes, fazenda_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id, created_at, updated_at`
	return r.db.QueryRow(ctx, query, c.AnimalID, c.CioID, c.Tipo, c.Data, c.TouroAnimalID, c.TouroInfo, c.SemenPartida, c.Tecnico, c.ProtocoloID, c.Observacoes, c.FazendaID).
		Scan(&c.ID, &c.CreatedAt, &c.UpdatedAt)
}

func (r *CoberturaRepository) GetByID(ctx context.Context, id int64) (*models.Cobertura, error) {
	query := `SELECT id, animal_id, cio_id, tipo, data, touro_animal_id, touro_info, semen_partida, tecnico, protocolo_id, observacoes, fazenda_id, created_at, updated_at FROM coberturas WHERE id = $1`
	var c models.Cobertura
	err := r.db.QueryRow(ctx, query, id).Scan(&c.ID, &c.AnimalID, &c.CioID, &c.Tipo, &c.Data, &c.TouroAnimalID, &c.TouroInfo, &c.SemenPartida, &c.Tecnico, &c.ProtocoloID, &c.Observacoes, &c.FazendaID, &c.CreatedAt, &c.UpdatedAt)
	if err == pgx.ErrNoRows {
		return nil, pgx.ErrNoRows
	}
	return &c, err
}

func (r *CoberturaRepository) GetByAnimalID(ctx context.Context, animalID int64) ([]*models.Cobertura, error) {
	query := `SELECT id, animal_id, cio_id, tipo, data, touro_animal_id, touro_info, semen_partida, tecnico, protocolo_id, observacoes, fazenda_id, created_at, updated_at
		FROM coberturas WHERE animal_id = $1 ORDER BY data DESC`
	rows, err := r.db.Query(ctx, query, animalID)
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
