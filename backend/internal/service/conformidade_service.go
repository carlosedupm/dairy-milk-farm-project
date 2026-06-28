package service

import (
	"context"
	"fmt"

	"github.com/ceialmilk/api/internal/repository"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ConformidadeAnomalia representa um desvio das regras BR no banco.
type ConformidadeAnomalia struct {
	Codigo         string  `json:"codigo"`
	Severidade     string  `json:"severidade"` // ALTA | MEDIA
	AnimalID       int64   `json:"animal_id"`
	Identificacao  string  `json:"identificacao"`
	Descricao      string  `json:"descricao"`
	EntidadeTipo   *string `json:"entidade_tipo,omitempty"`
	EntidadeID     *int64  `json:"entidade_id,omitempty"`
}

type ConformidadeService struct {
	db *pgxpool.Pool
}

func NewConformidadeService(db *pgxpool.Pool) *ConformidadeService {
	return &ConformidadeService{db: db}
}

// noRebanhoA fragmento AND para checks INT-001 a INT-006 (BR-AUDIT-009).
var noRebanhoA = " AND " + repository.SQLNoRebanhoFor("a")

// ListByFazenda executa checks read-only de integridade (BR-CICLO, BR-LEITE, BR-TOQUES).
func (s *ConformidadeService) ListByFazenda(ctx context.Context, fazendaID int64) ([]ConformidadeAnomalia, error) {
	var out []ConformidadeAnomalia
	checks := []func(context.Context, int64) ([]ConformidadeAnomalia, error){
		s.checkMultiplasLactacoesAtivas,
		s.checkProducaoSemLactacaoAtiva,
		s.checkGestacaoSemToquePositivo,
		s.checkRestricaoSemLactacao,
		s.checkPrenheSemGestacaoConfirmada,
		s.checkToquePositivoSemCobertura,
		s.checkAnimalBaixadoComCicloAberto,
		s.checkMarcoReprodutivoAnimalImaturo,
	}
	for _, fn := range checks {
		items, err := fn(ctx, fazendaID)
		if err != nil {
			return nil, err
		}
		out = append(out, items...)
	}
	if out == nil {
		out = []ConformidadeAnomalia{}
	}
	return out, nil
}

func (s *ConformidadeService) checkMultiplasLactacoesAtivas(ctx context.Context, fazendaID int64) ([]ConformidadeAnomalia, error) {
	q := `
		SELECT a.id, a.identificacao
		FROM lactacoes l
		INNER JOIN animais a ON a.id = l.animal_id
		WHERE l.fazenda_id = $1
		  AND l.data_fim IS NULL
		  AND (l.status IS NULL OR l.status = 'EM_ANDAMENTO')` + noRebanhoA + `
		GROUP BY a.id, a.identificacao
		HAVING COUNT(*) > 1`
	return s.scanAnimalRows(ctx, q, fazendaID, "INT-001", "ALTA",
		"Mais de uma lactação ativa para o mesmo animal (BR-CICLO-005).")
}

// sqlProducaoSemLactacaoNaData — INT-002 / BR-CICLO-007: lactação cujo intervalo cobre o dia civil da produção
// (alinhado a FindLactacaoForProducaoDate / lactacaoCoveringProducaoDate; inclui lactações encerradas).
const sqlProducaoSemLactacaoNaData = `
		  AND NOT EXISTS (
		    SELECT 1 FROM lactacoes l
		    WHERE l.animal_id = p.animal_id
		      AND l.fazenda_id = $1
		      AND l.data_inicio <= p.data_hora::date
		      AND (l.data_fim IS NULL OR l.data_fim >= p.data_hora::date)
		  )`

func (s *ConformidadeService) checkProducaoSemLactacaoAtiva(ctx context.Context, fazendaID int64) ([]ConformidadeAnomalia, error) {
	q := `
		SELECT DISTINCT a.id, a.identificacao
		FROM producao_leite p
		INNER JOIN animais a ON a.id = p.animal_id
		WHERE a.fazenda_id = $1` + noRebanhoA + sqlProducaoSemLactacaoNaData
	return s.scanAnimalRows(ctx, q, fazendaID, "INT-002", "ALTA",
		"Registo de produção sem lactação que cubra a data (BR-CICLO-007).")
}

func (s *ConformidadeService) checkGestacaoSemToquePositivo(ctx context.Context, fazendaID int64) ([]ConformidadeAnomalia, error) {
	q := `
		SELECT a.id, a.identificacao
		FROM gestacoes g
		INNER JOIN animais a ON a.id = g.animal_id
		WHERE g.fazenda_id = $1
		  AND g.status = 'CONFIRMADA'` + noRebanhoA + `
		  AND NOT EXISTS (
		    SELECT 1 FROM diagnosticos_gestacao d
		    WHERE d.animal_id = g.animal_id
		      AND d.cobertura_id = g.cobertura_id
		      AND d.resultado = 'POSITIVO'
		  )`
	return s.scanAnimalRows(ctx, q, fazendaID, "INT-003", "ALTA",
		"Gestação confirmada sem toque positivo vinculado (BR-CICLO-003).")
}

func (s *ConformidadeService) checkRestricaoSemLactacao(ctx context.Context, fazendaID int64) ([]ConformidadeAnomalia, error) {
	q := `
		SELECT a.id, a.identificacao
		FROM restricoes_leite r
		INNER JOIN animais a ON a.id = r.animal_id
		WHERE r.fazenda_id = $1
		  AND r.status = 'AGUARDANDO_LAB'` + noRebanhoA + `
		  AND NOT EXISTS (
		    SELECT 1 FROM lactacoes l
		    WHERE l.animal_id = r.animal_id
		      AND l.fazenda_id = $1
		      AND l.data_fim IS NULL
		      AND (l.status IS NULL OR l.status = 'EM_ANDAMENTO')
		  )`
	return s.scanAnimalRows(ctx, q, fazendaID, "INT-004", "ALTA",
		"Restrição de leite ativa sem lactação ativa (BR-LEITE-005).")
}

func (s *ConformidadeService) checkPrenheSemGestacaoConfirmada(ctx context.Context, fazendaID int64) ([]ConformidadeAnomalia, error) {
	q := `
		SELECT a.id, a.identificacao
		FROM animais a
		WHERE a.fazenda_id = $1
		  AND a.status_reprodutivo = 'PRENHE'` + noRebanhoA + `
		  AND NOT EXISTS (
		    SELECT 1 FROM gestacoes g
		    WHERE g.animal_id = a.id
		      AND g.fazenda_id = $1
		      AND g.status = 'CONFIRMADA'
		  )`
	return s.scanAnimalRows(ctx, q, fazendaID, "INT-005", "MEDIA",
		"Animal PRENHE sem gestação confirmada ativa (BR-CICLO-002 / dados legados).")
}

func (s *ConformidadeService) checkToquePositivoSemCobertura(ctx context.Context, fazendaID int64) ([]ConformidadeAnomalia, error) {
	q := `
		SELECT a.id, a.identificacao
		FROM diagnosticos_gestacao d
		INNER JOIN animais a ON a.id = d.animal_id
		WHERE d.fazenda_id = $1
		  AND d.resultado = 'POSITIVO'
		  AND d.cobertura_id IS NULL` + noRebanhoA
	return s.scanAnimalRows(ctx, q, fazendaID, "INT-006", "ALTA",
		"Toque positivo sem cobertura vinculada (BR-TOQUES-002).")
}

func (s *ConformidadeService) checkAnimalBaixadoComCicloAberto(ctx context.Context, fazendaID int64) ([]ConformidadeAnomalia, error) {
	const q = `
		SELECT DISTINCT a.id, a.identificacao
		FROM animais a
		WHERE a.fazenda_id = $1
		  AND a.data_saida IS NOT NULL
		  AND a.data_saida <= CURRENT_DATE
		  AND (
		    EXISTS (
		      SELECT 1 FROM lactacoes l
		      WHERE l.animal_id = a.id AND l.fazenda_id = $1
		        AND l.data_fim IS NULL
		        AND (l.status IS NULL OR l.status = 'EM_ANDAMENTO')
		    )
		    OR EXISTS (
		      SELECT 1 FROM gestacoes g
		      WHERE g.animal_id = a.id AND g.fazenda_id = $1 AND g.status = 'CONFIRMADA'
		    )
		    OR EXISTS (
		      SELECT 1 FROM restricoes_leite r
		      WHERE r.animal_id = a.id AND r.fazenda_id = $1 AND r.status = 'AGUARDANDO_LAB'
		    )
		  )`
	return s.scanAnimalRows(ctx, q, fazendaID, "INT-007", "ALTA",
		"Animal com baixa registrada mas lactação, gestação confirmada ou restrição de leite ainda aberta (BR-BAIXA-003 / reversão parcial).")
}

// sqlAnimalImaturoParaMarco (%s = coluna de data do evento) — BR-CICLO-016/017 / INT-008.
const sqlAnimalImaturoParaMarco = `
		  (
		    a.categoria IN ('BEZERRA', 'BEZERRO')
		    OR a.categoria IS NULL
		    OR TRIM(a.categoria) = ''
		    OR a.categoria NOT IN ('NOVILHA', 'MATRIZ')
		    OR (
		      a.categoria = 'NOVILHA'
		      AND (
		        a.data_nascimento IS NULL
		        OR (%s)::date < (a.data_nascimento + interval '12 months')::date
		      )
		    )
		  )`

func (s *ConformidadeService) checkMarcoReprodutivoAnimalImaturo(ctx context.Context, fazendaID int64) ([]ConformidadeAnomalia, error) {
	desc := "Marco reprodutivo ou lactação em animal imaturo (bezerra/bezerro, novilha <12m ou categoria inadequada) — BR-CICLO-016/017."
	queries := []string{
		fmt.Sprintf(`
		SELECT DISTINCT a.id, a.identificacao
		FROM cios ci
		INNER JOIN animais a ON a.id = ci.animal_id
		WHERE ci.fazenda_id = $1`+noRebanhoA+` AND `+sqlAnimalImaturoParaMarco, "ci.data_detectado"),
		fmt.Sprintf(`
		SELECT DISTINCT a.id, a.identificacao
		FROM coberturas cb
		INNER JOIN animais a ON a.id = cb.animal_id
		WHERE cb.fazenda_id = $1`+noRebanhoA+` AND `+sqlAnimalImaturoParaMarco, "cb.data"),
		fmt.Sprintf(`
		SELECT DISTINCT a.id, a.identificacao
		FROM diagnosticos_gestacao dg
		INNER JOIN animais a ON a.id = dg.animal_id
		WHERE dg.fazenda_id = $1`+noRebanhoA+` AND `+sqlAnimalImaturoParaMarco, "dg.data"),
		fmt.Sprintf(`
		SELECT DISTINCT a.id, a.identificacao
		FROM partos p
		INNER JOIN animais a ON a.id = p.animal_id
		WHERE p.fazenda_id = $1`+noRebanhoA+` AND `+sqlAnimalImaturoParaMarco, "p.data"),
		fmt.Sprintf(`
		SELECT DISTINCT a.id, a.identificacao
		FROM secagens s
		INNER JOIN animais a ON a.id = s.animal_id
		WHERE s.fazenda_id = $1`+noRebanhoA+` AND `+sqlAnimalImaturoParaMarco, "s.data_secagem"),
		fmt.Sprintf(`
		SELECT DISTINCT a.id, a.identificacao
		FROM producao_leite pl
		INNER JOIN animais a ON a.id = pl.animal_id
		WHERE a.fazenda_id = $1`+noRebanhoA+` AND `+sqlAnimalImaturoParaMarco, "pl.data_hora"),
	}
	seen := make(map[int64]ConformidadeAnomalia)
	for _, q := range queries {
		items, err := s.scanAnimalRows(ctx, q, fazendaID, "INT-008", "ALTA", desc)
		if err != nil {
			return nil, err
		}
		for _, item := range items {
			seen[item.AnimalID] = item
		}
	}
	out := make([]ConformidadeAnomalia, 0, len(seen))
	for _, item := range seen {
		out = append(out, item)
	}
	return out, nil
}

func (s *ConformidadeService) scanAnimalRows(
	ctx context.Context, query string, fazendaID int64,
	codigo, severidade, descricao string,
) ([]ConformidadeAnomalia, error) {
	rows, err := s.db.Query(ctx, query, fazendaID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []ConformidadeAnomalia
	for rows.Next() {
		var animalID int64
		var ident string
		if err := rows.Scan(&animalID, &ident); err != nil {
			return nil, err
		}
		out = append(out, ConformidadeAnomalia{
			Codigo:        codigo,
			Severidade:    severidade,
			AnimalID:      animalID,
			Identificacao: ident,
			Descricao:     descricao,
		})
	}
	return out, rows.Err()
}
