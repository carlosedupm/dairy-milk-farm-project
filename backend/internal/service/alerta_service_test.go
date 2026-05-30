package service

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/repository"
	"github.com/jackc/pgx/v5"
)

type fakeAlertaRepo struct {
	mu      sync.Mutex
	nextID  int64
	byID    map[int64]*models.AlertaWithNames
	deleted map[int64]bool
}

func newFakeAlertaRepo() *fakeAlertaRepo {
	return &fakeAlertaRepo{
		byID:    map[int64]*models.AlertaWithNames{},
		deleted: map[int64]bool{},
	}
}

func (f *fakeAlertaRepo) seed(a *models.AlertaWithNames) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if a.ID == 0 {
		f.nextID++
		a.ID = f.nextID
	}
	f.byID[a.ID] = a
}

func (f *fakeAlertaRepo) ListByFazenda(_ context.Context, fazendaID int64, _ repository.AlertaListFilters) ([]models.AlertaWithNames, int64, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	var out []models.AlertaWithNames
	for _, a := range f.byID {
		if a.FazendaID == fazendaID && !f.deleted[a.ID] {
			out = append(out, *a)
		}
	}
	return out, int64(len(out)), nil
}

func (f *fakeAlertaRepo) GetByID(_ context.Context, fazendaID, alertaID int64) (*models.AlertaWithNames, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.deleted[alertaID] {
		return nil, pgx.ErrNoRows
	}
	a, ok := f.byID[alertaID]
	if !ok || a.FazendaID != fazendaID {
		return nil, pgx.ErrNoRows
	}
	return a, nil
}

func (f *fakeAlertaRepo) Create(_ context.Context, row *models.Alerta) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.nextID++
	row.ID = f.nextID
	now := time.Now().UTC()
	row.CreatedAt = now
	row.UpdatedAt = now
	f.byID[row.ID] = &models.AlertaWithNames{Alerta: *row}
	return nil
}

func (f *fakeAlertaRepo) UpdateStatus(_ context.Context, fazendaID, alertaID int64, status string, resolvidoPor *int64, resolvidoEm *time.Time) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	a, ok := f.byID[alertaID]
	if !ok || a.FazendaID != fazendaID || f.deleted[alertaID] {
		return pgx.ErrNoRows
	}
	a.Status = status
	a.ResolvidoPor = resolvidoPor
	a.ResolvidoEm = resolvidoEm
	return nil
}

func (f *fakeAlertaRepo) Delete(_ context.Context, fazendaID, alertaID int64) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	a, ok := f.byID[alertaID]
	if !ok || a.FazendaID != fazendaID || f.deleted[alertaID] {
		return pgx.ErrNoRows
	}
	f.deleted[alertaID] = true
	return nil
}

func (f *fakeAlertaRepo) isDeleted(id int64) bool {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.deleted[id]
}

type fakeAlertaAnimalRepo struct {
	animals map[int64]*models.Animal
}

func (f *fakeAlertaAnimalRepo) GetByID(_ context.Context, id int64) (*models.Animal, error) {
	a, ok := f.animals[id]
	if !ok {
		return nil, pgx.ErrNoRows
	}
	return a, nil
}

func newAlertaServiceForTest(alerta *fakeAlertaRepo, animal *fakeAlertaAnimalRepo) *AlertaService {
	return &AlertaService{repo: alerta, animalRepo: animal}
}

func TestAlertaService_Create_Manual_Sucesso(t *testing.T) {
	ctx := context.Background()
	alertaFake := newFakeAlertaRepo()
	svc := newAlertaServiceForTest(alertaFake, &fakeAlertaAnimalRepo{})

	created, err := svc.Create(ctx, CreateAlertaInput{
		FazendaID:  1,
		Tipo:       models.AlertaTipoManual,
		Titulo:     "Verificar curral",
		Severidade: models.AlertaSeveridadeMedia,
		CreatedBy:  5,
	}, models.PerfilGerente)
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if created.Status != models.AlertaStatusAberto {
		t.Fatalf("expected ABERTO, got %s", created.Status)
	}
	if created.Tipo != models.AlertaTipoManual {
		t.Fatalf("expected MANUAL, got %s", created.Tipo)
	}
}

func TestAlertaService_Create_AutomaticoBloqueado(t *testing.T) {
	ctx := context.Background()
	svc := newAlertaServiceForTest(newFakeAlertaRepo(), &fakeAlertaAnimalRepo{})

	_, err := svc.Create(ctx, CreateAlertaInput{
		FazendaID:  1,
		Tipo:       models.AlertaTipoTratamentoVencido,
		Titulo:     "Não permitido",
		Severidade: models.AlertaSeveridadeAlta,
		CreatedBy:  5,
	}, models.PerfilGerente)
	if !errors.Is(err, ErrAlertaSomenteManualCreate) {
		t.Fatalf("expected ErrAlertaSomenteManualCreate, got %v", err)
	}
}

func TestAlertaService_Create_PerfilSemPermissao(t *testing.T) {
	ctx := context.Background()
	svc := newAlertaServiceForTest(newFakeAlertaRepo(), &fakeAlertaAnimalRepo{})

	_, err := svc.Create(ctx, CreateAlertaInput{
		FazendaID:  1,
		Tipo:       models.AlertaTipoManual,
		Titulo:     "Tentativa funcionario",
		Severidade: models.AlertaSeveridadeBaixa,
		CreatedBy:  5,
	}, models.PerfilFuncionario)
	if !errors.Is(err, ErrAlertaForbidden) {
		t.Fatalf("expected ErrAlertaForbidden, got %v", err)
	}
}

func TestAlertaService_UpdateStatus_TransicaoValida(t *testing.T) {
	ctx := context.Background()
	alertaFake := newFakeAlertaRepo()
	alertaFake.seed(&models.AlertaWithNames{
		Alerta: models.Alerta{
			ID:        1,
			FazendaID: 1,
			Tipo:      models.AlertaTipoManual,
			Status:    models.AlertaStatusAberto,
			Titulo:    "Teste",
		},
	})
	svc := newAlertaServiceForTest(alertaFake, &fakeAlertaAnimalRepo{})

	updated, err := svc.UpdateStatus(ctx, 1, 1, UpdateAlertaStatusInput{
		Status:      models.AlertaStatusEmAndamento,
		ActorUserID: 5,
		Perfil:      models.PerfilFuncionario,
	})
	if err != nil {
		t.Fatalf("UpdateStatus: %v", err)
	}
	if updated.Status != models.AlertaStatusEmAndamento {
		t.Fatalf("expected EM_ANDAMENTO, got %s", updated.Status)
	}
}

func TestAlertaService_UpdateStatus_TransicaoInvalida(t *testing.T) {
	ctx := context.Background()
	alertaFake := newFakeAlertaRepo()
	alertaFake.seed(&models.AlertaWithNames{
		Alerta: models.Alerta{
			ID:        1,
			FazendaID: 1,
			Tipo:      models.AlertaTipoManual,
			Status:    models.AlertaStatusResolvido,
			Titulo:    "Resolvido",
		},
	})
	svc := newAlertaServiceForTest(alertaFake, &fakeAlertaAnimalRepo{})

	_, err := svc.UpdateStatus(ctx, 1, 1, UpdateAlertaStatusInput{
		Status:      models.AlertaStatusAberto,
		ActorUserID: 5,
		Perfil:      models.PerfilGerente,
	})
	if !errors.Is(err, ErrAlertaTransicaoInvalida) {
		t.Fatalf("expected ErrAlertaTransicaoInvalida, got %v", err)
	}
}

func TestAlertaService_Delete_SoManual(t *testing.T) {
	ctx := context.Background()
	alertaFake := newFakeAlertaRepo()
	alertaFake.seed(&models.AlertaWithNames{
		Alerta: models.Alerta{
			ID:        1,
			FazendaID: 1,
			Tipo:      models.AlertaTipoTratamentoVencido,
			Status:    models.AlertaStatusAberto,
			Titulo:    "Sistema",
		},
	})
	svc := newAlertaServiceForTest(alertaFake, &fakeAlertaAnimalRepo{})

	err := svc.Delete(ctx, 1, 1, models.PerfilGerente)
	if !errors.Is(err, ErrAlertaSomenteManual) {
		t.Fatalf("expected ErrAlertaSomenteManual, got %v", err)
	}
}

func TestAlertaService_Delete_Manual(t *testing.T) {
	ctx := context.Background()
	alertaFake := newFakeAlertaRepo()
	alertaFake.seed(&models.AlertaWithNames{
		Alerta: models.Alerta{
			ID:        1,
			FazendaID: 1,
			Tipo:      models.AlertaTipoManual,
			Status:    models.AlertaStatusAberto,
			Titulo:    "Manual",
		},
	})
	svc := newAlertaServiceForTest(alertaFake, &fakeAlertaAnimalRepo{})

	if err := svc.Delete(ctx, 1, 1, models.PerfilGerente); err != nil {
		t.Fatalf("Delete: %v", err)
	}
	if !alertaFake.isDeleted(1) {
		t.Fatal("expected alerta to be deleted")
	}
}
