package service

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/repository"
	"github.com/google/generative-ai-go/genai"
)

func TestBuildSaveAnimalSaudeInputFromArgs_DuracaoDias(t *testing.T) {
	dataInicio := time.Date(2026, 5, 30, 0, 0, 0, 0, time.UTC)
	in, errMap, err := buildSaveAnimalSaudeInputFromArgs(map[string]any{
		"tipo_caso":    "TRATAMENTO",
		"observacoes":  "antibiótico",
		"data_inicio":  "2026-05-30",
		"duracao_dias": float64(5),
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if errMap != nil {
		t.Fatalf("unexpected errMap: %v", errMap)
	}
	if in.TipoCaso != models.AnimalSaudeTipoTratamento {
		t.Fatalf("tipo_caso: got %s", in.TipoCaso)
	}
	if in.Status != models.AnimalSaudeStatusAtivo {
		t.Fatalf("status: got %s", in.Status)
	}
	if !in.DataInicio.Equal(dataInicio) {
		t.Fatalf("data_inicio: got %v", in.DataInicio)
	}
	if in.DataFim == nil {
		t.Fatal("expected data_fim")
	}
	expectedFim := dataInicio.AddDate(0, 0, 5)
	if !in.DataFim.Equal(expectedFim) {
		t.Fatalf("data_fim: got %v want %v", *in.DataFim, expectedFim)
	}
	if in.Observacoes == nil || *in.Observacoes != "antibiótico" {
		t.Fatalf("observacoes: got %v", in.Observacoes)
	}
}

func TestBuildSaveAnimalSaudeInputFromArgs_TipoCasoObrigatorio(t *testing.T) {
	_, errMap, err := buildSaveAnimalSaudeInputFromArgs(map[string]any{
		"tipo_caso": "",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if errMap == nil || errMap["erro"] != "tipo_caso é obrigatório" {
		t.Fatalf("expected tipo_caso obrigatório, got %v", errMap)
	}
}

func TestAssistenteLive_RegistrarSaude_CreateViaService(t *testing.T) {
	ctx := context.Background()
	saudeRepo := newFakeAnimalSaudeRepo()
	animal := &models.Animal{
		ID:            22,
		FazendaID:     1,
		Identificacao: "22",
	}
	saudeSvc := newAnimalSaudeServiceForTest(saudeRepo, newFakeAnimalRepoForSaude(map[int64]*models.Animal{22: animal}))

	in, errMap, err := buildSaveAnimalSaudeInputFromArgs(map[string]any{
		"tipo_caso":    "TRATAMENTO",
		"observacoes":  "antibiótico",
		"data_inicio":  "2026-05-30",
		"duracao_dias": float64(5),
	})
	if err != nil || errMap != nil {
		t.Fatalf("build input: err=%v map=%v", err, errMap)
	}
	row, err := saudeSvc.Create(ctx, animal.ID, in)
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if row.Status != models.AnimalSaudeStatusAtivo {
		t.Fatalf("status: %s", row.Status)
	}
	if row.DataFim == nil {
		t.Fatal("expected data_fim")
	}
}

func TestAssistenteLive_RegistrarSaude_TipoInvalido(t *testing.T) {
	ctx := context.Background()
	animal := &models.Animal{ID: 22, FazendaID: 1, Identificacao: "22"}
	saudeSvc := newAnimalSaudeServiceForTest(
		newFakeAnimalSaudeRepo(),
		newFakeAnimalRepoForSaude(map[int64]*models.Animal{22: animal}),
	)
	in, _, _ := buildSaveAnimalSaudeInputFromArgs(map[string]any{
		"tipo_caso":   "INVALIDO",
		"data_inicio": "2026-05-30",
	})
	_, err := saudeSvc.Create(ctx, animal.ID, in)
	if !errors.Is(err, ErrAnimalSaudeTipoCasoInvalido) {
		t.Fatalf("expected ErrAnimalSaudeTipoCasoInvalido, got %v", err)
	}
}

func assistenteLiveTestSvc(alertaSvc *AlertaService) *AssistenteLiveService {
	return &AssistenteLiveService{
		alertaSvc: alertaSvc,
		fazendaAccessFn: func(context.Context, int64, int64) bool {
			return true
		},
	}
}

type alertaRepoWithSeveridadeFilter struct {
	*fakeAlertaRepo
}

func (a *alertaRepoWithSeveridadeFilter) ListByFazenda(ctx context.Context, fazendaID int64, f repository.AlertaListFilters) ([]models.AlertaWithNames, int64, error) {
	list, _, err := a.fakeAlertaRepo.ListByFazenda(ctx, fazendaID, f)
	if err != nil {
		return nil, 0, err
	}
	if f.Severidade == "" {
		return list, int64(len(list)), nil
	}
	var out []models.AlertaWithNames
	for _, row := range list {
		if row.Severidade == f.Severidade {
			out = append(out, row)
		}
	}
	return out, int64(len(out)), nil
}

func TestAssistenteLive_ExecuteFunction_ListarAlertas_Severidade(t *testing.T) {
	ctx := context.Background()
	alertaFake := newFakeAlertaRepo()
	alertaFake.seed(&models.AlertaWithNames{
		Alerta: models.Alerta{
			ID:         1,
			FazendaID:  1,
			Tipo:       models.AlertaTipoTratamentoVencido,
			Severidade: models.AlertaSeveridadeCritica,
			Status:     models.AlertaStatusAberto,
			Titulo:     "Tratamento vencido",
		},
	})
	alertaFake.seed(&models.AlertaWithNames{
		Alerta: models.Alerta{
			ID:         2,
			FazendaID:  1,
			Tipo:       models.AlertaTipoManual,
			Severidade: models.AlertaSeveridadeBaixa,
			Status:     models.AlertaStatusAberto,
			Titulo:     "Manual baixo",
		},
	})

	filteredRepo := &alertaRepoWithSeveridadeFilter{fakeAlertaRepo: alertaFake}
	svc := assistenteLiveTestSvc(&AlertaService{repo: filteredRepo, animalRepo: &fakeAlertaAnimalRepo{}})

	result, err := svc.ExecuteFunction(ctx, genai.FunctionCall{
		Name: "listar_alertas",
		Args: map[string]any{
			"fazenda_id": float64(1),
			"severidade": "CRITICA",
		},
	}, 10, models.PerfilGerente, 1)
	if err != nil {
		t.Fatalf("ExecuteFunction: %v", err)
	}
	m, ok := result.(map[string]any)
	if !ok {
		t.Fatalf("expected map result, got %T", result)
	}
	if m["status"] != "sucesso" {
		t.Fatalf("status: %v", m["status"])
	}
	lista, _ := m["lista_alertas"].(string)
	if !strings.Contains(lista, "#1") || !strings.Contains(lista, "CRITICA") || !strings.Contains(lista, "Tratamento vencido") {
		t.Fatalf("lista_alertas: %q", lista)
	}
	if strings.Contains(lista, "Manual baixo") {
		t.Fatalf("should not include BAIXA alert: %q", lista)
	}
}

func TestAssistenteLive_ExecuteFunction_ResolverAlerta_RBAC(t *testing.T) {
	ctx := context.Background()
	alertaFake := newFakeAlertaRepo()
	alertaFake.seed(&models.AlertaWithNames{
		Alerta: models.Alerta{
			ID:        5,
			FazendaID: 1,
			Tipo:      models.AlertaTipoManual,
			Status:    models.AlertaStatusAberto,
			Titulo:    "Resolver teste",
		},
	})
	svc := assistenteLiveTestSvc(newAlertaServiceForTest(alertaFake, &fakeAlertaAnimalRepo{}))

	resGerente, err := svc.ExecuteFunction(ctx, genai.FunctionCall{
		Name: "resolver_alerta",
		Args: map[string]any{
			"alerta_id": float64(5),
			"status":    "RESOLVIDO",
		},
	}, 10, models.PerfilGerente, 1)
	if err != nil {
		t.Fatalf("gerente ExecuteFunction: %v", err)
	}
	mG, ok := resGerente.(map[string]any)
	if !ok || mG["status"] != "sucesso" {
		t.Fatalf("gerente expected sucesso, got %v", resGerente)
	}

	alertaFake.seed(&models.AlertaWithNames{
		Alerta: models.Alerta{
			ID:        6,
			FazendaID: 1,
			Tipo:      models.AlertaTipoManual,
			Status:    models.AlertaStatusAberto,
			Titulo:    "Funcionario teste",
		},
	})

	resFunc, err := svc.ExecuteFunction(ctx, genai.FunctionCall{
		Name: "resolver_alerta",
		Args: map[string]any{
			"alerta_id": float64(6),
			"status":    "RESOLVIDO",
		},
	}, 10, models.PerfilFuncionario, 1)
	if err != nil {
		t.Fatalf("funcionario ExecuteFunction: %v", err)
	}
	mF, ok := resFunc.(map[string]any)
	if !ok {
		t.Fatalf("expected map, got %T", resFunc)
	}
	if mF["erro"] == nil {
		t.Fatal("expected erro for FUNCIONARIO resolving alert")
	}
}
