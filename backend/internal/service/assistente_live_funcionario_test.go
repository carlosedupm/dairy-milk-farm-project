package service

import (
	"context"
	"testing"

	"github.com/ceialmilk/api/internal/models"
	"github.com/google/generative-ai-go/genai"
)

func TestAssistenteLive_ExecuteFunction_Funcionario_ConsultaOnly(t *testing.T) {
	ctx := context.Background()
	svc := assistenteLiveTestSvc(nil)

	res, err := svc.ExecuteFunction(ctx, genai.FunctionCall{
		Name: "cadastrar_animal",
		Args: map[string]any{"identificacao": "V-99"},
	}, 10, models.PerfilFuncionario, 1)
	if err != nil {
		t.Fatalf("ExecuteFunction: %v", err)
	}
	m, ok := res.(map[string]any)
	if !ok {
		t.Fatalf("expected map, got %T", res)
	}
	if _, hasErro := m["erro"]; !hasErro {
		t.Fatalf("expected erro for cadastrar_animal, got %v", m)
	}

	res2, err := svc.ExecuteFunction(ctx, genai.FunctionCall{
		Name: "registrar_producao_animal",
		Args: map[string]any{"identificacao": "V-1", "quantidade": float64(10)},
	}, 10, models.PerfilFuncionario, 1)
	if err != nil {
		t.Fatalf("ExecuteFunction producao: %v", err)
	}
	m2, ok := res2.(map[string]any)
	if !ok || m2["erro"] == nil {
		t.Fatalf("expected erro for registrar_producao_animal, got %v", res2)
	}
}

func TestAssistenteLive_GetFunctionDeclarations_Funcionario_Filtered(t *testing.T) {
	svc := assistenteLiveTestSvc(nil)
	all := svc.getFunctionDeclarations()
	funcionario := svc.getFunctionDeclarationsForPerfil(models.PerfilFuncionario)

	if len(funcionario) >= len(all) {
		t.Fatalf("funcionario tools (%d) should be fewer than all (%d)", len(funcionario), len(all))
	}
	allowed := map[string]bool{
		"listar_animais":     true,
		"detalhar_animal":    true,
		"finalizar_conversa": true,
	}
	for _, fn := range funcionario {
		if !allowed[fn.Name] {
			t.Fatalf("unexpected tool for FUNCIONARIO: %s", fn.Name)
		}
	}
}
