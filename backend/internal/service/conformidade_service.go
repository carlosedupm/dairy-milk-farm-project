package service

import (
	"context"

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
	const q = `
		SELECT a.id, a.identificacao
		FROM lactacoes l
		INNER JOIN animais a ON a.id = l.animal_id
		WHERE l.fazenda_id = $1
		  AND l.data_fim IS NULL
		  AND (l.status IS NULL OR l.status = 'EM_ANDAMENTO')
		GROUP BY a.id, a.identificacao
		HAVING COUNT(*) > 1`
	return s.scanAnimalRows(ctx, q, fazendaID, "INT-001", "ALTA",
		"Mais de uma lactação ativa para o mesmo animal (BR-CICLO-005).")
}

func (s *ConformidadeService) checkProducaoSemLactacaoAtiva(ctx context.Context, fazendaID int64) ([]ConformidadeAnomalia, error) {
	const q = `
		SELECT DISTINCT a.id, a.identificacao
		FROM producao_leite p
		INNER JOIN animais a ON a.id = p.animal_id
		WHERE a.fazenda_id = $1
		  AND NOT EXISTS (
		    SELECT 1 FROM lactacoes l
		    WHERE l.animal_id = p.animal_id
		      AND l.fazenda_id = $1
		      AND l.data_fim IS NULL
		      AND (l.status IS NULL OR l.status = 'EM_ANDAMENTO')
		      AND l.data_inicio <= p.data_hora::date
		  )`
	return s.scanAnimalRows(ctx, q, fazendaID, "INT-002", "ALTA",
		"Registo de produção sem lactação ativa na data (BR-CICLO-007).")
}

func (s *ConformidadeService) checkGestacaoSemToquePositivo(ctx context.Context, fazendaID int64) ([]ConformidadeAnomalia, error) {
	const q = `
		SELECT a.id, a.identificacao
		FROM gestacoes g
		INNER JOIN animais a ON a.id = g.animal_id
		WHERE g.fazenda_id = $1
		  AND g.status = 'CONFIRMADA'
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
	const q = `
		SELECT a.id, a.identificacao
		FROM restricoes_leite r
		INNER JOIN animais a ON a.id = r.animal_id
		WHERE r.fazenda_id = $1
		  AND r.status = 'AGUARDANDO_LAB'
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
	const q = `
		SELECT a.id, a.identificacao
		FROM animais a
		WHERE a.fazenda_id = $1
		  AND a.status_reprodutivo = 'PRENHE'
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
	const q = `
		SELECT a.id, a.identificacao
		FROM diagnosticos_gestacao d
		INNER JOIN animais a ON a.id = d.animal_id
		WHERE d.fazenda_id = $1
		  AND d.resultado = 'POSITIVO'
		  AND d.cobertura_id IS NULL`
	return s.scanAnimalRows(ctx, q, fazendaID, "INT-006", "ALTA",
		"Toque positivo sem cobertura vinculada (BR-TOQUES-002).")
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
		// queries com COUNT extra ignoram coluna extra via Scan parcial — usar só 2 cols
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
