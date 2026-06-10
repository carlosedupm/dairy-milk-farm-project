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
//
// Este ficheiro define whitelists apenas para perfis **limitados** (FUNCIONARIO, USER).
// Perfis com acesso API completo (passam direto em RequirePerfilAPIAccess):
//   ADMIN, DEVELOPER, GERENTE, GESTAO, PROPRIETARIO — ver PerfilTemAcessoAPICompleta.
// Restrições adicionais desses perfis vêm de outras camadas:
//   - middleware.go: RequireAdmin, RequireDeveloper, RequireGestaoFolgas
//   - handlers/access_helper.go: ValidateFazendaAccess, ValidateFazendaAccessOrGestao
//   - services/models: regras de domínio (folgas, alertas, baixa, etc.)
// INTEGRACAO não usa JWT UI — auth M2M por API key em /api/v1/integracoes/*.
//
// USER: whitelist em requestAllowedForUser — prefixo /api/v1/me/, exceto POST /api/v1/me/fazendas (apenas PROPRIETARIO; ver BR-ACESSO-008/012).

var funcionarioFolgasPath = regexp.MustCompile(`^/api/v1/fazendas/[0-9]+/folgas/`)
var funcionarioRestricoesLeitePath = regexp.MustCompile(`^/api/v1/fazendas/[0-9]+/restricoes-leite(/ativas)?$`)
var funcionarioFazendaAnimaisPath = regexp.MustCompile(`^/api/v1/fazendas/[0-9]+/animais(/count|/em-lactacao|/para-cobertura|/para-toque|/para-parto|/para-abertura-lactacao)?$`)
var funcionarioGestaoPath = regexp.MustCompile(`^/api/v1/(cios|coberturas|partos|secagens|toques)(/.*)?$`)
// Crias: sub-recurso operacional de partos (listar/complementar na edição de parto).
var funcionarioCriasPath = regexp.MustCompile(`^/api/v1/crias(/.*)?$`)
var funcionarioAnimaisPath = regexp.MustCompile(`^/api/v1/animais(/.*)?$`)
var funcionarioAnimaisBaixaPath = regexp.MustCompile(`^/api/v1/animais/[0-9]+/baixa$`)
var funcionarioAnimaisSaudePath = regexp.MustCompile(`^/api/v1/animais/[0-9]+/saude(/[0-9]+)?$`)
var funcionarioAnimaisVacinasPath = regexp.MustCompile(`^/api/v1/animais/[0-9]+/vacinas(/[0-9]+(/aplicar)?)?$`)
var funcionarioAlertasPath = regexp.MustCompile(`^/api/v1/fazendas/[0-9]+/alertas(/[0-9]+(/status)?)?$`)
var funcionarioResumoPecuarioPath = regexp.MustCompile(`^/api/v1/fazendas/[0-9]+/resumo-pecuario$`)
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

func isMeProfileRoute(method, path string) bool {
	return method == http.MethodGet && path == "/api/v1/me"
}

func requestAllowedForUser(method, path string) bool {
	if path == "/api/v1/me/fazendas" && method == http.MethodPost {
		return false
	}
	if isMeProfileRoute(method, path) {
		return true
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
	if isMeProfileRoute(method, path) || strings.HasPrefix(path, "/api/v1/me/") {
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
	if (method == http.MethodGet || method == http.MethodPost) && funcionarioCriasPath.MatchString(path) {
		return true
	}
	if funcionarioAnimaisSaudePath.MatchString(path) {
		if method == http.MethodGet {
			return true
		}
		if method == http.MethodPost && strings.HasSuffix(path, "/saude") {
			return true
		}
		return false
	}
	// Vacinas (BR-SAUDE-007): GET + POST (registrar aplicada — validado no service) + PATCH aplicar; PUT/DELETE → 403.
	if funcionarioAnimaisVacinasPath.MatchString(path) {
		if method == http.MethodGet {
			return true
		}
		if method == http.MethodPost && strings.HasSuffix(path, "/vacinas") {
			return true
		}
		if method == http.MethodPatch && strings.HasSuffix(path, "/aplicar") {
			return true
		}
		return false
	}
	if method == http.MethodGet && funcionarioAnimaisPath.MatchString(path) {
		return true
	}
	if method == http.MethodPost && funcionarioAnimaisBaixaPath.MatchString(path) {
		return true
	}
	if funcionarioAlertasPath.MatchString(path) {
		if method == http.MethodGet {
			return true
		}
		if method == http.MethodPatch && strings.HasSuffix(path, "/status") {
			return true
		}
		return false
	}
	if method == http.MethodGet && funcionarioResumoPecuarioPath.MatchString(path) {
		return true
	}
	if method == http.MethodPost && path == "/api/v1/producao" {
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
