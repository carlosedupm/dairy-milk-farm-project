package auth

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/ceialmilk/api/internal/models"
	"github.com/gin-gonic/gin"
)

func TestRequirePodeDeletarFazenda_PerfilAutorizado(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, perfil := range []string{models.PerfilAdmin, models.PerfilDeveloper, models.PerfilGestao, models.PerfilProprietario} {
		t.Run(perfil, func(t *testing.T) {
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest(http.MethodDelete, "/fazendas/1", nil)
			c.Set("perfil", perfil)
			allowed := false
			RequirePodeDeletarFazenda()(c)
			if !c.IsAborted() {
				allowed = true
			}
			if !allowed {
				t.Fatalf("perfil %s deveria poder excluir fazendas", perfil)
			}
		})
	}
}

// RF02: perfil sem permissão recebe 403 no middleware da rota DELETE.
func TestRequirePodeDeletarFazenda_Funcionario_Forbidden(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodDelete, "/fazendas/1", nil)
	c.Set("perfil", models.PerfilFuncionario)

	RequirePodeDeletarFazenda()(c)

	if !c.IsAborted() {
		t.Fatal("esperava abort para FUNCIONARIO")
	}
	if w.Code != http.StatusForbidden {
		t.Fatalf("esperava 403, recebeu %d", w.Code)
	}
}

// RF03: sem token/perfil no contexto, AuthMiddleware retorna 401.
func TestAuthMiddleware_SemToken_Unauthorized(t *testing.T) {
	gin.SetMode(gin.TestMode)
	jwtSvc := &JWTService{} // ValidateToken falhará com token vazio
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodDelete, "/api/v1/fazendas/1", nil)

	AuthMiddleware(jwtSvc)(c)

	if !c.IsAborted() {
		t.Fatal("esperava abort sem token")
	}
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("esperava 401, recebeu %d", w.Code)
	}
}
