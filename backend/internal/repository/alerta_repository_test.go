package repository

import (
	"testing"
	"time"
)

func TestBuildAlertaListWhere_PeriodoOR(t *testing.T) {
	start := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	end := time.Date(2026, 1, 31, 0, 0, 0, 0, time.UTC)

	where, args := buildAlertaListWhere(10, AlertaListFilters{
		Status:      "ABERTO",
		PeriodStart: &start,
		PeriodEnd:   &end,
	})

	if where == "" {
		t.Fatal("expected non-empty where clause")
	}
	if len(args) != 4 {
		t.Fatalf("expected 4 args, got %d", len(args))
	}
	if args[0] != int64(10) {
		t.Fatalf("expected fazenda_id 10, got %v", args[0])
	}
	if args[1] != "ABERTO" {
		t.Fatalf("expected status ABERTO, got %v", args[1])
	}
	if args[2] != start {
		t.Fatalf("unexpected period start: %v", args[2])
	}
	if args[3] != end {
		t.Fatalf("unexpected period end: %v", args[3])
	}
}
