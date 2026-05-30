package openapi

import (
	"embed"
	"testing"

	"gopkg.in/yaml.v3"
)

//go:embed openapi.yaml
var jwtSpecFS embed.FS

const jwtSpecFileName = "openapi.yaml"

func TestEmbeddedJWTOpenAPISpec(t *testing.T) {
	data, err := jwtSpecFS.ReadFile(jwtSpecFileName)
	if err != nil {
		t.Fatalf("read embed: %v", err)
	}
	var doc struct {
		OpenAPI string                 `yaml:"openapi"`
		Paths   map[string]interface{} `yaml:"paths"`
	}
	if err := yaml.Unmarshal(data, &doc); err != nil {
		t.Fatalf("unmarshal yaml: %v", err)
	}
	if doc.OpenAPI != "3.0.3" {
		t.Fatalf("openapi version: got %q", doc.OpenAPI)
	}
	required := []string{
		"/api/v1/animais/{animalId}/saude",
		"/api/v1/animais/{animalId}/saude/{saudeId}",
		"/api/v1/fazendas/{fazendaId}/alertas",
		"/api/v1/fazendas/{fazendaId}/alertas/{alertaId}",
		"/api/v1/fazendas/{fazendaId}/alertas/{alertaId}/status",
		"/api/v1/me/push/vapid-public-key",
		"/api/v1/me/push-subscription",
		"/api/v1/me/fazenda-ativa",
	}
	for _, p := range required {
		if _, ok := doc.Paths[p]; !ok {
			t.Fatalf("missing path %s", p)
		}
	}
	if len(doc.Paths) != len(required) {
		t.Fatalf("expected %d paths, got %d", len(required), len(doc.Paths))
	}
}
