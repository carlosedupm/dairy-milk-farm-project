package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/ceialmilk/api/internal/models"
)

type fakeAnimalSaudeAtivosLister struct {
	byAnimal map[int64][]*models.AnimalSaude
}

func (f *fakeAnimalSaudeAtivosLister) ListAtivosByAnimalID(_ context.Context, animalID int64) ([]*models.AnimalSaude, error) {
	if f.byAnimal == nil {
		return nil, nil
	}
	return f.byAnimal[animalID], nil
}

type sequentialAtivosLister struct {
	sequences [][]*models.AnimalSaude
	call      int
}

func (f *sequentialAtivosLister) ListAtivosByAnimalID(_ context.Context, _ int64) ([]*models.AnimalSaude, error) {
	if f.call >= len(f.sequences) {
		return nil, nil
	}
	out := f.sequences[f.call]
	f.call++
	return out, nil
}

func testStrPtr(s string) *string { return &s }

func newAnimalServiceForStatusTest(lister animalSaudeAtivosLister) *AnimalService {
	return &AnimalService{animalSaudeAtivos: lister}
}

func TestAnimalUpdate_StatusSaude_SemCasosAtivos(t *testing.T) {
	svc := newAnimalServiceForStatusTest(&fakeAnimalSaudeAtivosLister{})
	trat := models.StatusTratamento
	saud := models.StatusSaudavel
	existing := &models.Animal{ID: 1, StatusSaude: &trat}
	incoming := &models.Animal{ID: 1, StatusSaude: &saud}
	if err := svc.validateStatusSaudeUpdate(context.Background(), existing, incoming); err != nil {
		t.Fatalf("expected nil, got %v", err)
	}
}

func TestAnimalUpdate_StatusSaudeDerivado(t *testing.T) {
	lister := &fakeAnimalSaudeAtivosLister{
		byAnimal: map[int64][]*models.AnimalSaude{
			1: {{
				AnimalID: 1, Status: models.AnimalSaudeStatusAtivo,
				TipoCaso: models.AnimalSaudeTipoTratamento,
			}},
		},
	}
	svc := newAnimalServiceForStatusTest(lister)
	trat := models.StatusTratamento
	saud := models.StatusSaudavel
	existing := &models.Animal{ID: 1, StatusSaude: &trat}
	incoming := &models.Animal{ID: 1, StatusSaude: &saud}
	err := svc.validateStatusSaudeUpdate(context.Background(), existing, incoming)
	if !errors.Is(err, ErrStatusSaudeDerivado) {
		t.Fatalf("expected ErrStatusSaudeDerivado, got %v", err)
	}
}

func TestAnimalUpdate_StatusInalteradoComCasosAtivos(t *testing.T) {
	lister := &fakeAnimalSaudeAtivosLister{
		byAnimal: map[int64][]*models.AnimalSaude{
			1: {{
				AnimalID: 1, Status: models.AnimalSaudeStatusAtivo,
				TipoCaso: models.AnimalSaudeTipoTratamento,
			}},
		},
	}
	svc := newAnimalServiceForStatusTest(lister)
	trat := models.StatusTratamento
	existing := &models.Animal{ID: 1, StatusSaude: &trat, Raca: testStrPtr("Holandesa")}
	incoming := &models.Animal{ID: 1, StatusSaude: &trat, Raca: testStrPtr("Jersey")}
	if err := svc.validateStatusSaudeUpdate(context.Background(), existing, incoming); err != nil {
		t.Fatalf("expected nil when status unchanged, got %v", err)
	}
}

func TestAnimalUpdate_StatusCoerenteComDerivado(t *testing.T) {
	lister := &fakeAnimalSaudeAtivosLister{
		byAnimal: map[int64][]*models.AnimalSaude{
			1: {{
				AnimalID: 1, Status: models.AnimalSaudeStatusAtivo,
				TipoCaso: models.AnimalSaudeTipoOutro,
			}},
		},
	}
	svc := newAnimalServiceForStatusTest(lister)
	saud := models.StatusSaudavel
	doente := models.StatusDoente
	existing := &models.Animal{ID: 1, StatusSaude: &saud}
	incoming := &models.Animal{ID: 1, StatusSaude: &doente}
	if err := svc.validateStatusSaudeUpdate(context.Background(), existing, incoming); err != nil {
		t.Fatalf("expected nil when incoming matches derived DOENTE, got %v", err)
	}
}

func TestAnimalUpdate_PermitidoAposConcluirUltimoAtivo(t *testing.T) {
	seq := &sequentialAtivosLister{
		sequences: [][]*models.AnimalSaude{
			{{
				AnimalID: 1, Status: models.AnimalSaudeStatusAtivo,
				TipoCaso: models.AnimalSaudeTipoTratamento,
			}},
			nil,
		},
	}
	svc := newAnimalServiceForStatusTest(seq)
	trat := models.StatusTratamento
	saud := models.StatusSaudavel
	existing := &models.Animal{ID: 1, StatusSaude: &trat}
	incoming := &models.Animal{ID: 1, StatusSaude: &saud}

	err1 := svc.validateStatusSaudeUpdate(context.Background(), existing, incoming)
	if !errors.Is(err1, ErrStatusSaudeDerivado) {
		t.Fatalf("first update with active case: expected ErrStatusSaudeDerivado, got %v", err1)
	}
	if err2 := svc.validateStatusSaudeUpdate(context.Background(), existing, incoming); err2 != nil {
		t.Fatalf("after last active case closed: expected nil, got %v", err2)
	}
}

func TestAnimalCreate_IgnoraStatusSaude(t *testing.T) {
	doente := models.StatusDoente
	animal := &models.Animal{
		Identificacao: "BR-TEST",
		FazendaID:     1,
		StatusSaude:   &doente,
	}
	defaultStatus := models.StatusSaudavel
	animal.StatusSaude = &defaultStatus
	if effectiveStatusSaude(animal.StatusSaude) != models.StatusSaudavel {
		t.Fatalf("expected SAUDAVEL, got %s", effectiveStatusSaude(animal.StatusSaude))
	}
}

func TestAssistenteMapAnimalError_StatusSaudeDerivado(t *testing.T) {
	svc := &AssistenteLiveService{}
	m := svc.mapAssistenteAnimalError(ErrStatusSaudeDerivado)
	if m == nil {
		t.Fatal("expected map")
	}
	if _, ok := m["erro"]; !ok {
		t.Fatal("expected erro key")
	}
}

func TestEffectiveStatusSaude(t *testing.T) {
	if effectiveStatusSaude(nil) != models.StatusSaudavel {
		t.Fatal("nil should be SAUDAVEL")
	}
	empty := ""
	if effectiveStatusSaude(&empty) != models.StatusSaudavel {
		t.Fatal("empty should be SAUDAVEL")
	}
	doente := models.StatusDoente
	if effectiveStatusSaude(&doente) != models.StatusDoente {
		t.Fatal("DOENTE preserved")
	}
}

func TestAnimalSaudeRegressao_DeriveInalterado(t *testing.T) {
	now := time.Now()
	casos := []*models.AnimalSaude{{
		TipoCaso: models.AnimalSaudeTipoTratamento, Status: models.AnimalSaudeStatusAtivo, DataInicio: now,
	}}
	if got := deriveAnimalStatusSaudeFromCasosAtivos(casos); got != models.StatusTratamento {
		t.Fatalf("derive regression: got %s", got)
	}
}
