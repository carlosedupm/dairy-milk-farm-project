package service

import (
	"testing"

	"github.com/ceialmilk/api/internal/models"
)

func TestNormalizeDiagnosticoGestacao_classificacaoDerivaResultado(t *testing.T) {
	classificacao := models.ClassificacaoOperacionalPrenha
	d := &models.DiagnosticoGestacao{ClassificacaoOperacional: &classificacao}
	if err := NormalizeDiagnosticoGestacao(d); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if d.Resultado != models.DiagnosticoResultadoPositivo {
		t.Fatalf("expected POSITIVO, got %s", d.Resultado)
	}
}

func TestNormalizeDiagnosticoGestacao_classificacaoInconsistente(t *testing.T) {
	classificacao := models.ClassificacaoOperacionalPrenha
	d := &models.DiagnosticoGestacao{
		Resultado:                models.DiagnosticoResultadoNegativo,
		ClassificacaoOperacional: &classificacao,
	}
	if err := NormalizeDiagnosticoGestacao(d); err == nil {
		t.Fatal("expected inconsistent error")
	}
}

func TestResolveResultadoFromClassificacao_vaziaPEV(t *testing.T) {
	res, ok := models.ResolveResultadoFromClassificacao(models.ClassificacaoOperacionalVaziaPEV)
	if !ok || res != models.DiagnosticoResultadoNegativo {
		t.Fatalf("expected NEGATIVO for VAZIA_PEV, got %s ok=%v", res, ok)
	}
}
