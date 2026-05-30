package service

import (
	"testing"
	"time"

	"github.com/ceialmilk/api/internal/models"
)

func TestLactacaoCoveringProducaoDate_ativa(t *testing.T) {
	inicio := time.Date(2025, 1, 1, 0, 0, 0, 0, time.Local)
	lact := &models.Lactacao{
		ID:             10,
		AnimalID:       1,
		FazendaID:      99,
		NumeroLactacao: 2,
		DataInicio:     inicio,
	}
	prodDay := time.Date(2025, 3, 15, 10, 0, 0, 0, time.Local)
	got, err := lactacaoCoveringProducaoDate([]*models.Lactacao{lact}, 99, prodDay)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got == nil || got.ID != 10 {
		t.Fatalf("expected lactacao 10, got %+v", got)
	}
}

func TestLactacaoCoveringProducaoDate_encerradaDentroIntervalo(t *testing.T) {
	inicio := time.Date(2024, 1, 1, 0, 0, 0, 0, time.Local)
	fim := time.Date(2024, 6, 30, 0, 0, 0, 0, time.Local)
	lact := &models.Lactacao{
		ID:         20,
		FazendaID:  1,
		DataInicio: inicio,
		DataFim:    &fim,
	}
	prodDay := time.Date(2024, 6, 15, 8, 0, 0, 0, time.Local)
	got, err := lactacaoCoveringProducaoDate([]*models.Lactacao{lact}, 1, prodDay)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got == nil || got.ID != 20 {
		t.Fatalf("expected lactacao 20, got %+v", got)
	}
}

func TestLactacaoCoveringProducaoDate_aposFimTMP006(t *testing.T) {
	inicio := time.Date(2024, 1, 1, 0, 0, 0, 0, time.Local)
	fim := time.Date(2024, 6, 30, 0, 0, 0, 0, time.Local)
	lact := &models.Lactacao{
		ID:         30,
		FazendaID:  1,
		DataInicio: inicio,
		DataFim:    &fim,
	}
	prodDay := time.Date(2024, 7, 1, 8, 0, 0, 0, time.Local)
	got, err := lactacaoCoveringProducaoDate([]*models.Lactacao{lact}, 1, prodDay)
	if err == nil {
		t.Fatal("expected TMP-006")
	}
	if got != nil {
		t.Fatalf("expected nil lactacao, got %+v", got)
	}
	ie, ok := AsIntegridadeCiclo(err)
	if !ok || ie.IntCodigo != "TMP-006" {
		t.Fatalf("expected TMP-006, got %+v", err)
	}
}

func TestLactacaoCoveringProducaoDate_antesInicioRetornaNil(t *testing.T) {
	inicio := time.Date(2025, 6, 1, 0, 0, 0, 0, time.Local)
	lact := &models.Lactacao{ID: 40, FazendaID: 1, DataInicio: inicio}
	prodDay := time.Date(2025, 5, 1, 8, 0, 0, 0, time.Local)
	got, err := lactacaoCoveringProducaoDate([]*models.Lactacao{lact}, 1, prodDay)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got != nil {
		t.Fatalf("expected nil, got %+v", got)
	}
}

func TestProducaoNeedsLactacaoRecalc(t *testing.T) {
	base := time.Date(2025, 3, 1, 12, 0, 0, 0, time.Local)
	existing := &models.ProducaoLeite{AnimalID: 1, DataHora: base, LactacaoID: int64Ptr(5)}
	onlyQty := &models.ProducaoLeite{AnimalID: 1, DataHora: base, Quantidade: 20}
	if producaoNeedsLactacaoRecalc(existing, onlyQty) {
		t.Fatal("quantity-only change should not recalc")
	}
	newAnimal := &models.ProducaoLeite{AnimalID: 2, DataHora: base}
	if !producaoNeedsLactacaoRecalc(existing, newAnimal) {
		t.Fatal("animal change should recalc")
	}
	newDate := &models.ProducaoLeite{AnimalID: 1, DataHora: base.Add(24 * time.Hour)}
	if !producaoNeedsLactacaoRecalc(existing, newDate) {
		t.Fatal("date change should recalc")
	}
}

func int64Ptr(v int64) *int64 {
	return &v
}
