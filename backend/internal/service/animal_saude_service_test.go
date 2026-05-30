package service

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/ceialmilk/api/internal/models"
	"github.com/jackc/pgx/v5"
)

type fakeAnimalSaudeRepo struct {
	mu     sync.Mutex
	casos  []*models.AnimalSaude
	nextID int64
}

func newFakeAnimalSaudeRepo() *fakeAnimalSaudeRepo {
	return &fakeAnimalSaudeRepo{}
}

func (f *fakeAnimalSaudeRepo) ListByAnimalID(_ context.Context, animalID int64) ([]*models.AnimalSaude, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	var out []*models.AnimalSaude
	for _, c := range f.casos {
		if c.AnimalID == animalID {
			out = append(out, c)
		}
	}
	return out, nil
}

func (f *fakeAnimalSaudeRepo) ListAtivosByAnimalID(_ context.Context, animalID int64) ([]*models.AnimalSaude, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	var out []*models.AnimalSaude
	for _, c := range f.casos {
		if c.AnimalID == animalID && c.Status == models.AnimalSaudeStatusAtivo {
			out = append(out, c)
		}
	}
	return out, nil
}

func (f *fakeAnimalSaudeRepo) GetByID(_ context.Context, animalID, saudeID int64) (*models.AnimalSaude, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	for _, c := range f.casos {
		if c.AnimalID == animalID && c.ID == saudeID {
			return c, nil
		}
	}
	return nil, pgx.ErrNoRows
}

func (f *fakeAnimalSaudeRepo) Create(_ context.Context, row *models.AnimalSaude) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.nextID++
	row.ID = f.nextID
	f.casos = append(f.casos, row)
	return nil
}

func (f *fakeAnimalSaudeRepo) Update(_ context.Context, row *models.AnimalSaude) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	for i, c := range f.casos {
		if c.ID == row.ID && c.AnimalID == row.AnimalID {
			f.casos[i] = row
			return nil
		}
	}
	return pgx.ErrNoRows
}

func (f *fakeAnimalSaudeRepo) Delete(_ context.Context, animalID, saudeID int64) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	for i, c := range f.casos {
		if c.AnimalID == animalID && c.ID == saudeID {
			f.casos = append(f.casos[:i], f.casos[i+1:]...)
			return nil
		}
	}
	return pgx.ErrNoRows
}

type fakeAnimalRepoForSaude struct {
	mu         sync.Mutex
	animals    map[int64]*models.Animal
	lastStatus map[int64]string
}

func newFakeAnimalRepoForSaude(animals map[int64]*models.Animal) *fakeAnimalRepoForSaude {
	if animals == nil {
		animals = map[int64]*models.Animal{}
	}
	return &fakeAnimalRepoForSaude{
		animals:    animals,
		lastStatus: map[int64]string{},
	}
}

func (f *fakeAnimalRepoForSaude) GetByID(_ context.Context, id int64) (*models.Animal, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	a, ok := f.animals[id]
	if !ok {
		return nil, pgx.ErrNoRows
	}
	return a, nil
}

func (f *fakeAnimalRepoForSaude) UpdateStatusSaude(_ context.Context, animalID int64, status *string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if status != nil {
		f.lastStatus[animalID] = *status
	}
	return nil
}

func (f *fakeAnimalRepoForSaude) statusOf(animalID int64) string {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.lastStatus[animalID]
}

type fakeAlertaAutoResolver struct {
	mu    sync.Mutex
	calls []struct {
		fazendaID int64
		animalID  int64
		tipo      string
	}
	err error
}

func (f *fakeAlertaAutoResolver) ResolveOpenByAnimal(_ context.Context, fazendaID, animalID int64, tipo string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.calls = append(f.calls, struct {
		fazendaID int64
		animalID  int64
		tipo      string
	}{fazendaID, animalID, tipo})
	return f.err
}

func (f *fakeAlertaAutoResolver) lastCall() (fazendaID, animalID int64, tipo string, ok bool) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if len(f.calls) == 0 {
		return 0, 0, "", false
	}
	c := f.calls[len(f.calls)-1]
	return c.fazendaID, c.animalID, c.tipo, true
}

func animalAtivoNoRebanho(id, fazendaID int64) *models.Animal {
	return &models.Animal{ID: id, FazendaID: fazendaID, Identificacao: "V-001"}
}

func animalBaixado(id, fazendaID int64) *models.Animal {
	saida := time.Date(2020, 1, 1, 0, 0, 0, 0, time.UTC)
	return &models.Animal{ID: id, FazendaID: fazendaID, Identificacao: "V-BAIXA", DataSaida: &saida}
}

func newAnimalSaudeServiceForTest(saude *fakeAnimalSaudeRepo, animal *fakeAnimalRepoForSaude) *AnimalSaudeService {
	return &AnimalSaudeService{repo: saude, animalRepo: animal}
}

func validSaudeInput() SaveAnimalSaudeInput {
	inicio := time.Date(2026, 5, 28, 0, 0, 0, 0, time.UTC)
	return SaveAnimalSaudeInput{
		TipoCaso:   models.AnimalSaudeTipoPreventivo,
		DataInicio: inicio,
		Status:     models.AnimalSaudeStatusAtivo,
	}
}

func TestAnimalSaude_Create_Sucesso(t *testing.T) {
	ctx := context.Background()
	const animalID int64 = 10
	saudeFake := newFakeAnimalSaudeRepo()
	animalFake := newFakeAnimalRepoForSaude(map[int64]*models.Animal{
		animalID: animalAtivoNoRebanho(animalID, 1),
	})
	svc := newAnimalSaudeServiceForTest(saudeFake, animalFake)

	row, err := svc.Create(ctx, animalID, validSaudeInput())
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if row.ID == 0 {
		t.Fatal("expected caso with ID assigned")
	}
	if got := animalFake.statusOf(animalID); got != models.StatusDoente {
		t.Fatalf("expected status %s, got %s", models.StatusDoente, got)
	}
}

func TestAnimalSaude_Create_AnimalInexistente(t *testing.T) {
	ctx := context.Background()
	svc := newAnimalSaudeServiceForTest(newFakeAnimalSaudeRepo(), newFakeAnimalRepoForSaude(nil))

	_, err := svc.Create(ctx, 999, validSaudeInput())
	if !errors.Is(err, ErrAnimalNotFound) {
		t.Fatalf("expected ErrAnimalNotFound, got %v", err)
	}
}

func TestAnimalSaude_Create_AnimalBaixado(t *testing.T) {
	ctx := context.Background()
	const animalID int64 = 10
	svc := newAnimalSaudeServiceForTest(
		newFakeAnimalSaudeRepo(),
		newFakeAnimalRepoForSaude(map[int64]*models.Animal{
			animalID: animalBaixado(animalID, 1),
		}),
	)

	_, err := svc.Create(ctx, animalID, validSaudeInput())
	if !errors.Is(err, ErrAnimalForaDoRebanho) {
		t.Fatalf("expected ErrAnimalForaDoRebanho, got %v", err)
	}
}

func TestAnimalSaude_Create_DataFimAnteriorInicio(t *testing.T) {
	ctx := context.Background()
	const animalID int64 = 10
	svc := newAnimalSaudeServiceForTest(
		newFakeAnimalSaudeRepo(),
		newFakeAnimalRepoForSaude(map[int64]*models.Animal{
			animalID: animalAtivoNoRebanho(animalID, 1),
		}),
	)
	inicio := time.Date(2026, 5, 28, 0, 0, 0, 0, time.UTC)
	fim := inicio.AddDate(0, 0, -1)
	in := validSaudeInput()
	in.DataFim = &fim

	_, err := svc.Create(ctx, animalID, in)
	if !errors.Is(err, ErrAnimalSaudeDataFimInvalida) {
		t.Fatalf("expected ErrAnimalSaudeDataFimInvalida, got %v", err)
	}
}

func TestAnimalSaude_Update_StatusConcluido(t *testing.T) {
	ctx := context.Background()
	const animalID int64 = 10
	saudeFake := newFakeAnimalSaudeRepo()
	animalFake := newFakeAnimalRepoForSaude(map[int64]*models.Animal{
		animalID: animalAtivoNoRebanho(animalID, 1),
	})
	saudeFake.casos = []*models.AnimalSaude{{
		ID:         1,
		AnimalID:   animalID,
		TipoCaso:   models.AnimalSaudeTipoPreventivo,
		DataInicio: time.Date(2026, 5, 1, 0, 0, 0, 0, time.UTC),
		Status:     models.AnimalSaudeStatusAtivo,
	}}
	svc := newAnimalSaudeServiceForTest(saudeFake, animalFake)

	in := validSaudeInput()
	in.Status = models.AnimalSaudeStatusConcluido
	_, err := svc.Update(ctx, animalID, 1, in)
	if err != nil {
		t.Fatalf("Update: %v", err)
	}
	if got := animalFake.statusOf(animalID); got != models.StatusSaudavel {
		t.Fatalf("expected %s after conclude, got %s", models.StatusSaudavel, got)
	}
}

func TestAnimalSaude_Delete_UltimoCasoAtivo(t *testing.T) {
	ctx := context.Background()
	const animalID int64 = 10
	saudeFake := newFakeAnimalSaudeRepo()
	animalFake := newFakeAnimalRepoForSaude(map[int64]*models.Animal{
		animalID: animalAtivoNoRebanho(animalID, 1),
	})
	saudeFake.casos = []*models.AnimalSaude{{
		ID:         1,
		AnimalID:   animalID,
		TipoCaso:   models.AnimalSaudeTipoPreventivo,
		DataInicio: time.Date(2026, 5, 1, 0, 0, 0, 0, time.UTC),
		Status:     models.AnimalSaudeStatusAtivo,
	}}
	svc := newAnimalSaudeServiceForTest(saudeFake, animalFake)

	if err := svc.Delete(ctx, animalID, 1); err != nil {
		t.Fatalf("Delete: %v", err)
	}
	if got := animalFake.statusOf(animalID); got != models.StatusSaudavel {
		t.Fatalf("expected %s after delete, got %s", models.StatusSaudavel, got)
	}
}

func TestAnimalSaude_Sync_StatusSaude(t *testing.T) {
	ctx := context.Background()
	const animalID int64 = 10
	saudeFake := newFakeAnimalSaudeRepo()
	animalFake := newFakeAnimalRepoForSaude(map[int64]*models.Animal{
		animalID: animalAtivoNoRebanho(animalID, 1),
	})
	svc := newAnimalSaudeServiceForTest(saudeFake, animalFake)

	in := validSaudeInput()
	in.TipoCaso = models.AnimalSaudeTipoTratamento
	in.Status = models.AnimalSaudeStatusAtivo
	if _, err := svc.Create(ctx, animalID, in); err != nil {
		t.Fatalf("Create: %v", err)
	}
	if got := animalFake.statusOf(animalID); got != models.StatusTratamento {
		t.Fatalf("expected %s, got %s", models.StatusTratamento, got)
	}
}

func TestAnimalSaude_Update_ConcluirTratamento_ResolveAlerta(t *testing.T) {
	ctx := context.Background()
	const animalID int64 = 10
	const fazendaID int64 = 1
	saudeFake := newFakeAnimalSaudeRepo()
	animalFake := newFakeAnimalRepoForSaude(map[int64]*models.Animal{
		animalID: animalAtivoNoRebanho(animalID, fazendaID),
	})
	saudeFake.casos = []*models.AnimalSaude{{
		ID:         1,
		AnimalID:   animalID,
		TipoCaso:   models.AnimalSaudeTipoTratamento,
		DataInicio: time.Date(2026, 5, 1, 0, 0, 0, 0, time.UTC),
		Status:     models.AnimalSaudeStatusAtivo,
	}}
	resolver := &fakeAlertaAutoResolver{}
	svc := newAnimalSaudeServiceForTest(saudeFake, animalFake)
	svc.SetAlertaAutoResolver(resolver)

	in := SaveAnimalSaudeInput{
		TipoCaso:   models.AnimalSaudeTipoTratamento,
		DataInicio: time.Date(2026, 5, 1, 0, 0, 0, 0, time.UTC),
		Status:     models.AnimalSaudeStatusConcluido,
	}
	if _, err := svc.Update(ctx, animalID, 1, in); err != nil {
		t.Fatalf("Update: %v", err)
	}
	fid, aid, tipo, ok := resolver.lastCall()
	if !ok {
		t.Fatal("expected ResolveOpenByAnimal to be called")
	}
	if fid != fazendaID || aid != animalID || tipo != models.AlertaTipoTratamentoVencido {
		t.Fatalf("unexpected resolve args: fazenda=%d animal=%d tipo=%s", fid, aid, tipo)
	}
}

func TestAnimalSaude_Update_ConcluirTratamento_ResolverErroSemPanic(t *testing.T) {
	ctx := context.Background()
	const animalID int64 = 10
	saudeFake := newFakeAnimalSaudeRepo()
	animalFake := newFakeAnimalRepoForSaude(map[int64]*models.Animal{
		animalID: animalAtivoNoRebanho(animalID, 1),
	})
	saudeFake.casos = []*models.AnimalSaude{{
		ID:         1,
		AnimalID:   animalID,
		TipoCaso:   models.AnimalSaudeTipoTratamento,
		DataInicio: time.Date(2026, 5, 1, 0, 0, 0, 0, time.UTC),
		Status:     models.AnimalSaudeStatusAtivo,
	}}
	resolver := &fakeAlertaAutoResolver{err: errors.New("resolver indisponivel")}
	svc := newAnimalSaudeServiceForTest(saudeFake, animalFake)
	svc.SetAlertaAutoResolver(resolver)

	in := SaveAnimalSaudeInput{
		TipoCaso:   models.AnimalSaudeTipoTratamento,
		DataInicio: time.Date(2026, 5, 1, 0, 0, 0, 0, time.UTC),
		Status:     models.AnimalSaudeStatusConcluido,
	}
	if _, err := svc.Update(ctx, animalID, 1, in); err != nil {
		t.Fatalf("Update should succeed despite resolver error: %v", err)
	}
}

func TestDeriveAnimalStatusSaudeFromCasosAtivos(t *testing.T) {
	tests := []struct {
		name     string
		casos    []*models.AnimalSaude
		expected string
	}{
		{
			name:     "sem casos ativos vira saudavel",
			casos:    []*models.AnimalSaude{},
			expected: models.StatusSaudavel,
		},
		{
			name: "somente preventivo ativo vira doente",
			casos: []*models.AnimalSaude{
				{TipoCaso: models.AnimalSaudeTipoPreventivo, Status: models.AnimalSaudeStatusAtivo},
			},
			expected: models.StatusDoente,
		},
		{
			name: "tratamento ativo vira em tratamento",
			casos: []*models.AnimalSaude{
				{TipoCaso: models.AnimalSaudeTipoTratamento, Status: models.AnimalSaudeStatusAtivo},
			},
			expected: models.StatusTratamento,
		},
		{
			name: "cirurgia ativa vira em tratamento",
			casos: []*models.AnimalSaude{
				{TipoCaso: models.AnimalSaudeTipoCirurgia, Status: models.AnimalSaudeStatusAtivo},
			},
			expected: models.StatusTratamento,
		},
		{
			name: "qualquer caso com tratamento tem prioridade",
			casos: []*models.AnimalSaude{
				{TipoCaso: models.AnimalSaudeTipoPreventivo, Status: models.AnimalSaudeStatusAtivo},
				{TipoCaso: models.AnimalSaudeTipoTratamento, Status: models.AnimalSaudeStatusAtivo},
			},
			expected: models.StatusTratamento,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := deriveAnimalStatusSaudeFromCasosAtivos(tc.casos)
			if got != tc.expected {
				t.Fatalf("expected %s, got %s", tc.expected, got)
			}
		})
	}
}

func TestValidateAnimalSaudeInput(t *testing.T) {
	inicio := time.Date(2026, 5, 28, 10, 0, 0, 0, time.UTC)
	fimValido := inicio.AddDate(0, 0, 2)
	fimInvalido := inicio.AddDate(0, 0, -1)

	tests := []struct {
		name    string
		input   SaveAnimalSaudeInput
		wantErr error
	}{
		{
			name: "input valido",
			input: SaveAnimalSaudeInput{
				TipoCaso:   models.AnimalSaudeTipoPreventivo,
				DataInicio: inicio,
				DataFim:    &fimValido,
				Status:     models.AnimalSaudeStatusAtivo,
			},
		},
		{
			name: "tipo invalido",
			input: SaveAnimalSaudeInput{
				TipoCaso:   "X",
				DataInicio: inicio,
				Status:     models.AnimalSaudeStatusAtivo,
			},
			wantErr: ErrAnimalSaudeTipoCasoInvalido,
		},
		{
			name: "status invalido",
			input: SaveAnimalSaudeInput{
				TipoCaso:   models.AnimalSaudeTipoOutro,
				DataInicio: inicio,
				Status:     "X",
			},
			wantErr: ErrAnimalSaudeStatusInvalido,
		},
		{
			name: "data fim antes do inicio",
			input: SaveAnimalSaudeInput{
				TipoCaso:   models.AnimalSaudeTipoOutro,
				DataInicio: inicio,
				DataFim:    &fimInvalido,
				Status:     models.AnimalSaudeStatusConcluido,
			},
			wantErr: ErrAnimalSaudeDataFimInvalida,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			err := validateAnimalSaudeInput(tc.input)
			if tc.wantErr == nil && err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if tc.wantErr != nil && err != tc.wantErr {
				t.Fatalf("expected error %v, got %v", tc.wantErr, err)
			}
		})
	}
}
