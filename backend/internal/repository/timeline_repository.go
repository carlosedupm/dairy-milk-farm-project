package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// TimelineFilterTipo filtra eventos da timeline por categoria.
type TimelineFilterTipo string

const (
	TimelineFilterTodos   TimelineFilterTipo = "todos"
	TimelineFilterCiclo   TimelineFilterTipo = "ciclo"
	TimelineFilterSaude   TimelineFilterTipo = "saude"
	TimelineFilterAlertas TimelineFilterTipo = "alertas"
	TimelineFilterVacinas TimelineFilterTipo = "vacinas"
)

// ParseTimelineFilterTipo valida o query param tipo da timeline.
func ParseTimelineFilterTipo(v string) (TimelineFilterTipo, bool) {
	switch TimelineFilterTipo(v) {
	case TimelineFilterTodos, TimelineFilterCiclo, TimelineFilterSaude, TimelineFilterAlertas, TimelineFilterVacinas:
		return TimelineFilterTipo(v), true
	default:
		return TimelineFilterTodos, false
	}
}

// TimelineRow linha bruta da union SQL antes do enriquecimento de auditoria.
type TimelineRow struct {
	Tipo      string
	Data      time.Time
	Titulo    string
	Detalhe   string
	RefID     int64
	CreatedBy *int64
}

type TimelineRepository struct {
	db *pgxpool.Pool
}

func NewTimelineRepository(db *pgxpool.Pool) *TimelineRepository {
	return &TimelineRepository{db: db}
}

const timelineUnionSQL = `
SELECT 'CIO'::text AS tipo,
       c.data_detectado AS data,
       'Cio detectado'::text AS titulo,
       COALESCE(c.metodo_deteccao, '')::text AS detalhe,
       c.id AS ref_id,
       c.usuario_id AS created_by
FROM cios c
WHERE c.animal_id = $1

UNION ALL

SELECT 'COBERTURA',
       cb.data,
       ('Cobertura (' || cb.tipo || ')')::text,
       ''::text,
       cb.id,
       cb.created_by
FROM coberturas cb
WHERE cb.animal_id = $1

UNION ALL

SELECT 'TOQUE',
       d.data,
       (CASE
            WHEN d.classificacao_operacional IS NOT NULL AND TRIM(d.classificacao_operacional) <> '' THEN
                CASE
                    WHEN d.classificacao_operacional = 'VAZIA_PEV' THEN 'Toque VAZIA PEV'
                    ELSE 'Toque ' || d.classificacao_operacional
                END
            ELSE 'Toque ' || d.resultado
        END)::text,
       COALESCE(
           NULLIF(TRIM(d.observacoes), ''),
           CASE
               WHEN d.dias_gestacao_estimados IS NOT NULL AND d.dias_gestacao_estimados > 0 THEN
                   CASE
                       WHEN d.dias_gestacao_estimados >= 30 AND (d.dias_gestacao_estimados % 30) = 0
                           THEN (d.dias_gestacao_estimados / 30)::text || ' meses'
                       ELSE d.dias_gestacao_estimados::text || ' dias'
                   END
               ELSE ''
           END
       )::text,
       d.id,
       d.created_by
FROM diagnosticos_gestacao d
WHERE d.animal_id = $1

UNION ALL

SELECT 'GESTACAO',
       g.data_confirmacao::timestamp,
       ('Gestação ' || g.status)::text,
       ''::text,
       g.id,
       g.created_by
FROM gestacoes g
WHERE g.animal_id = $1

UNION ALL

SELECT 'SECAGEM',
       s.data_secagem::timestamp,
       'Secagem'::text,
       ''::text,
       s.id,
       s.created_by
FROM secagens s
WHERE s.animal_id = $1

UNION ALL

SELECT 'PARTO',
       p.data,
       ('Parto (' || COALESCE(p.numero_crias, 1)::text || ' cria(s))')::text,
       ''::text,
       p.id,
       p.created_by
FROM partos p
WHERE p.animal_id = $1

UNION ALL

SELECT 'LACTACAO',
       COALESCE(l.data_fim, l.data_inicio)::timestamp,
       (CASE
            WHEN l.data_fim IS NOT NULL THEN 'Lactação #' || l.numero_lactacao::text || ' encerrada'
            ELSE 'Lactação #' || l.numero_lactacao::text || ' iniciada'
        END)::text,
       ''::text,
       l.id,
       l.created_by
FROM lactacoes l
WHERE l.animal_id = $1

UNION ALL

SELECT 'PRODUCAO',
       pl.data_hora,
       'Produção de leite'::text,
       (TO_CHAR(pl.quantidade, 'FM999999990.0') || ' L')::text,
       pl.id,
       pl.created_by
FROM producao_leite pl
WHERE pl.animal_id = $1

UNION ALL

SELECT 'SAUDE',
       ash.data_inicio::timestamp,
       (CASE ash.tipo_caso
            WHEN 'TRATAMENTO' THEN 'Tratamento'
            WHEN 'PREVENTIVO' THEN 'Preventivo'
            WHEN 'CIRURGIA' THEN 'Cirurgia'
            WHEN 'OUTRO' THEN 'Outro'
            ELSE ash.tipo_caso
        END || ' (' ||
        CASE ash.status
            WHEN 'ATIVO' THEN 'Ativo'
            WHEN 'CONCLUIDO' THEN 'Concluído'
            WHEN 'CANCELADO' THEN 'Cancelado'
            ELSE ash.status
        END || ')')::text,
       (CASE
            WHEN ash.observacoes IS NULL OR TRIM(ash.observacoes) = '' THEN ''
            WHEN LENGTH(TRIM(ash.observacoes)) <= 120 THEN TRIM(ash.observacoes)
            ELSE LEFT(TRIM(ash.observacoes), 120) || '…'
        END)::text,
       ash.id,
       ash.created_by
FROM animal_saude ash
WHERE ash.animal_id = $1

UNION ALL

SELECT 'ALERTA',
       al.created_at,
       al.titulo,
       (al.tipo || ' · ' || al.status)::text,
       al.id,
       al.created_by
FROM alertas al
WHERE al.animal_id = $1

UNION ALL

SELECT 'VACINA',
       COALESCE(av.data_aplicacao, av.data_prevista)::timestamp,
       ('Vacina ' ||
        CASE av.tipo_vacina
            WHEN 'AFTOSA' THEN 'Aftosa'
            WHEN 'BRUCELOSE' THEN 'Brucelose'
            WHEN 'RAIVA' THEN 'Raiva'
            WHEN 'CLOSTRIDIOSES' THEN 'Clostridioses'
            WHEN 'IBR_BVD' THEN 'IBR/BVD'
            WHEN 'LEPTOSPIROSE' THEN 'Leptospirose'
            ELSE 'Outra'
        END ||
        CASE
            WHEN av.data_aplicacao IS NOT NULL THEN ' (aplicada)'
            WHEN av.data_prevista < CURRENT_DATE THEN ' (atrasada)'
            ELSE ' (prevista)'
        END)::text,
       (CASE
            WHEN av.observacoes IS NULL OR TRIM(av.observacoes) = '' THEN COALESCE(av.dose, '')
            WHEN LENGTH(TRIM(av.observacoes)) <= 120 THEN TRIM(av.observacoes)
            ELSE LEFT(TRIM(av.observacoes), 120) || '…'
        END)::text,
       av.id,
       av.created_by
FROM animal_vacinas av
WHERE av.animal_id = $1

UNION ALL

SELECT 'BAIXA',
       a.data_saida::timestamp,
       'Baixa do rebanho'::text,
       (CASE a.motivo_saida
            WHEN 'MORTE' THEN 'Morte'
            WHEN 'VENDA' THEN 'Venda'
            WHEN 'DOACAO' THEN 'Doação'
            WHEN 'DESCARTE' THEN 'Descarte (saída do animal)'
            ELSE COALESCE(a.motivo_saida, '')
        END)::text,
       a.id,
       a.baixa_registrado_por
FROM animais a
WHERE a.id = $1 AND a.data_saida IS NOT NULL
`

func timelineFilterClause(filter TimelineFilterTipo, paramIdx int) string {
	switch filter {
	case TimelineFilterCiclo:
		return ` AND ev.tipo IN ('CIO','COBERTURA','TOQUE','GESTACAO','SECAGEM','PARTO','LACTACAO','PRODUCAO','BAIXA')`
	case TimelineFilterSaude:
		return ` AND ev.tipo = 'SAUDE'`
	case TimelineFilterAlertas:
		return ` AND ev.tipo = 'ALERTA'`
	case TimelineFilterVacinas:
		return ` AND ev.tipo = 'VACINA'`
	default:
		return ""
	}
}

func (r *TimelineRepository) ListByAnimal(
	ctx context.Context,
	animalID int64,
	filter TimelineFilterTipo,
	limit, offset int,
) ([]TimelineRow, int64, error) {
	filterSQL := timelineFilterClause(filter, 0)

	countQuery := fmt.Sprintf(`
WITH events AS (%s)
SELECT COUNT(*)::bigint FROM events ev WHERE TRUE%s`, timelineUnionSQL, filterSQL)

	var total int64
	if err := r.db.QueryRow(ctx, countQuery, animalID).Scan(&total); err != nil {
		return nil, 0, err
	}

	listQuery := fmt.Sprintf(`
WITH events AS (%s)
SELECT ev.tipo, ev.data, ev.titulo, ev.detalhe, ev.ref_id, ev.created_by
FROM events ev
WHERE TRUE%s
ORDER BY ev.data DESC, ev.ref_id DESC
LIMIT $2 OFFSET $3`, timelineUnionSQL, filterSQL)

	rows, err := r.db.Query(ctx, listQuery, animalID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var list []TimelineRow
	for rows.Next() {
		var row TimelineRow
		if err := rows.Scan(&row.Tipo, &row.Data, &row.Titulo, &row.Detalhe, &row.RefID, &row.CreatedBy); err != nil {
			return nil, 0, err
		}
		list = append(list, row)
	}
	if list == nil {
		list = []TimelineRow{}
	}
	return list, total, rows.Err()
}
