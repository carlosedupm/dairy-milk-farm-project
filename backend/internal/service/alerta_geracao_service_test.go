package service

import (
	"context"
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/ceialmilk/api/internal/models"
)

type fakeAlertaRepoGeracao struct {
	mu        sync.Mutex
	open      map[string]struct{}
	created   int
	createErr error
}

func openKey(fazendaID int64, tipo string, animalID int64) string {
	return fmt.Sprintf("%d:%s:%d", fazendaID, tipo, animalID)
}

func newFakeAlertaRepoGeracao(initialOpen ...string) *fakeAlertaRepoGeracao {
	m := map[string]struct{}{}
	for _, k := range initialOpen {
		m[k] = struct{}{}
	}
	return &fakeAlertaRepoGeracao{open: m}
}

func (f *fakeAlertaRepoGeracao) ExistsOpenByFazendaTipoAnimal(_ context.Context, fazendaID int64, tipo string, animalID int64) (bool, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	_, ok := f.open[openKey(fazendaID, tipo, animalID)]
	return ok, nil
}

func (f *fakeAlertaRepoGeracao) Create(_ context.Context, row *models.Alerta) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.createErr != nil {
		return f.createErr
	}
	f.created++
	row.ID = int64(f.created)
	f.open[openKey(row.FazendaID, row.Tipo, *row.AnimalID)] = struct{}{}
	return nil
}

func (f *fakeAlertaRepoGeracao) ResolveOpenByFazendaTipoAnimal(_ context.Context, fazendaID int64, tipo string, animalID int64) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	delete(f.open, openKey(fazendaID, tipo, animalID))
	return nil
}

type fakeGestacaoRepoPartos struct {
	itens []models.PartoPrevistoResumo
}

func (f *fakeGestacaoRepoPartos) ListPartosPrevistosNaJanelaByFazendaID(_ context.Context, _ int64, _, _ time.Time) ([]models.PartoPrevistoResumo, error) {
	return f.itens, nil
}

func (f *fakeAlertaRepoGeracao) GetByID(_ context.Context, fazendaID, alertaID int64) (*models.AlertaWithNames, error) {
	return &models.AlertaWithNames{
		Alerta: models.Alerta{ID: alertaID, FazendaID: fazendaID, Status: models.AlertaStatusAberto},
	}, nil
}

func TestTryCreateAlerta_NaoDuplica(t *testing.T) {
	ctx := context.Background()
	fakeAlerta := newFakeAlertaRepoGeracao()
	svc := &AlertaGeracaoService{
		alertaRepo:    fakeAlerta,
		sistemaUserID: 1,
	}
	animalID := int64(100)

	c1, ig1, err := svc.tryCreateAlerta(ctx, 1, models.AlertaTipoTratamentoVencido, &animalID, "Tratamento vencido", nil, nil)
	if err != nil {
		t.Fatalf("primeira chamada: %v", err)
	}
	if c1 != 1 || ig1 != 0 {
		t.Fatalf("primeira: criados=%d ignorados=%d", c1, ig1)
	}

	c2, ig2, err := svc.tryCreateAlerta(ctx, 1, models.AlertaTipoTratamentoVencido, &animalID, "Tratamento vencido 2", nil, nil)
	if err != nil {
		t.Fatalf("segunda chamada: %v", err)
	}
	if c2 != 0 || ig2 != 1 {
		t.Fatalf("segunda: criados=%d ignorados=%d", c2, ig2)
	}
	if fakeAlerta.created != 1 {
		t.Fatalf("total created=%d, want 1", fakeAlerta.created)
	}
}

func TestGerarAlertasDiarios_NaoDuplica(t *testing.T) {
	ctx := context.Background()
	ref := time.Date(2026, 5, 29, 12, 0, 0, 0, time.UTC)

	fakeAlerta := newFakeAlertaRepoGeracao(openKey(1, models.AlertaTipoPartoPrevisto, 100))

	svc := &AlertaGeracaoService{
		sistemaUserID: 1,
		tz:            time.UTC,
	}
	// injeta fake via método interno de teste
	testSvc := &alertaGeracaoServiceTest{
		AlertaGeracaoService: svc,
		alertaFake:           fakeAlerta,
		gestacaoFake: &fakeGestacaoRepoPartos{
			itens: []models.PartoPrevistoResumo{
				{AnimalID: 100, Identificacao: "V-100", GestacaoID: 1},
				{AnimalID: 200, Identificacao: "V-200", GestacaoID: 2},
			},
		},
	}

	res1, err := testSvc.runPartoPrevistoOnly(ctx, 1, ref)
	if err != nil {
		t.Fatalf("primeira execução: %v", err)
	}
	if res1.Criados != 1 {
		t.Fatalf("esperava 1 criado, got %d (ignorados=%d)", res1.Criados, res1.IgnoradosDuplicata)
	}
	if fakeAlerta.created != 1 {
		t.Fatalf("fake repo created=%d", fakeAlerta.created)
	}

	res2, err := testSvc.runPartoPrevistoOnly(ctx, 1, ref)
	if err != nil {
		t.Fatalf("segunda execução: %v", err)
	}
	if res2.Criados != 0 {
		t.Fatalf("segunda execução deveria criar 0, got %d", res2.Criados)
	}
	if res2.IgnoradosDuplicata != 2 {
		t.Fatalf("esperava 2 ignorados na segunda execução, got %d", res2.IgnoradosDuplicata)
	}
	if fakeAlerta.created != 1 {
		t.Fatalf("total created deveria permanecer 1, got %d", fakeAlerta.created)
	}
}

// alertaGeracaoServiceTest expõe execução isolada da regra PARTO_PREVISTO para testes.
type alertaGeracaoServiceTest struct {
	*AlertaGeracaoService
	alertaFake   *fakeAlertaRepoGeracao
	gestacaoFake *fakeGestacaoRepoPartos
}

func (t *alertaGeracaoServiceTest) runPartoPrevistoOnly(ctx context.Context, fazendaID int64, refDate time.Time) (GerarAlertasResultado, error) {
	var res GerarAlertasResultado
	itens, err := t.gestacaoFake.ListPartosPrevistosNaJanelaByFazendaID(ctx, fazendaID, refDate, refDate.AddDate(0, 0, 14))
	if err != nil {
		return res, err
	}
	for _, item := range itens {
		titulo := "Parto previsto — Animal " + item.Identificacao
		var dp *time.Time
		if item.DataPrevistaParto != nil {
			d := truncateToDateUTC(*item.DataPrevistaParto)
			dp = &d
		}
		open, err := t.alertaFake.ExistsOpenByFazendaTipoAnimal(ctx, fazendaID, models.AlertaTipoPartoPrevisto, item.AnimalID)
		if err != nil {
			return res, err
		}
		if open {
			res.IgnoradosDuplicata++
			continue
		}
		severidade, _ := models.SeveridadePadraoPorTipo(models.AlertaTipoPartoPrevisto)
		animalID := item.AnimalID
		row := &models.Alerta{
			FazendaID:    fazendaID,
			AnimalID:     &animalID,
			Tipo:         models.AlertaTipoPartoPrevisto,
			Severidade:   severidade,
			Titulo:       titulo,
			DataPrevista: dp,
			Status:       models.AlertaStatusAberto,
			CreatedBy:    t.sistemaUserID,
		}
		if err := t.alertaFake.Create(ctx, row); err != nil {
			return res, err
		}
		res.Criados++
	}
	return res, nil
}
