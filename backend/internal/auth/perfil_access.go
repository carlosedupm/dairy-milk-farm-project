package auth

import (
	"regexp"
	"strings"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/response"
	"github.com/gin-gonic/gin"
)

// Regras de acesso à API por perfil. Manter alinhado com frontend/src/config/appAccess.ts.

var funcionarioFolgasPath = regexp.MustCompile(`^/api/v1/fazendas/[0-9]+/folgas/`)

// PerfilTemAcessoAPICompleta indica se o perfil pode usar todos os endpoints /api/v1 autenticados.
func PerfilTemAcessoAPICompleta(perfil string) bool {
	return perfil != models.PerfilFuncionario
}

func requestAllowedForFuncionario(path string) bool {
	if strings.HasPrefix(path, "/api/v1/me/") {
		return true
	}
	return funcionarioFolgasPath.MatchString(path)
}

// RequirePerfilAPIAccess restringe perfis limitados (ex.: FUNCIONARIO) a um subconjunto de rotas.
// Deve ser aplicado após AuthMiddleware.
func RequirePerfilAPIAccess() gin.HandlerFunc {
	return func(c *gin.Context) {
		perfilVal, ok := c.Get("perfil")
		if !ok {
			c.Next()
			return
		}
		perfil, _ := perfilVal.(string)
		if PerfilTemAcessoAPICompleta(perfil) {
			c.Next()
			return
		}
		path := c.Request.URL.Path
		if requestAllowedForFuncionario(path) {
			c.Next()
			return
		}
		response.ErrorForbidden(c, "Acesso negado para este perfil.")
		c.Abort()
	}
}
