package repository

import (
	"fmt"
	"strings"
)

const (
	RelevanceExact      = 0
	RelevancePrefix     = 1
	RelevanceContains   = 2
	RelevanceEquivalent = 3
	RelevanceNone       = 4
)

// IdentificacaoRelevanceScore classifica a relevância de ident em relação ao termo principal e equivalente.
// Espelha a lógica SQL de buildIdentificacaoRelevanceOrderSQL (0=exato, 1=prefixo, 2=contains, 3=equivalente).
func IdentificacaoRelevanceScore(ident, primary, equiv string) int {
	primary = strings.TrimSpace(primary)
	equiv = strings.TrimSpace(equiv)
	if strings.EqualFold(equiv, primary) {
		equiv = ""
	}

	identLower := strings.ToLower(ident)
	primaryLower := strings.ToLower(primary)

	if primary != "" {
		if strings.EqualFold(ident, primary) {
			return RelevanceExact
		}
		if strings.HasPrefix(identLower, primaryLower) {
			return RelevancePrefix
		}
		if strings.Contains(identLower, primaryLower) {
			return RelevanceContains
		}
	}
	if equiv != "" {
		if strings.Contains(identLower, strings.ToLower(equiv)) {
			return RelevanceEquivalent
		}
	}
	return RelevanceNone
}

func buildIdentificacaoRelevanceOrderSQL(primaryArgIdx, equivalentArgIdx int, hasEquivalent bool) string {
	primary := fmt.Sprintf("$%d", primaryArgIdx)
	parts := []string{
		fmt.Sprintf("WHEN LOWER(identificacao) = LOWER(%s) THEN %d", primary, RelevanceExact),
		fmt.Sprintf("WHEN identificacao ILIKE %s || '%%' THEN %d", primary, RelevancePrefix),
		fmt.Sprintf("WHEN identificacao ILIKE '%%' || %s || '%%' THEN %d", primary, RelevanceContains),
	}
	if hasEquivalent {
		equiv := fmt.Sprintf("$%d", equivalentArgIdx)
		parts = append(parts, fmt.Sprintf("WHEN identificacao ILIKE '%%' || %s || '%%' THEN %d", equiv, RelevanceEquivalent))
	}
	parts = append(parts, fmt.Sprintf("ELSE %d", RelevanceNone))
	return "CASE " + strings.Join(parts, " ") + " END"
}

func buildIdentificacaoRelevanceOrderArgs(primaryTerm, equivalentTerm string, argOffset int) (scoreSQL string, extraArgs []interface{}) {
	primaryTerm = strings.TrimSpace(primaryTerm)
	equivalentTerm = strings.TrimSpace(equivalentTerm)
	if strings.EqualFold(equivalentTerm, primaryTerm) {
		equivalentTerm = ""
	}

	hasEquivalent := equivalentTerm != ""
	extraArgs = append(extraArgs, primaryTerm)
	primaryIdx := argOffset + 1
	equivIdx := argOffset + 1
	if hasEquivalent {
		extraArgs = append(extraArgs, equivalentTerm)
		equivIdx = argOffset + 2
	}
	scoreSQL = buildIdentificacaoRelevanceOrderSQL(primaryIdx, equivIdx, hasEquivalent)
	return scoreSQL, extraArgs
}

// sqlAnimalSearchRebanhoOrderPrefix coloca animais fora do rebanho (BR-BAIXA-002) após os no rebanho.
const sqlAnimalSearchRebanhoOrderPrefix = `CASE WHEN data_saida IS NOT NULL AND data_saida <= CURRENT_DATE THEN 1 ELSE 0 END`

// BuildAnimalSearchOrderByClause ordena busca global: rebanho → relevância → created_at DESC.
func BuildAnimalSearchOrderByClause(primaryTerm, equivalentTerm string, argOffset int) (orderSQL string, extraArgs []interface{}) {
	scoreSQL, extraArgs := buildIdentificacaoRelevanceOrderArgs(primaryTerm, equivalentTerm, argOffset)
	orderSQL = sqlAnimalSearchRebanhoOrderPrefix + ", " + scoreSQL + ", created_at DESC"
	return orderSQL, extraArgs
}

// BuildAnimalListIdentificacaoOrderByClause ordena listagem com filtro identificacao: relevância → created_at DESC.
func BuildAnimalListIdentificacaoOrderByClause(primaryTerm, equivalentTerm string, argOffset int) (orderSQL string, extraArgs []interface{}) {
	scoreSQL, extraArgs := buildIdentificacaoRelevanceOrderArgs(primaryTerm, equivalentTerm, argOffset)
	orderSQL = scoreSQL + ", created_at DESC"
	return orderSQL, extraArgs
}
