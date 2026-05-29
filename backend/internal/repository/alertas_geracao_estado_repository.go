package repository

import (
	"context"
	"encoding/json"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AlertasGeracaoEstado struct {
	FazendaID           int64
	UltimaExecucao      time.Time
	ConformidadeChaves  []string
}

type AlertasGeracaoEstadoRepository struct {
	db *pgxpool.Pool
}

func NewAlertasGeracaoEstadoRepository(db *pgxpool.Pool) *AlertasGeracaoEstadoRepository {
	return &AlertasGeracaoEstadoRepository{db: db}
}

func (r *AlertasGeracaoEstadoRepository) Get(ctx context.Context, fazendaID int64) (*AlertasGeracaoEstado, error) {
	const q = `
		SELECT fazenda_id, ultima_execucao, conformidade_chaves
		FROM alertas_geracao_estado
		WHERE fazenda_id = $1
	`
	var raw []byte
	var e AlertasGeracaoEstado
	err := r.db.QueryRow(ctx, q, fazendaID).Scan(&e.FazendaID, &e.UltimaExecucao, &raw)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if len(raw) > 0 {
		if err := json.Unmarshal(raw, &e.ConformidadeChaves); err != nil {
			return nil, err
		}
	}
	if e.ConformidadeChaves == nil {
		e.ConformidadeChaves = []string{}
	}
	return &e, nil
}

func (r *AlertasGeracaoEstadoRepository) Upsert(ctx context.Context, fazendaID int64, chaves []string, execucao time.Time) error {
	if chaves == nil {
		chaves = []string{}
	}
	raw, err := json.Marshal(chaves)
	if err != nil {
		return err
	}
	const q = `
		INSERT INTO alertas_geracao_estado (fazenda_id, ultima_execucao, conformidade_chaves)
		VALUES ($1, $2, $3)
		ON CONFLICT (fazenda_id) DO UPDATE SET
			ultima_execucao = EXCLUDED.ultima_execucao,
			conformidade_chaves = EXCLUDED.conformidade_chaves
	`
	_, err = r.db.Exec(ctx, q, fazendaID, execucao, raw)
	return err
}
