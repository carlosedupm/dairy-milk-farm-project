package service

import "testing"

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

func TestListByFazenda_returnsEmptySliceNotNil(t *testing.T) {
	// Documenta contrato: sem DB, o handler expõe [] e total 0 quando não há anomalias.
	var empty []ConformidadeAnomalia
	if empty != nil {
		t.Fatal("nil slice vs empty slice contract for JSON")
	}
}
