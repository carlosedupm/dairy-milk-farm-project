package repository

import (
	"context"
	"time"

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

func (r *CioRepository) ListDetectadosNaDataByFazendaID(ctx context.Context, fazendaID int64, data time.Time) ([]AlertaAnimalIdentificacao, error) {
	q := `
		SELECT DISTINCT c.animal_id, a.identificacao
		FROM cios c
		INNER JOIN animais a ON a.id = c.animal_id
		WHERE c.fazenda_id = $1
		  AND c.data_detectado::date = $2::date
		  AND ` + SQLNoRebanhoFor("a") + `
		ORDER BY a.identificacao ASC
	`
	rows, err := r.db.Query(ctx, q, fazendaID, data)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []AlertaAnimalIdentificacao
	for rows.Next() {
		var item AlertaAnimalIdentificacao
		if err := rows.Scan(&item.AnimalID, &item.Identificacao); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	if out == nil {
		out = []AlertaAnimalIdentificacao{}
	}
	return out, rows.Err()
}

func (r *CioRepository) Update(ctx context.Context, c *models.Cio) error {
	query := `UPDATE cios SET animal_id = $1, data_detectado = $2, metodo_deteccao = $3, intensidade = $4, observacoes = $5
		WHERE id = $6`
	_, err := r.db.Exec(ctx, query, c.AnimalID, c.DataDetectado, c.MetodoDeteccao, c.Intensidade, c.Observacoes, c.ID)
	return err
}

func (r *CioRepository) Delete(ctx context.Context, id int64) error {
	_, err := r.db.Exec(ctx, `DELETE FROM cios WHERE id = $1`, id)
	return err
}
