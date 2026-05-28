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
