package service

import (
	"testing"
	"time"
)

func TestDiasGestacaoCivis(t *testing.T) {
	confirm := time.Date(2026, 1, 1, 15, 0, 0, 0, time.UTC)
	hoje := time.Date(2026, 3, 2, 0, 0, 0, 0, time.UTC)
	got := diasGestacaoCivis(confirm, hoje)
	if got != 60 {
		t.Fatalf("diasGestacaoCivis() = %d, want 60", got)
	}
	meses := got / diasPorMesGestacao
	if meses != 2 {
		t.Fatalf("meses = %d, want 2", meses)
	}
}

func TestDiasGestacaoCivis_FutureConfirmacao(t *testing.T) {
	confirm := time.Date(2026, 5, 1, 0, 0, 0, 0, time.UTC)
	hoje := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	got := diasGestacaoCivis(confirm, hoje)
	if got != 0 {
		t.Fatalf("diasGestacaoCivis() = %d, want 0 for future confirmation", got)
	}
}
