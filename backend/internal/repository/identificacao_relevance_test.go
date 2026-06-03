package repository

import (
	"strings"
	"testing"
)

func TestIdentificacaoRelevanceScore(t *testing.T) {
	tests := []struct {
		name    string
		ident   string
		primary string
		equiv   string
		want    int
	}{
		{"exact brinco", "45", "45", "", RelevanceExact},
		{"prefix brinco", "450", "45", "", RelevancePrefix},
		{"contains brinco", "145", "45", "", RelevanceContains},
		{"exact nome", "Mimosa", "Mimosa", "", RelevanceExact},
		{"contains nome", "Lirio Mimosa", "Mimosa", "", RelevanceContains},
		{"primary exact with equiv", "1", "1", "um", RelevanceExact},
		{"equiv only", "um", "1", "um", RelevanceEquivalent},
		{"prefix beats equiv", "10", "1", "um", RelevancePrefix},
		{"case insensitive exact", "mimosa", "Mimosa", "", RelevanceExact},
		{"case insensitive prefix", "MIMOSA II", "Mimosa", "", RelevancePrefix},
		{"no match", "xyz", "45", "", RelevanceNone},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := IdentificacaoRelevanceScore(tt.ident, tt.primary, tt.equiv)
			if got != tt.want {
				t.Errorf("IdentificacaoRelevanceScore(%q, %q, %q) = %d, want %d", tt.ident, tt.primary, tt.equiv, got, tt.want)
			}
		})
	}
}

func TestBuildAnimalSearchOrderByClause(t *testing.T) {
	orderSQL, args := BuildAnimalSearchOrderByClause("45", "", 2)
	if orderSQL == "" {
		t.Fatal("expected non-empty order clause")
	}
	if !strings.Contains(orderSQL, "data_saida IS NOT NULL AND data_saida <= CURRENT_DATE") {
		t.Fatal("expected order clause to deprioritize animais fora do rebanho")
	}
	if !strings.Contains(orderSQL, "THEN 0") || !strings.Contains(orderSQL, "THEN 1") || !strings.Contains(orderSQL, "THEN 2") {
		t.Fatal("expected relevance tiers 0, 1, 2 in order clause")
	}
	if !strings.Contains(orderSQL, "created_at DESC") {
		t.Fatal("expected created_at DESC tie-breaker")
	}
	if len(args) != 1 || args[0] != "45" {
		t.Fatalf("expected single primary arg, got %v", args)
	}
	if strings.Contains(orderSQL, "THEN 3") {
		t.Fatal("expected no tier 3 when equivalent is empty")
	}

	orderSQL, args = BuildAnimalSearchOrderByClause("1", "um", 0)
	if !strings.Contains(orderSQL, "THEN 3") {
		t.Fatal("expected tier 3 for equivalent match")
	}
	if len(args) != 2 || args[0] != "1" || args[1] != "um" {
		t.Fatalf("expected primary and equivalent args, got %v", args)
	}
}

func TestBuildAnimalListIdentificacaoOrderByClause(t *testing.T) {
	orderSQL, args := BuildAnimalListIdentificacaoOrderByClause("Mimosa", "", 0)
	if strings.Contains(orderSQL, "data_saida") {
		t.Fatal("list order should not include rebanho prefix")
	}
	if !strings.Contains(orderSQL, "created_at DESC") {
		t.Fatal("expected created_at DESC tie-breaker")
	}
	if len(args) != 1 {
		t.Fatalf("expected 1 arg, got %v", args)
	}
}
