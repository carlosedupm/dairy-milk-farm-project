package service

import (
	"strings"
	"testing"

	"github.com/ceialmilk/api/internal/repository"
)

func TestIsBrincoOrientedTerm(t *testing.T) {
	tests := []struct {
		term string
		want bool
	}{
		{"123", true},
		{"045", true},
		{"Mim", false},
		{"Mimosa", false},
		{"123A", false},
		{"", false},
		{"  456  ", true},
		{"#045", true},
	}
	for _, tt := range tests {
		got := IsBrincoOrientedTerm(tt.term)
		if got != tt.want {
			t.Errorf("IsBrincoOrientedTerm(%q) = %v, want %v", tt.term, got, tt.want)
		}
	}
}

func TestBuildAnimalSearchOrderByClause(t *testing.T) {
	brinco := repository.BuildAnimalSearchOrderByClause(true)
	if brinco == "" {
		t.Fatal("expected non-empty order clause for brinco-oriented search")
	}
	if !strings.Contains(brinco, "data_saida IS NOT NULL AND data_saida <= CURRENT_DATE") {
		t.Fatal("expected order clause to deprioritize animais fora do rebanho")
	}
	nome := repository.BuildAnimalSearchOrderByClause(false)
	if nome == "" || nome == brinco {
		t.Fatal("expected distinct order clause for name-oriented search")
	}
	if !strings.Contains(nome, "data_saida IS NOT NULL AND data_saida <= CURRENT_DATE") {
		t.Fatal("expected order clause to deprioritize animais fora do rebanho")
	}
}
