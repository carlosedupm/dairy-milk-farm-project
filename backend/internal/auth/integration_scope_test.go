package auth

import (
	"net/http/httptest"
	"testing"

	"github.com/ceialmilk/api/internal/models"
	"github.com/gin-gonic/gin"
)

func TestHasIntegrationScope(t *testing.T) {
	gin.SetMode(gin.TestMode)
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Set(ContextIntegrationScopes, []string{models.ScopeAnimaisRead, models.ScopeToquesWrite, models.ScopeCoberturasWrite})

	if !HasIntegrationScope(c, models.ScopeToquesWrite) {
		t.Fatal("expected toques:write")
	}
	if !HasIntegrationScope(c, models.ScopeCoberturasWrite) {
		t.Fatal("expected coberturas:write")
	}
	if HasIntegrationScope(c, models.ScopeCoberturasRead) {
		t.Fatal("expected no coberturas:read")
	}
}
