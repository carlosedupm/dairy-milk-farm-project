package auth

import (
	"net/http"
	"regexp"
	"strings"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/response"
	"github.com/gin-gonic/gin"
)

// Regras de acesso à API por perfil. Manter alinhado com frontend/src/config/appAccess.ts.
// USER: whitelist em requestAllowedForUser — prefixo /api/v1/me/, exceto POST /api/v1/me/fazendas (apenas PROPRIETARIO; ver BR-ACESSO-008/012).

var funcionarioFolgasPath = regexp.MustCompile(`^/api/v1/fazendas/[0-9]+/folgas/`)
var funcionarioRestricoesLeitePath = regexp.MustCompile(`^/api/v1/fazendas/[0-9]+/restricoes-leite(/ativas)?$`)
var funcionarioFazendaAnimaisPath = regexp.MustCompile(`^/api/v1/fazendas/[0-9]+/animais(/count|/em-lactacao)?$`)
var funcionarioGestaoPath = regexp.MustCompile(`^/api/v1/(cios|coberturas|partos|secagens)(/.*)?$`)
var funcionarioAnimaisPath = regexp.MustCompile(`^/api/v1/animais(/.*)?$`)
var funcionarioAssistentePath = regexp.MustCompile(`^/api/v1/assistente(/.*)?$`)

// TODO(capabilities-assistente): liberar rotas de assistente para FUNCIONARIO
// de forma granular por capacidade, conforme regras de negócio.
func funcionarioAssistenteCapabilityEnabled(_ string, _ string) bool {
	return false
}

// PerfilTemAcessoAPICompleta indica se o perfil pode usar todos os endpoints /api/v1 autenticados.
func PerfilTemAcessoAPICompleta(perfil string) bool {
	return perfil != models.PerfilFuncionario && perfil != models.PerfilUser
}

func requestAllowedForUser(method, path string) bool {
	if path == "/api/v1/me/fazendas" && method == http.MethodPost {
		return false
	}
	return strings.HasPrefix(path, "/api/v1/me/")
}

func requestAllowedForLimitedAPI(perfil string, method, path string) bool {
	switch perfil {
	case models.PerfilFuncionario:
		return requestAllowedForFuncionario(method, path)
	case models.PerfilUser:
		return requestAllowedForUser(method, path)
	default:
		return false
	}
}

func requestAllowedForFuncionario(method, path string) bool {
	// Bloqueio explícito: a liberação do assistente para FUNCIONARIO
	// será feita futuramente por capacidades específicas de negócio.
	if funcionarioAssistentePath.MatchString(path) {
		if funcionarioAssistenteCapabilityEnabled(method, path) {
			return true
		}
		return false
	}
	if strings.HasPrefix(path, "/api/v1/me/") {
		return true
	}
	if funcionarioFolgasPath.MatchString(path) {
		return true
	}
	if (method == http.MethodGet || method == http.MethodPost) && funcionarioRestricoesLeitePath.MatchString(path) {
		return true
	}
	if method == http.MethodGet && funcionarioFazendaAnimaisPath.MatchString(path) {
		return true
	}
	if funcionarioGestaoPath.MatchString(path) {
		return true
	}
	if method == http.MethodGet && funcionarioAnimaisPath.MatchString(path) {
		return true
	}
	return false
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
		method := c.Request.Method
		if requestAllowedForLimitedAPI(perfil, method, path) {
			c.Next()
			return
		}
		response.ErrorForbidden(c, "Acesso negado para este perfil.")
		c.Abort()
	}
}
