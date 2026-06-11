package repository

import (
	"context"
	"time"

	"github.com/ceialmilk/api/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const hormonioProtocoloColumns = `p.id, p.animal_id, p.fazenda_id, p.lactacao_id, p.gestacao_id, p.toque_referencia_id,
	p.produto, p.status, p.motivo_encerramento, p.data_inicio, p.data_encerramento, p.observacoes_encerramento,
	p.created_by, p.created_at, p.updated_at`

const hormonioAplicacaoColumns = `id, protocolo_id, animal_id, fazenda_id, produto, data_aplicacao, data_proxima_aplicacao,
	numero_dose, lote, observacoes, created_by, created_at, updated_at`

type AnimalHormonioLactacaoRepository struct {
	db *pgxpool.Pool
}

func NewAnimalHormonioLactacaoRepository(db *pgxpool.Pool) *AnimalHormonioLactacaoRepository {
	return &AnimalHormonioLactacaoRepository{db: db}
}

func scanHormonioProtocolo(row pgx.Row) (*models.AnimalHormonioLactacaoProtocolo, error) {
	var p models.AnimalHormonioLactacaoProtocolo
	err := row.Scan(
		&p.ID, &p.AnimalID, &p.FazendaID, &p.LactacaoID, &p.GestacaoID, &p.ToqueReferenciaID,
		&p.Produto, &p.Status, &p.MotivoEncerramento, &p.DataInicio, &p.DataEncerramento, &p.ObservacoesEncerramento,
		&p.CreatedBy, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func scanHormonioAplicacao(row pgx.Row) (*models.AnimalHormonioLactacaoAplicacao, error) {
	var a models.AnimalHormonioLactacaoAplicacao
	err := row.Scan(
		&a.ID, &a.ProtocoloID, &a.AnimalID, &a.FazendaID, &a.Produto, &a.DataAplicacao, &a.DataProximaAplicacao,
		&a.NumeroDose, &a.Lote, &a.Observacoes, &a.CreatedBy, &a.CreatedAt, &a.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func (r *AnimalHormonioLactacaoRepository) ListAplicacoesByAnimalID(ctx context.Context, animalID int64) ([]*models.AnimalHormonioLactacaoAplicacao, error) {
	q := `
		SELECT ` + hormonioAplicacaoColumns + `
		FROM animal_hormonio_lactacao_aplicacoes
		WHERE animal_id = $1
		ORDER BY data_aplicacao DESC, id DESC
	`
	rows, err := r.db.Query(ctx, q, animalID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []*models.AnimalHormonioLactacaoAplicacao
	for rows.Next() {
		item, err := scanHormonioAplicacao(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, item)
	}
	return list, rows.Err()
}

func (r *AnimalHormonioLactacaoRepository) GetAplicacaoByID(ctx context.Context, animalID, aplicacaoID int64) (*models.AnimalHormonioLactacaoAplicacao, error) {
	q := `
		SELECT ` + hormonioAplicacaoColumns + `
		FROM animal_hormonio_lactacao_aplicacoes
		WHERE id = $1 AND animal_id = $2
	`
	return scanHormonioAplicacao(r.db.QueryRow(ctx, q, aplicacaoID, animalID))
}

func (r *AnimalHormonioLactacaoRepository) GetUltimoProtocoloByLactacaoID(ctx context.Context, lactacaoID int64) (*models.AnimalHormonioLactacaoProtocolo, error) {
	q := `
		SELECT ` + hormonioProtocoloColumns + `
		FROM animal_hormonio_lactacao_protocolos p
		WHERE p.lactacao_id = $1
		ORDER BY p.data_inicio DESC, p.id DESC
		LIMIT 1
	`
	p, err := scanHormonioProtocolo(r.db.QueryRow(ctx, q, lactacaoID))
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return p, err
}

func (r *AnimalHormonioLactacaoRepository) GetProtocoloAtivoByLactacaoID(ctx context.Context, lactacaoID int64) (*models.AnimalHormonioLactacaoProtocolo, error) {
	q := `
		SELECT ` + hormonioProtocoloColumns + `
		FROM animal_hormonio_lactacao_protocolos p
		WHERE p.lactacao_id = $1 AND p.status = $2
	`
	p, err := scanHormonioProtocolo(r.db.QueryRow(ctx, q, lactacaoID, models.HormonioProtocoloStatusAtivo))
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return p, err
}

func (r *AnimalHormonioLactacaoRepository) GetProtocoloByID(ctx context.Context, animalID, protocoloID int64) (*models.AnimalHormonioLactacaoProtocolo, error) {
	q := `
		SELECT ` + hormonioProtocoloColumns + `
		FROM animal_hormonio_lactacao_protocolos p
		WHERE p.id = $1 AND p.animal_id = $2
	`
	return scanHormonioProtocolo(r.db.QueryRow(ctx, q, protocoloID, animalID))
}

func (r *AnimalHormonioLactacaoRepository) GetProtocoloAtivoOuUltimoByAnimalID(ctx context.Context, animalID int64) (*models.AnimalHormonioLactacaoProtocolo, error) {
	q := `
		SELECT ` + hormonioProtocoloColumns + `
		FROM animal_hormonio_lactacao_protocolos p
		WHERE p.animal_id = $1
		ORDER BY
			CASE WHEN p.status = $2 THEN 0 ELSE 1 END,
			p.data_inicio DESC,
			p.id DESC
		LIMIT 1
	`
	p, err := scanHormonioProtocolo(r.db.QueryRow(ctx, q, animalID, models.HormonioProtocoloStatusAtivo))
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return p, err
}

func (r *AnimalHormonioLactacaoRepository) GetUltimaAplicacaoByProtocoloID(ctx context.Context, protocoloID int64) (*models.AnimalHormonioLactacaoAplicacao, error) {
	q := `
		SELECT ` + hormonioAplicacaoColumns + `
		FROM animal_hormonio_lactacao_aplicacoes
		WHERE protocolo_id = $1
		ORDER BY data_aplicacao DESC, id DESC
		LIMIT 1
	`
	a, err := scanHormonioAplicacao(r.db.QueryRow(ctx, q, protocoloID))
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return a, err
}

func (r *AnimalHormonioLactacaoRepository) CreateProtocolo(ctx context.Context, row *models.AnimalHormonioLactacaoProtocolo) error {
	const q = `
		INSERT INTO animal_hormonio_lactacao_protocolos (
			animal_id, fazenda_id, lactacao_id, gestacao_id, toque_referencia_id,
			produto, status, data_inicio, created_by
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, created_at, updated_at
	`
	return r.db.QueryRow(
		ctx, q,
		row.AnimalID, row.FazendaID, row.LactacaoID, row.GestacaoID, row.ToqueReferenciaID,
		row.Produto, row.Status, row.DataInicio, row.CreatedBy,
	).Scan(&row.ID, &row.CreatedAt, &row.UpdatedAt)
}

func (r *AnimalHormonioLactacaoRepository) CreateAplicacao(ctx context.Context, row *models.AnimalHormonioLactacaoAplicacao) error {
	const q = `
		INSERT INTO animal_hormonio_lactacao_aplicacoes (
			protocolo_id, animal_id, fazenda_id, produto, data_aplicacao, data_proxima_aplicacao,
			numero_dose, lote, observacoes, created_by
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id, created_at, updated_at
	`
	return r.db.QueryRow(
		ctx, q,
		row.ProtocoloID, row.AnimalID, row.FazendaID, row.Produto, row.DataAplicacao, row.DataProximaAplicacao,
		row.NumeroDose, row.Lote, row.Observacoes, row.CreatedBy,
	).Scan(&row.ID, &row.CreatedAt, &row.UpdatedAt)
}

func (r *AnimalHormonioLactacaoRepository) UpdateAplicacao(ctx context.Context, row *models.AnimalHormonioLactacaoAplicacao) error {
	const q = `
		UPDATE animal_hormonio_lactacao_aplicacoes
		SET produto = $1, data_aplicacao = $2, data_proxima_aplicacao = $3,
		    lote = $4, observacoes = $5, updated_at = NOW()
		WHERE id = $6 AND animal_id = $7
		RETURNING updated_at
	`
	return r.db.QueryRow(
		ctx, q,
		row.Produto, row.DataAplicacao, row.DataProximaAplicacao,
		row.Lote, row.Observacoes, row.ID, row.AnimalID,
	).Scan(&row.UpdatedAt)
}

func (r *AnimalHormonioLactacaoRepository) DeleteAplicacao(ctx context.Context, animalID, aplicacaoID int64) error {
	tag, err := r.db.Exec(ctx,
		`DELETE FROM animal_hormonio_lactacao_aplicacoes WHERE id = $1 AND animal_id = $2`,
		aplicacaoID, animalID,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

func (r *AnimalHormonioLactacaoRepository) EncerrarProtocolo(
	ctx context.Context,
	protocoloID int64,
	motivo string,
	dataEncerramento time.Time,
	observacoes *string,
) error {
	const q = `
		UPDATE animal_hormonio_lactacao_protocolos
		SET status = $1, motivo_encerramento = $2, data_encerramento = $3,
		    observacoes_encerramento = $4, updated_at = NOW()
		WHERE id = $5 AND status = $6
	`
	tag, err := r.db.Exec(ctx, q,
		models.HormonioProtocoloStatusEncerrado, motivo, dataEncerramento, observacoes,
		protocoloID, models.HormonioProtocoloStatusAtivo,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

func (r *AnimalHormonioLactacaoRepository) EncerrarProtocoloAtivoByLactacaoIDTx(
	ctx context.Context,
	tx pgx.Tx,
	lactacaoID int64,
	motivo string,
	dataEncerramento time.Time,
) error {
	const q = `
		UPDATE animal_hormonio_lactacao_protocolos
		SET status = $1, motivo_encerramento = $2, data_encerramento = $3, updated_at = NOW()
		WHERE lactacao_id = $4 AND status = $5
	`
	_, err := tx.Exec(ctx, q,
		models.HormonioProtocoloStatusEncerrado, motivo, dataEncerramento,
		lactacaoID, models.HormonioProtocoloStatusAtivo,
	)
	return err
}

func (r *AnimalHormonioLactacaoRepository) ListPendentesByFazendaID(ctx context.Context, fazendaID int64, refDate time.Time) ([]*models.HormonioLactacaoPendente, error) {
	q := `
WITH teto AS (
	SELECT CURRENT_DATE AS hoje
),
primeira_dose AS (
	SELECT
		a.id AS animal_id,
		a.identificacao AS animal_identificacao,
		l.id AS lactacao_id,
		g.id AS gestacao_id,
		g.data_prevista_parto,
		$3::text AS tipo_pendencia,
		NULL::date AS data_proxima_aplicacao,
		NULL::int AS numero_dose_ultima,
		NULL::varchar AS produto_ultimo
	FROM animais a
	INNER JOIN lactacoes l ON l.animal_id = a.id
		AND l.data_fim IS NULL
		AND (l.status IS NULL OR l.status = 'EM_ANDAMENTO')
	INNER JOIN gestacoes g ON g.animal_id = a.id
		AND g.status = 'CONFIRMADA'
		AND g.data_prevista_parto IS NOT NULL
	WHERE a.fazenda_id = $1
	  AND ` + SQLNoRebanhoFor("a") + `
	  AND NOT EXISTS (
		SELECT 1 FROM animal_hormonio_lactacao_protocolos p
		WHERE p.lactacao_id = l.id
	  )
	  AND EXISTS (
		SELECT 1 FROM diagnosticos_gestacao dg
		WHERE dg.animal_id = a.id
		  AND dg.data >= l.data_inicio::date
		  AND (dg.resultado = 'POSITIVO' OR dg.classificacao_operacional = 'PRENHA')
	  )
	  AND CURRENT_DATE <= (g.data_prevista_parto - INTERVAL '70 days')::date
),
dose_vencida AS (
	SELECT
		a.id AS animal_id,
		a.identificacao AS animal_identificacao,
		p.lactacao_id,
		p.gestacao_id,
		g.data_prevista_parto,
		$4::text AS tipo_pendencia,
		ult.data_proxima_aplicacao,
		ult.numero_dose AS numero_dose_ultima,
		ult.produto AS produto_ultimo
	FROM animal_hormonio_lactacao_protocolos p
	INNER JOIN animais a ON a.id = p.animal_id
	INNER JOIN gestacoes g ON g.id = p.gestacao_id
	INNER JOIN LATERAL (
		SELECT ap.data_proxima_aplicacao, ap.numero_dose, ap.produto
		FROM animal_hormonio_lactacao_aplicacoes ap
		WHERE ap.protocolo_id = p.id
		ORDER BY ap.data_aplicacao DESC, ap.id DESC
		LIMIT 1
	) ult ON true
	WHERE p.fazenda_id = $1
	  AND p.status = 'ATIVO'
	  AND ` + SQLNoRebanhoFor("a") + `
	  AND ult.data_proxima_aplicacao IS NOT NULL
	  AND ult.data_proxima_aplicacao <= $2::date
	  AND CURRENT_DATE <= (g.data_prevista_parto - INTERVAL '70 days')::date
)
SELECT animal_id, animal_identificacao, lactacao_id, gestacao_id, data_prevista_parto,
       tipo_pendencia, data_proxima_aplicacao, numero_dose_ultima, produto_ultimo
FROM primeira_dose
UNION ALL
SELECT animal_id, animal_identificacao, lactacao_id, gestacao_id, data_prevista_parto,
       tipo_pendencia, data_proxima_aplicacao, numero_dose_ultima, produto_ultimo
FROM dose_vencida
ORDER BY animal_identificacao ASC
`
	rows, err := r.db.Query(ctx, q,
		fazendaID,
		refDate,
		models.HormonioPendenciaPrimeiraDose,
		models.HormonioPendenciaDoseVencida,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []*models.HormonioLactacaoPendente
	for rows.Next() {
		var item models.HormonioLactacaoPendente
		if err := rows.Scan(
			&item.AnimalID,
			&item.AnimalIdentificacao,
			&item.LactacaoID,
			&item.GestacaoID,
			&item.DataPrevistaParto,
			&item.TipoPendencia,
			&item.DataProximaAplicacao,
			&item.NumeroDoseUltima,
			&item.ProdutoUltimo,
		); err != nil {
			return nil, err
		}
		list = append(list, &item)
	}
	if list == nil {
		list = []*models.HormonioLactacaoPendente{}
	}
	return list, rows.Err()
}
