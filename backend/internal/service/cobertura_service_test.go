package service

import (
	"errors"
	"testing"
	"time"

	"github.com/ceialmilk/api/internal/models"
	"github.com/jackc/pgx/v5/pgconn"
)

func TestRequireCioID(t *testing.T) {
	if err := requireCioID(&models.Cobertura{}); !errors.Is(err, ErrCoberturaCioObrigatorio) {
		t.Fatalf("expected obrigatorio, got %v", err)
	}
	zero := int64(0)
	if err := requireCioID(&models.Cobertura{CioID: &zero}); !errors.Is(err, ErrCoberturaCioObrigatorio) {
		t.Fatalf("expected obrigatorio for 0, got %v", err)
	}
	id := int64(4)
	if err := requireCioID(&models.Cobertura{CioID: &id}); err != nil {
		t.Fatalf("expected nil, got %v", err)
	}
}

func TestCioPertenceCobertura(t *testing.T) {
	cio := &models.Cio{AnimalID: 1, FazendaID: 2}
	ok := &models.Cobertura{AnimalID: 1, FazendaID: 2}
	if err := cioPertenceCobertura(cio, ok); err != nil {
		t.Fatalf("expected match, got %v", err)
	}
	otherAnimal := &models.Cobertura{AnimalID: 9, FazendaID: 2}
	if err := cioPertenceCobertura(cio, otherAnimal); !errors.Is(err, ErrCoberturaCioInvalido) {
		t.Fatalf("expected invalido, got %v", err)
	}
	otherFarm := &models.Cobertura{AnimalID: 1, FazendaID: 8}
	if err := cioPertenceCobertura(cio, otherFarm); !errors.Is(err, ErrCoberturaCioInvalido) {
		t.Fatalf("expected invalido fazenda, got %v", err)
	}
}

func TestStatusAposExclusaoCobertura(t *testing.T) {
	if got := statusAposExclusaoCobertura(true, false); got != models.StatusReprodutivoPrenhe {
		t.Fatalf("prenhe: %s", got)
	}
	if got := statusAposExclusaoCobertura(true, true); got != models.StatusReprodutivoPrenhe {
		t.Fatalf("prenhe wins over aberta: %s", got)
	}
	if got := statusAposExclusaoCobertura(false, true); got != models.StatusReprodutivoServida {
		t.Fatalf("servida: %s", got)
	}
	if got := statusAposExclusaoCobertura(false, false); got != models.StatusReprodutivoVazia {
		t.Fatalf("vazia: %s", got)
	}
}

func TestIsUniqueViolation(t *testing.T) {
	if isUniqueViolation(errors.New("x")) {
		t.Fatal("plain error")
	}
	pgErr := &pgconn.PgError{Code: "23505"}
	if !isUniqueViolation(pgErr) {
		t.Fatal("expected unique")
	}
}

func TestValidateCoberturaAposCio_semVinculoNaoAplica(t *testing.T) {
	// Escritas novas sempre passam cio_id; a função temporal continua a no-op sem vínculo (legado).
	c := &models.Cobertura{Data: time.Now()}
	if err := ValidateCoberturaAposCio(t.Context(), nil, c); err != nil {
		t.Fatalf("expected nil, got %v", err)
	}
}
