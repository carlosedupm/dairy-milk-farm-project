package service

import (
	"strings"
	"testing"
	"time"

	"github.com/ceialmilk/api/internal/models"
)

func TestAppendCasosSaudeToTimeline(t *testing.T) {
	inicio := time.Date(2026, 5, 10, 0, 0, 0, 0, time.UTC)
	obs := "Febre e perda de apetite"
	casos := []*models.AnimalSaude{
		{
			ID:         7,
			TipoCaso:   models.AnimalSaudeTipoTratamento,
			DataInicio: inicio,
			Status:     models.AnimalSaudeStatusAtivo,
			Observacoes: &obs,
			CreatedBy:  ptrInt64(3),
		},
	}

	items := appendCasosSaudeToTimeline(nil, casos)
	if len(items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(items))
	}
	item := items[0]
	if item.Tipo != "SAUDE" {
		t.Fatalf("expected tipo SAUDE, got %s", item.Tipo)
	}
	if item.Titulo != "Tratamento (Ativo)" {
		t.Fatalf("unexpected titulo: %s", item.Titulo)
	}
	if item.RefID != 7 {
		t.Fatalf("expected ref_id 7, got %d", item.RefID)
	}
	if item.Detalhe != obs {
		t.Fatalf("unexpected detalhe: %s", item.Detalhe)
	}
	if item.CreatedBy == nil || *item.CreatedBy != 3 {
		t.Fatalf("expected created_by 3")
	}
}

func TestTruncateTimelineDetalhe(t *testing.T) {
	long := strings.Repeat("a", 130)
	got := truncateTimelineDetalhe(&long)
	if len(got) != 123 || !strings.HasSuffix(got, "…") {
		t.Fatalf("expected truncated detalhe with ellipsis, len=%d", len(got))
	}
}

func ptrInt64(v int64) *int64 {
	return &v
}

func TestPrioritizeProximasAcoes(t *testing.T) {
	acoes := []models.ProximaAcao{
		{Codigo: models.AcaoRegistrarProducao, Label: "Produção"},
		{Codigo: models.AcaoRegistrarParto, Label: "Parto"},
		{Codigo: models.AcaoRegistrarToque, Label: "Toque"},
		{Codigo: models.AcaoRegistrarSecagem, Label: "Secagem"},
	}
	got := prioritizeProximasAcoes(acoes, 2)
	if len(got) != 2 {
		t.Fatalf("expected 2 actions, got %d", len(got))
	}
	if got[0].Codigo != models.AcaoRegistrarParto || got[1].Codigo != models.AcaoRegistrarSecagem {
		t.Fatalf("unexpected order: %s, %s", got[0].Codigo, got[1].Codigo)
	}

	got4 := prioritizeProximasAcoes(acoes, 4)
	if len(got4) != 4 {
		t.Fatalf("expected 4 actions, got %d", len(got4))
	}
	if got4[0].Codigo != models.AcaoRegistrarParto ||
		got4[1].Codigo != models.AcaoRegistrarSecagem ||
		got4[2].Codigo != models.AcaoRegistrarToque ||
		got4[3].Codigo != models.AcaoRegistrarProducao {
		t.Fatalf("unexpected order: %s, %s, %s, %s",
			got4[0].Codigo, got4[1].Codigo, got4[2].Codigo, got4[3].Codigo)
	}
}

func TestBuildProximasAcoesCandidates(t *testing.T) {
	gest := &models.Gestacao{ID: 9}
	lact := &models.Lactacao{ID: 3}

	t.Run("gestacao e lactacao prioriza parto secagem e producao", func(t *testing.T) {
		got := buildProximasAcoesCandidates(1, lact, gest, false, models.StatusReprodutivoPrenhe, true)
		if len(got) != 3 {
			t.Fatalf("expected 3, got %d", len(got))
		}
		if got[0].Codigo != models.AcaoRegistrarParto ||
			got[1].Codigo != models.AcaoRegistrarSecagem ||
			got[2].Codigo != models.AcaoRegistrarProducao {
			t.Fatalf("got %s, %s, %s", got[0].Codigo, got[1].Codigo, got[2].Codigo)
		}
	})

	t.Run("gestacao seca omite secagem mas mantem parto", func(t *testing.T) {
		got := buildProximasAcoesCandidates(1, nil, gest, false, models.StatusReprodutivoSeca, false)
		if len(got) != 1 || got[0].Codigo != models.AcaoRegistrarParto {
			t.Fatalf("got %+v", got)
		}
	})

	t.Run("so lactacao produção", func(t *testing.T) {
		got := buildProximasAcoesCandidates(1, lact, nil, false, models.StatusReprodutivoParida, false)
		if len(got) != 1 || got[0].Codigo != models.AcaoRegistrarProducao {
			t.Fatalf("got %+v", got)
		}
	})

	t.Run("pendente toque sem gestacao", func(t *testing.T) {
		got := buildProximasAcoesCandidates(1, nil, nil, true, models.StatusReprodutivoServida, false)
		if len(got) != 1 || got[0].Codigo != models.AcaoRegistrarToque {
			t.Fatalf("got %+v", got)
		}
	})

	t.Run("servida sem elegibilidade toque", func(t *testing.T) {
		got := buildProximasAcoesCandidates(1, nil, nil, false, models.StatusReprodutivoServida, false)
		if len(got) != 0 {
			t.Fatalf("expected empty, got %+v", got)
		}
	})

	t.Run("vazia sugere cobertura", func(t *testing.T) {
		got := buildProximasAcoesCandidates(1, nil, nil, false, models.StatusReprodutivoVazia, false)
		if len(got) != 1 || got[0].Codigo != models.AcaoRegistrarCobertura {
			t.Fatalf("got %+v", got)
		}
	})
}
