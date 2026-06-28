package service

import (
	"testing"
	"time"

	"github.com/ceialmilk/api/internal/models"
)

func TestSecagemPendente(t *testing.T) {
	gest := &models.Gestacao{ID: 1}

	t.Run("seca nunca pendente", func(t *testing.T) {
		if SecagemPendente(models.StatusReprodutivoSeca, gest, false, false) {
			t.Fatal("expected false for SECA")
		}
	})

	t.Run("gestacao sem secagem pendente", func(t *testing.T) {
		if !SecagemPendente(models.StatusReprodutivoPrenhe, gest, false, false) {
			t.Fatal("expected true for PRENHE without secagem")
		}
	})

	t.Run("gestacao com secagem vinculada", func(t *testing.T) {
		if SecagemPendente(models.StatusReprodutivoPrenhe, gest, true, false) {
			t.Fatal("expected false when secagem exists for gestacao")
		}
	})

	t.Run("gestacao com secagem legada apos confirmacao", func(t *testing.T) {
		if SecagemPendente(models.StatusReprodutivoParida, gest, false, true) {
			t.Fatal("expected false when secagem exists since confirmacao")
		}
	})

	t.Run("sem gestacao", func(t *testing.T) {
		if SecagemPendente(models.StatusReprodutivoParida, nil, false, false) {
			t.Fatal("expected false without gestacao")
		}
	})
}

func TestSecagemDuplicada(t *testing.T) {
	gest := &models.Gestacao{ID: 1}

	if !secagemDuplicada(models.StatusReprodutivoSeca, gest, false, false) {
		t.Fatal("expected duplicate for SECA")
	}
	if !secagemDuplicada(models.StatusReprodutivoPrenhe, gest, true, false) {
		t.Fatal("expected duplicate when secagem linked to gestacao")
	}
	if !secagemDuplicada(models.StatusReprodutivoPrenhe, gest, false, true) {
		t.Fatal("expected duplicate when secagem since confirmacao")
	}
	if secagemDuplicada(models.StatusReprodutivoPrenhe, gest, false, false) {
		t.Fatal("expected not duplicate for first secagem")
	}
	if secagemDuplicada(models.StatusReprodutivoParida, nil, false, false) {
		t.Fatal("expected not duplicate without gestacao and not SECA")
	}
}

func TestTruncateToCivilDateUsedForSecagemSince(t *testing.T) {
	confirmacao := time.Date(2026, 3, 10, 15, 30, 0, 0, time.UTC)
	got := TruncateToCivilDate(confirmacao)
	if got.Hour() != 0 || got.Minute() != 0 {
		t.Fatalf("expected civil date truncation, got %v", got)
	}
}
