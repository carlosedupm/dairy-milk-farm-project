package service

import (
	"testing"

	"github.com/ceialmilk/api/internal/models"
)

func TestResolveStatusSaudeCriaViva_Saudavel(t *testing.T) {
	vivo := models.CriaCondicaoVivo
	c := &models.Cria{Condicao: vivo}
	if got := resolveStatusSaudeCriaViva(c); got != models.StatusSaudavel {
		t.Fatalf("expected SAUDAVEL, got %s", got)
	}
}

func TestResolveStatusSaudeCriaViva_NaoSaudavelEmTratamento(t *testing.T) {
	flag := true
	emTrat := models.StatusTratamento
	c := &models.Cria{
		Condicao:           models.CriaCondicaoVivo,
		NaoSaudavel:        &flag,
		StatusSaudeInicial: &emTrat,
	}
	if got := resolveStatusSaudeCriaViva(c); got != models.StatusTratamento {
		t.Fatalf("expected EM_TRATAMENTO, got %s", got)
	}
}

func TestResolveStatusSaudeCriaViva_NaoSaudavelDefaultDoente(t *testing.T) {
	flag := true
	c := &models.Cria{
		Condicao:    models.CriaCondicaoVivo,
		NaoSaudavel: &flag,
	}
	if got := resolveStatusSaudeCriaViva(c); got != models.StatusDoente {
		t.Fatalf("expected DOENTE, got %s", got)
	}
}

func TestResolveStatusSaudeCriaViva_NatimortoIgnoraFlag(t *testing.T) {
	flag := true
	emTrat := models.StatusTratamento
	c := &models.Cria{
		Condicao:           models.CriaCondicaoNatimorto,
		NaoSaudavel:        &flag,
		StatusSaudeInicial: &emTrat,
	}
	if got := resolveStatusSaudeCriaViva(c); got != models.StatusSaudavel {
		t.Fatalf("natimorto should ignore flag, got %s", got)
	}
}
