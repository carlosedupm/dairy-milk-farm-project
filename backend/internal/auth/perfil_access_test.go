package auth

import (
	"net/http"
	"testing"

	"github.com/ceialmilk/api/internal/models"
)

func TestRequestAllowedForFuncionario_Crias(t *testing.T) {
	t.Parallel()

	tests := []struct {
		method string
		path   string
		want   bool
	}{
		{http.MethodGet, "/api/v1/crias", true},
		{http.MethodPost, "/api/v1/crias", true},
		{http.MethodDelete, "/api/v1/crias", false},
		{http.MethodPut, "/api/v1/crias/1", false},
		{http.MethodPatch, "/api/v1/crias", false},
	}

	for _, tt := range tests {
		t.Run(tt.method+" "+tt.path, func(t *testing.T) {
			t.Parallel()
			if got := requestAllowedForFuncionario(tt.method, tt.path); got != tt.want {
				t.Errorf("requestAllowedForFuncionario(%q, %q) = %v, want %v", tt.method, tt.path, got, tt.want)
			}
		})
	}
}

func TestRequestAllowedForFuncionario_AnimaisSaude(t *testing.T) {
	t.Parallel()

	tests := []struct {
		method string
		path   string
		want   bool
	}{
		{http.MethodGet, "/api/v1/animais/1/saude", true},
		{http.MethodGet, "/api/v1/animais/1/saude/42", true},
		{http.MethodPost, "/api/v1/animais/1/saude", true},
		{http.MethodPut, "/api/v1/animais/1/saude/42", false},
		{http.MethodDelete, "/api/v1/animais/1/saude/42", false},
		{http.MethodPost, "/api/v1/animais/1/saude/42", false},
	}

	for _, tt := range tests {
		t.Run(tt.method+" "+tt.path, func(t *testing.T) {
			t.Parallel()
			if got := requestAllowedForFuncionario(tt.method, tt.path); got != tt.want {
				t.Errorf("requestAllowedForFuncionario(%q, %q) = %v, want %v", tt.method, tt.path, got, tt.want)
			}
		})
	}
}

func TestRequestAllowedForLimitedAPI_FuncionarioAnimaisSaude(t *testing.T) {
	t.Parallel()

	if !requestAllowedForLimitedAPI(models.PerfilFuncionario, http.MethodGet, "/api/v1/animais/1/saude") {
		t.Error("FUNCIONARIO GET /api/v1/animais/1/saude should be allowed")
	}
	if !requestAllowedForLimitedAPI(models.PerfilFuncionario, http.MethodPost, "/api/v1/animais/1/saude") {
		t.Error("FUNCIONARIO POST /api/v1/animais/1/saude should be allowed")
	}
	if requestAllowedForLimitedAPI(models.PerfilFuncionario, http.MethodPut, "/api/v1/animais/1/saude/42") {
		t.Error("FUNCIONARIO PUT /api/v1/animais/1/saude/42 should be denied")
	}
}

func TestRequestAllowedForLimitedAPI_FuncionarioCrias(t *testing.T) {
	t.Parallel()

	if !requestAllowedForLimitedAPI(models.PerfilFuncionario, http.MethodGet, "/api/v1/crias") {
		t.Error("FUNCIONARIO GET /api/v1/crias should be allowed")
	}
	if !requestAllowedForLimitedAPI(models.PerfilFuncionario, http.MethodPost, "/api/v1/crias") {
		t.Error("FUNCIONARIO POST /api/v1/crias should be allowed")
	}
}
