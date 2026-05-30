package service

import (
	"context"
	"testing"
	"time"

	"github.com/ceialmilk/api/internal/repository"
)

type fakeTimelineRepo struct {
	rows  []repository.TimelineRow
	total int64
	err   error
	last  struct {
		animalID int64
		filter   repository.TimelineFilterTipo
		limit    int
		offset   int
	}
}

func (f *fakeTimelineRepo) ListByAnimal(
	_ context.Context,
	animalID int64,
	filter repository.TimelineFilterTipo,
	limit, offset int,
) ([]repository.TimelineRow, int64, error) {
	f.last.animalID = animalID
	f.last.filter = filter
	f.last.limit = limit
	f.last.offset = offset
	if f.err != nil {
		return nil, 0, f.err
	}
	return f.rows, f.total, nil
}

func TestListTimelinePaginated_mapsRows(t *testing.T) {
	createdBy := int64(5)
	when := time.Date(2026, 5, 10, 12, 0, 0, 0, time.UTC)
	fake := &fakeTimelineRepo{
		rows: []repository.TimelineRow{
			{
				Tipo:      "ALERTA",
				Data:      when,
				Titulo:    "Tratamento vencido",
				Detalhe:   "TRATAMENTO_VENCIDO · ABERTO",
				RefID:     99,
				CreatedBy: &createdBy,
			},
		},
		total: 1,
	}

	svc := &AnimalCicloService{timelineRepo: fake}
	items, total, err := svc.ListTimelinePaginated(context.Background(), 42, repository.TimelineFilterAlertas, 20, 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if total != 1 {
		t.Fatalf("expected total 1, got %d", total)
	}
	if fake.last.filter != repository.TimelineFilterAlertas {
		t.Fatalf("expected alertas filter, got %s", fake.last.filter)
	}
	if len(items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(items))
	}
	item := items[0]
	if item.Tipo != "ALERTA" || item.Titulo != "Tratamento vencido" {
		t.Fatalf("unexpected item: %+v", item)
	}
	if item.RefID != 99 {
		t.Fatalf("expected ref_id 99, got %d", item.RefID)
	}
	if !item.Data.Equal(when) {
		t.Fatalf("unexpected data: %v", item.Data)
	}
}

func TestListTimelinePaginated_nilRepo(t *testing.T) {
	svc := &AnimalCicloService{}
	_, _, err := svc.ListTimelinePaginated(context.Background(), 1, repository.TimelineFilterTodos, 20, 0)
	if err == nil {
		t.Fatal("expected error when timeline repo is nil")
	}
}
