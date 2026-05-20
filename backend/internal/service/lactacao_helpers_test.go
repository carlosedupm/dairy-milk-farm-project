package service

import (
	"testing"
	"time"
)

func TestDiasLactacaoCivis(t *testing.T) {
	inicio := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	fim := time.Date(2026, 1, 10, 0, 0, 0, 0, time.UTC)
	got := diasLactacaoCivis(inicio, fim)
	if got != 10 {
		t.Fatalf("diasLactacaoCivis() = %d, want 10", got)
	}
}

func TestDiasLactacaoCivis_SameDay(t *testing.T) {
	d := time.Date(2026, 3, 15, 12, 0, 0, 0, time.UTC)
	got := diasLactacaoCivis(d, d)
	if got != 1 {
		t.Fatalf("diasLactacaoCivis same day = %d, want 1", got)
	}
}
