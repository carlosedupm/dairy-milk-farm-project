package openapi

import (
	"testing"

	"gopkg.in/yaml.v3"
)

func TestEmbeddedOpenAPISpec(t *testing.T) {
	data, err := integracaoSpecFS.ReadFile(specFileName)
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
		"/api/v1/integracoes/me",
		"/api/v1/integracoes/animais/search",
		"/api/v1/integracoes/animais/{id}",
		"/api/v1/integracoes/coberturas",
		"/api/v1/integracoes/toques",
		"/api/v1/integracoes/toques/lote",
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
