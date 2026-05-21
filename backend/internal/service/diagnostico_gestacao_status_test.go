package service

import (
	"testing"

	"github.com/ceialmilk/api/internal/models"
)

func TestDiagnosticoNegativo_setsVaziaIntent(t *testing.T) {
	// Documenta expectativa BR-CICLO-002: NEGATIVO → VAZIA (validado em integração com DB).
	if models.DiagnosticoResultadoNegativo != "NEGATIVO" {
		t.Fatal("constante NEGATIVO alterada")
	}
	if models.StatusReprodutivoVazia != "VAZIA" {
		t.Fatal("constante VAZIA alterada")
	}
}
