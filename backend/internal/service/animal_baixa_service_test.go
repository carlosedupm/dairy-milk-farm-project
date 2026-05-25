package service

import (
	"testing"
	"time"

	"github.com/ceialmilk/api/internal/models"
)

func TestValidateBaixaRequest(t *testing.T) {
	d, err := ValidateBaixaRequest("2026-05-20", models.MotivoSaidaMorte)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if d.Format("2006-01-02") != "2026-05-20" {
		t.Fatalf("got date %s", d.Format("2006-01-02"))
	}
	if _, err := ValidateBaixaRequest("", models.MotivoSaidaVenda); err == nil {
		t.Fatal("expected error for empty date")
	}
	future := CivilToday().AddDate(0, 0, 2).Format("2006-01-02")
	_, errFuture := ValidateBaixaRequest(future, models.MotivoSaidaVenda)
	if errFuture == nil {
		t.Fatal("expected error for future data_saida")
	}
	ie, ok := AsIntegridadeCiclo(errFuture)
	if !ok || ie.IntCodigo != "TMP-001" {
		t.Fatalf("expected TMP-001, got %+v", errFuture)
	}
}

func TestIsDataSaidaEfetiva(t *testing.T) {
	past := time.Date(2020, 1, 1, 0, 0, 0, 0, time.UTC)
	if !models.IsDataSaidaEfetiva(&past) {
		t.Fatal("expected past date to be effective")
	}
	future := time.Now().AddDate(0, 0, 10)
	if models.IsDataSaidaEfetiva(&future) {
		t.Fatal("future exit should not be effective yet")
	}
	if models.IsDataSaidaEfetiva(nil) {
		t.Fatal("nil should not be effective")
	}
}

func TestEnsureAnimalNoRebanho(t *testing.T) {
	a := &models.Animal{DataSaida: ptrTime(time.Date(2020, 1, 1, 0, 0, 0, 0, time.UTC))}
	if err := EnsureAnimalNoRebanho(a); err != ErrAnimalForaDoRebanho {
		t.Fatalf("got %v", err)
	}
	a2 := &models.Animal{}
	if err := EnsureAnimalNoRebanho(a2); err != nil {
		t.Fatalf("active animal: %v", err)
	}
}

func ptrTime(t time.Time) *time.Time {
	return &t
}
