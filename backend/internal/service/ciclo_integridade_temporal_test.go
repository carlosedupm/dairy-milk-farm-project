package service

import (
	"testing"
	"time"

	"github.com/ceialmilk/api/internal/models"
)

func TestValidateDataNaoFutura(t *testing.T) {
	tomorrow := CivilToday().AddDate(0, 0, 1)
	futureErr := ValidateDataNaoFutura(tomorrow)
	if futureErr == nil {
		t.Fatal("expected error for future date")
	}
	ie, ok := AsIntegridadeCiclo(futureErr)
	if !ok || ie.IntCodigo != "TMP-001" {
		t.Fatalf("expected TMP-001, got %+v", futureErr)
	}
	if err := ValidateDataNaoFutura(CivilToday()); err != nil {
		t.Fatalf("today should pass: %v", err)
	}
}

func TestValidateEventoAposReferenciaAnimal_entrada(t *testing.T) {
	ent := time.Date(2024, 6, 1, 0, 0, 0, 0, time.Local)
	animal := &models.Animal{DataEntrada: &ent}
	ev := time.Date(2024, 5, 1, 12, 0, 0, 0, time.Local)
	if err := ValidateEventoAposReferenciaAnimal(animal, ev); err == nil {
		t.Fatal("expected TMP-002")
	}
	ev2 := time.Date(2024, 6, 2, 0, 0, 0, 0, time.Local)
	if err := ValidateEventoAposReferenciaAnimal(animal, ev2); err != nil {
		t.Fatalf("expected ok after entrada: %v", err)
	}
}

func TestValidateAnimalDatasCadastro_nascimentoAposEntrada(t *testing.T) {
	nasc := time.Date(2025, 2, 1, 0, 0, 0, 0, time.Local)
	ent := time.Date(2025, 1, 1, 0, 0, 0, 0, time.Local)
	a := &models.Animal{DataNascimento: &nasc, DataEntrada: &ent}
	if err := ValidateAnimalDatasCadastro(a); err == nil {
		t.Fatal("expected error when nascimento after entrada")
	}
}

func TestTruncateToCivilDate(t *testing.T) {
	t1 := time.Date(2024, 3, 15, 23, 59, 0, 0, time.Local)
	t2 := TruncateToCivilDate(t1)
	if t2.Hour() != 0 || t2.Day() != 15 {
		t.Fatalf("unexpected truncate: %v", t2)
	}
}
