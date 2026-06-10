package repository

import (
	"context"
	"time"

	"github.com/ceialmilk/api/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const animalVacinaColumns = `id, animal_id, fazenda_id, tipo_vacina, dose, data_prevista, data_aplicacao,
	validade_dias, data_proximo_reforco, lote, veterinario, observacoes, created_by, created_at, updated_at`

type AnimalVacinaRepository struct {
	db *pgxpool.Pool
}

func NewAnimalVacinaRepository(db *pgxpool.Pool) *AnimalVacinaRepository {
	return &AnimalVacinaRepository{db: db}
}

func scanAnimalVacina(row pgx.Row) (*models.AnimalVacina, error) {
	var item models.AnimalVacina
	err := row.Scan(
		&item.ID,
		&item.AnimalID,
		&item.FazendaID,
		&item.TipoVacina,
		&item.Dose,
		&item.DataPrevista,
		&item.DataAplicacao,
		&item.ValidadeDias,
		&item.DataProximoReforco,
		&item.Lote,
		&item.Veterinario,
		&item.Observacoes,
		&item.CreatedBy,
		&item.CreatedAt,
		&item.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *AnimalVacinaRepository) ListByAnimalID(ctx context.Context, animalID int64) ([]*models.AnimalVacina, error) {
	q := `
		SELECT ` + animalVacinaColumns + `
		FROM animal_vacinas
		WHERE animal_id = $1
		ORDER BY COALESCE(data_aplicacao, data_prevista) DESC, id DESC
	`
	rows, err := r.db.Query(ctx, q, animalID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*models.AnimalVacina
	for rows.Next() {
		item, err := scanAnimalVacina(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, item)
	}
	return list, rows.Err()
}

func (r *AnimalVacinaRepository) GetByID(ctx context.Context, animalID, vacinaID int64) (*models.AnimalVacina, error) {
	q := `
		SELECT ` + animalVacinaColumns + `
		FROM animal_vacinas
		WHERE id = $1 AND animal_id = $2
	`
	return scanAnimalVacina(r.db.QueryRow(ctx, q, vacinaID, animalID))
}

func (r *AnimalVacinaRepository) Create(ctx context.Context, row *models.AnimalVacina) error {
	const q = `
		INSERT INTO animal_vacinas (animal_id, fazenda_id, tipo_vacina, dose, data_prevista, data_aplicacao,
			validade_dias, data_proximo_reforco, lote, veterinario, observacoes, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING id, created_at, updated_at
	`
	return r.db.QueryRow(
		ctx,
		q,
		row.AnimalID,
		row.FazendaID,
		row.TipoVacina,
		row.Dose,
		row.DataPrevista,
		row.DataAplicacao,
		row.ValidadeDias,
		row.DataProximoReforco,
		row.Lote,
		row.Veterinario,
		row.Observacoes,
		row.CreatedBy,
	).Scan(&row.ID, &row.CreatedAt, &row.UpdatedAt)
}

func (r *AnimalVacinaRepository) Update(ctx context.Context, row *models.AnimalVacina) error {
	const q = `
		UPDATE animal_vacinas
		SET tipo_vacina = $1, dose = $2, data_prevista = $3, data_aplicacao = $4,
			validade_dias = $5, data_proximo_reforco = $6, lote = $7, veterinario = $8,
			observacoes = $9, updated_at = NOW()
		WHERE id = $10 AND animal_id = $11
		RETURNING updated_at
	`
	return r.db.QueryRow(
		ctx,
		q,
		row.TipoVacina,
		row.Dose,
		row.DataPrevista,
		row.DataAplicacao,
		row.ValidadeDias,
		row.DataProximoReforco,
		row.Lote,
		row.Veterinario,
		row.Observacoes,
		row.ID,
		row.AnimalID,
	).Scan(&row.UpdatedAt)
}

func (r *AnimalVacinaRepository) Delete(ctx context.Context, animalID, vacinaID int64) error {
	const q = `DELETE FROM animal_vacinas WHERE id = $1 AND animal_id = $2`
	tag, err := r.db.Exec(ctx, q, vacinaID, animalID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

// ExistsPrevistaAbertaByAnimalTipo verifica vacina prevista (sem aplicação) do mesmo tipo para o animal,
// excluindo opcionalmente um registro (edição). Base do 409 VACINA_DUPLICADA.
func (r *AnimalVacinaRepository) ExistsPrevistaAbertaByAnimalTipo(ctx context.Context, animalID int64, tipoVacina string, excludeID int64) (bool, error) {
	const q = `
		SELECT EXISTS (
			SELECT 1 FROM animal_vacinas
			WHERE animal_id = $1 AND tipo_vacina = $2 AND data_aplicacao IS NULL AND id <> $3
		)
	`
	var exists bool
	err := r.db.QueryRow(ctx, q, animalID, tipoVacina, excludeID).Scan(&exists)
	return exists, err
}

// ListPrevistasVencidasByFazendaID lista animais (no rebanho) com vacina prevista atrasada
// além do limite (BR-ALERTA-016 / regra 7).
func (r *AnimalVacinaRepository) ListPrevistasVencidasByFazendaID(ctx context.Context, fazendaID int64, limiteDataPrevista time.Time) ([]AlertaAnimalIdentificacao, error) {
	q := `
		SELECT DISTINCT a.id, a.identificacao
		FROM animal_vacinas v
		INNER JOIN animais a ON a.id = v.animal_id
		WHERE v.fazenda_id = $1
		  AND v.data_aplicacao IS NULL
		  AND v.data_prevista <= $2::date
		  AND ` + SQLNoRebanhoFor("a") + `
		ORDER BY a.identificacao ASC
	`
	return r.queryAlertaAnimais(ctx, q, fazendaID, limiteDataPrevista)
}

// ListReforcosVencidosByFazendaID lista animais (no rebanho) com reforço vencido além do limite,
// sem nova dose do mesmo tipo aplicada depois (BR-ALERTA-017 / regra 8).
func (r *AnimalVacinaRepository) ListReforcosVencidosByFazendaID(ctx context.Context, fazendaID int64, limiteReforco time.Time) ([]AlertaAnimalIdentificacao, error) {
	q := `
		SELECT DISTINCT a.id, a.identificacao
		FROM animal_vacinas v
		INNER JOIN animais a ON a.id = v.animal_id
		WHERE v.fazenda_id = $1
		  AND v.data_aplicacao IS NOT NULL
		  AND v.data_proximo_reforco IS NOT NULL
		  AND v.data_proximo_reforco <= $2::date
		  AND NOT EXISTS (
			SELECT 1 FROM animal_vacinas v2
			WHERE v2.animal_id = v.animal_id
			  AND v2.tipo_vacina = v.tipo_vacina
			  AND v2.data_aplicacao IS NOT NULL
			  AND v2.data_aplicacao > v.data_aplicacao
		  )
		  AND ` + SQLNoRebanhoFor("a") + `
		ORDER BY a.identificacao ASC
	`
	return r.queryAlertaAnimais(ctx, q, fazendaID, limiteReforco)
}

func (r *AnimalVacinaRepository) queryAlertaAnimais(ctx context.Context, q string, args ...any) ([]AlertaAnimalIdentificacao, error) {
	rows, err := r.db.Query(ctx, q, args...)
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
