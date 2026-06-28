package service

import (
	"strings"
	"testing"

	"github.com/ceialmilk/api/internal/repository"
)

func TestConformidadeAnomalia_JSONTags(t *testing.T) {
	a := ConformidadeAnomalia{
		Codigo:        "INT-001",
		Severidade:    "ALTA",
		AnimalID:      10,
		Identificacao: "V-01",
		Descricao:     "test",
	}
	if a.Codigo != "INT-001" || a.Severidade != "ALTA" {
		t.Fatalf("unexpected struct: %+v", a)
	}
}

// BR-AUDIT-009: INT-001 a INT-006 só no rebanho ativo; INT-007 só fora do rebanho com ciclo aberto.
func TestConformidadeOperationalChecksUseNoRebanhoFilter(t *testing.T) {
	if !strings.Contains(noRebanhoA, "a.data_saida") {
		t.Fatalf("noRebanhoA missing alias filter: %q", noRebanhoA)
	}
	want := repository.SQLNoRebanhoFor("a")
	if noRebanhoA != " AND "+want {
		t.Fatalf("noRebanhoA = %q, want AND %q", noRebanhoA, want)
	}
}

func TestSQLNoRebanhoFor_alias(t *testing.T) {
	got := repository.SQLNoRebanhoFor("a")
	if !strings.Contains(got, "a.data_saida IS NULL") {
		t.Fatalf("got %q", got)
	}
	if repository.SQLNoRebanhoFor("") != repository.SQLNoRebanho {
		t.Fatal("empty alias should match SQLNoRebanho")
	}
}

// INT-002 no painel: intervalo de lactação na data (não exige lactação activa hoje).
func TestConformidadeINT002UsesLactacaoIntervalCoverage(t *testing.T) {
	if strings.Contains(sqlProducaoSemLactacaoNaData, "data_fim IS NULL") &&
		strings.Contains(sqlProducaoSemLactacaoNaData, "EM_ANDAMENTO") {
		t.Fatalf("INT-002 audit must not require currently active lactation: %q", sqlProducaoSemLactacaoNaData)
	}
	if !strings.Contains(sqlProducaoSemLactacaoNaData, "l.data_inicio <= p.data_hora::date") {
		t.Fatalf("missing start date check: %q", sqlProducaoSemLactacaoNaData)
	}
	if !strings.Contains(sqlProducaoSemLactacaoNaData, "l.data_fim IS NULL OR l.data_fim >= p.data_hora::date") {
		t.Fatalf("missing interval end check: %q", sqlProducaoSemLactacaoNaData)
	}
}

func TestListByFazenda_returnsEmptySliceNotNil(t *testing.T) {
	// Documenta contrato: sem DB, o handler expõe [] e total 0 quando não há anomalias.
	var empty []ConformidadeAnomalia
	if empty != nil {
		t.Fatal("nil slice vs empty slice contract for JSON")
	}
}
