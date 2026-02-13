package repository

import (
	"context"

	"github.com/ceialmilk/api/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type CioRepository struct {
	db *pgxpool.Pool
}

func NewCioRepository(db *pgxpool.Pool) *CioRepository {
	return &CioRepository{db: db}
}

func (r *CioRepository) Create(ctx context.Context, c *models.Cio) error {
	query := `INSERT INTO cios (animal_id, data_detectado, metodo_deteccao, intensidade, observacoes, usuario_id, fazenda_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, created_at`
	return r.db.QueryRow(ctx, query, c.AnimalID, c.DataDetectado, c.MetodoDeteccao, c.Intensidade, c.Observacoes, c.UsuarioID, c.FazendaID).
		Scan(&c.ID, &c.CreatedAt)
}

func (r *CioRepository) GetByID(ctx context.Context, id int64) (*models.Cio, error) {
	query := `SELECT id, animal_id, data_detectado, metodo_deteccao, intensidade, observacoes, usuario_id, fazenda_id, created_at FROM cios WHERE id = $1`
	var c models.Cio
	err := r.db.QueryRow(ctx, query, id).Scan(&c.ID, &c.AnimalID, &c.DataDetectado, &c.MetodoDeteccao, &c.Intensidade, &c.Observacoes, &c.UsuarioID, &c.FazendaID, &c.CreatedAt)
	if err == pgx.ErrNoRows {
		return nil, pgx.ErrNoRows
	}
	return &c, err
}

func (r *CioRepository) GetByAnimalID(ctx context.Context, animalID int64) ([]*models.Cio, error) {
	query := `SELECT id, animal_id, data_detectado, metodo_deteccao, intensidade, observacoes, usuario_id, fazenda_id, created_at
		FROM cios WHERE animal_id = $1 ORDER BY data_detectado DESC`
	rows, err := r.db.Query(ctx, query, animalID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []*models.Cio
	for rows.Next() {
		var c models.Cio
		if err := rows.Scan(&c.ID, &c.AnimalID, &c.DataDetectado, &c.MetodoDeteccao, &c.Intensidade, &c.Observacoes, &c.UsuarioID, &c.FazendaID, &c.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, &c)
	}
	return list, rows.Err()
}

func (r *CioRepository) GetByFazendaID(ctx context.Context, fazendaID int64) ([]*models.Cio, error) {
	query := `SELECT id, animal_id, data_detectado, metodo_deteccao, intensidade, observacoes, usuario_id, fazenda_id, created_at
		FROM cios WHERE fazenda_id = $1 ORDER BY data_detectado DESC`
	rows, err := r.db.Query(ctx, query, fazendaID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []*models.Cio
	for rows.Next() {
		var c models.Cio
		if err := rows.Scan(&c.ID, &c.AnimalID, &c.DataDetectado, &c.MetodoDeteccao, &c.Intensidade, &c.Observacoes, &c.UsuarioID, &c.FazendaID, &c.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, &c)
	}
	return list, rows.Err()
}

func (r *CioRepository) Delete(ctx context.Context, id int64) error {
	_, err := r.db.Exec(ctx, `DELETE FROM cios WHERE id = $1`, id)
	return err
}
