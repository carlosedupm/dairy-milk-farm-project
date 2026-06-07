package auth

import (
	"net/http"
	"testing"

	"github.com/ceialmilk/api/internal/models"
)

func TestPerfilTemAcessoAPICompleta(t *testing.T) {
	t.Parallel()

	tests := []struct {
		perfil string
		want   bool
	}{
		{models.PerfilUser, false},
		{models.PerfilFuncionario, false},
		{models.PerfilAdmin, true},
		{models.PerfilDeveloper, true},
		{models.PerfilGerente, true},
		{models.PerfilGestao, true},
		{models.PerfilProprietario, true},
		{models.PerfilIntegracao, true},
	}

	for _, tt := range tests {
		t.Run(tt.perfil, func(t *testing.T) {
			t.Parallel()
			if got := PerfilTemAcessoAPICompleta(tt.perfil); got != tt.want {
				t.Errorf("PerfilTemAcessoAPICompleta(%q) = %v, want %v", tt.perfil, got, tt.want)
			}
		})
	}
}

func TestRequestAllowedForUser(t *testing.T) {
	t.Parallel()

	tests := []struct {
		method string
		path   string
		want   bool
	}{
		{http.MethodGet, "/api/v1/me", true},
		{http.MethodGet, "/api/v1/me/fazendas", true},
		{http.MethodGet, "/api/v1/me/fazenda-ativa", true},
		{http.MethodPost, "/api/v1/me/fazendas", false},
		{http.MethodGet, "/api/v1/animais", false},
		{http.MethodPost, "/api/v1/fazendas/1/alertas", false},
	}

	for _, tt := range tests {
		t.Run(tt.method+" "+tt.path, func(t *testing.T) {
			t.Parallel()
			if got := requestAllowedForUser(tt.method, tt.path); got != tt.want {
				t.Errorf("requestAllowedForUser(%q, %q) = %v, want %v", tt.method, tt.path, got, tt.want)
			}
		})
	}
}

func TestRequestAllowedForLimitedAPI_User(t *testing.T) {
	t.Parallel()

	tests := []struct {
		method string
		path   string
		want   bool
	}{
		{http.MethodGet, "/api/v1/me", true},
		{http.MethodGet, "/api/v1/me/fazendas", true},
		{http.MethodGet, "/api/v1/me/fazenda-ativa", true},
		{http.MethodPost, "/api/v1/me/fazendas", false},
		{http.MethodGet, "/api/v1/animais", false},
		{http.MethodPost, "/api/v1/fazendas/1/alertas", false},
	}

	for _, tt := range tests {
		t.Run(tt.method+" "+tt.path, func(t *testing.T) {
			t.Parallel()
			if got := requestAllowedForLimitedAPI(models.PerfilUser, tt.method, tt.path); got != tt.want {
				t.Errorf("requestAllowedForLimitedAPI(USER, %q, %q) = %v, want %v", tt.method, tt.path, got, tt.want)
			}
		})
	}
}

func TestRequestAllowedForLimitedAPI_FullAccessProfilesNotWhitelisted(t *testing.T) {
	t.Parallel()

	fullAccessProfiles := []string{
		models.PerfilProprietario,
		models.PerfilGerente,
		models.PerfilGestao,
		models.PerfilAdmin,
	}

	for _, perfil := range fullAccessProfiles {
		t.Run(perfil, func(t *testing.T) {
			t.Parallel()
			if !PerfilTemAcessoAPICompleta(perfil) {
				t.Fatalf("PerfilTemAcessoAPICompleta(%q) should be true", perfil)
			}
			if requestAllowedForLimitedAPI(perfil, http.MethodGet, "/api/v1/animais") {
				t.Errorf("requestAllowedForLimitedAPI(%q, ...) should be false — full-access profiles bypass whitelist", perfil)
			}
		})
	}
}

func TestRequestAllowedForFuncionario_MeProfile(t *testing.T) {
	t.Parallel()

	if !requestAllowedForFuncionario(http.MethodGet, "/api/v1/me") {
		t.Error("FUNCIONARIO GET /api/v1/me should be allowed")
	}
}

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

func TestRequestAllowedForFuncionario_Alertas(t *testing.T) {
	t.Parallel()

	tests := []struct {
		method string
		path   string
		want   bool
	}{
		{http.MethodGet, "/api/v1/fazendas/1/alertas", true},
		{http.MethodGet, "/api/v1/fazendas/1/alertas/42", true},
		{http.MethodPatch, "/api/v1/fazendas/1/alertas/42/status", true},
		{http.MethodPost, "/api/v1/fazendas/1/alertas", false},
		{http.MethodDelete, "/api/v1/fazendas/1/alertas/42", false},
		{http.MethodPatch, "/api/v1/fazendas/1/alertas/42", false},
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
