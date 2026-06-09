package service

import (
	"testing"
	"time"

	"github.com/ceialmilk/api/internal/models"
)

// Garante que Update/Delete de cadastro aplicam o mesmo guarda que ciclo (BR-BAIXA-011).
func TestAnimalCadastroRebanhoGuard_UpdateDelete(t *testing.T) {
	past := time.Date(2020, 1, 1, 0, 0, 0, 0, time.UTC)
	baixado := &models.Animal{ID: 1, DataSaida: &past}
	if err := EnsureAnimalNoRebanho(baixado); err != ErrAnimalForaDoRebanho {
		t.Fatalf("animal baixado: got %v", err)
	}

	ativo := &models.Animal{ID: 2}
	if err := EnsureAnimalNoRebanho(ativo); err != nil {
		t.Fatalf("animal ativo: %v", err)
	}
}
