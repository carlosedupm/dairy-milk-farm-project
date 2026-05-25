package service

import (
	"errors"
	"testing"
)

func TestAsIntegridadeCiclo(t *testing.T) {
	err := newIntegridade("INT-002", "teste")
	ie, ok := AsIntegridadeCiclo(err)
	if !ok || ie.IntCodigo != "INT-002" {
		t.Fatalf("expected INT-002, got %+v ok=%v", ie, ok)
	}
	if !errors.Is(err, ie) {
		t.Fatal("errors.As should match CicloIntegridadeError")
	}
}

func TestValidateStatusReprodutivoPrenhe_nilStatus(t *testing.T) {
	if err := ValidateStatusReprodutivoPrenhe(nil, nil, 1, 1, nil); err != nil {
		t.Fatalf("nil status should pass: %v", err)
	}
}
