package auth

import (
	"net/http"
	"testing"
)

func TestRequestAllowedForFuncionario_Assistente(t *testing.T) {
	t.Parallel()

	paths := []struct {
		method string
		path   string
	}{
		{http.MethodGet, "/api/v1/assistente/live"},
		{http.MethodPost, "/api/v1/assistente/interpretar"},
		{http.MethodPost, "/api/v1/assistente/executar"},
	}
	for _, tt := range paths {
		if !requestAllowedForFuncionario(tt.method, tt.path) {
			t.Errorf("esperava permitido: %s %s", tt.method, tt.path)
		}
	}
}
