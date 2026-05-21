package auth

import (
	"strings"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/response"
	"github.com/ceialmilk/api/internal/service"
	"github.com/gin-gonic/gin"
)

const (
	ContextAuthKind             = "auth_kind"
	ContextIntegrationClientID  = "integration_client_id"
	ContextIntegrationScopes    = "integration_scopes"
	ContextIntegrationFazendaIDs = "integration_fazenda_ids"
	AuthKindIntegration         = "integration"
	AuthKindJWT                 = "jwt"
)

// IntegrationAuthMiddleware autentica clientes M2M via Bearer cmk_live_...
func IntegrationAuthMiddleware(integracaoSvc *service.IntegracaoService) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			response.ErrorUnauthorized(c, "Token de integracao nao fornecido")
			c.Abort()
			return
		}
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			response.ErrorUnauthorized(c, "Formato de token invalido")
			c.Abort()
			return
		}
		token := parts[1]
		if !service.ValidateAPIKeyFormat(token) {
			response.ErrorUnauthorized(c, "Chave de integracao invalida")
			c.Abort()
			return
		}
		cliente, err := integracaoSvc.ResolveClienteByAPIKey(c.Request.Context(), token)
		if err != nil {
			response.ErrorUnauthorized(c, "Chave de integracao invalida ou revogada")
			c.Abort()
			return
		}
		c.Set(ContextAuthKind, AuthKindIntegration)
		c.Set("user_id", cliente.ActorUserID)
		c.Set("perfil", models.PerfilIntegracao)
		c.Set(ContextIntegrationClientID, cliente.ID)
		c.Set(ContextIntegrationScopes, cliente.Scopes)
		c.Set(ContextIntegrationFazendaIDs, cliente.FazendaIDs)
		c.Next()
	}
}

// RequireIntegrationScope exige scope na lista do cliente.
func RequireIntegrationScope(scope string) gin.HandlerFunc {
	return func(c *gin.Context) {
		val, ok := c.Get(ContextIntegrationScopes)
		if !ok {
			response.ErrorForbidden(c, "Scopes de integracao nao disponiveis")
			c.Abort()
			return
		}
		scopes, _ := val.([]string)
		for _, s := range scopes {
			if s == scope {
				c.Next()
				return
			}
		}
		response.ErrorForbidden(c, "Scope necessario: "+scope)
		c.Abort()
	}
}

// GetIntegrationClientID retorna ID do cliente M2M.
func GetIntegrationClientID(c *gin.Context) (int64, bool) {
	v, ok := c.Get(ContextIntegrationClientID)
	if !ok {
		return 0, false
	}
	id, ok := v.(int64)
	return id, ok
}

// GetIntegrationFazendaIDs retorna fazendas permitidas.
func GetIntegrationFazendaIDs(c *gin.Context) []int64 {
	v, ok := c.Get(ContextIntegrationFazendaIDs)
	if !ok {
		return nil
	}
	ids, _ := v.([]int64)
	return ids
}

// HasIntegrationScope verifica scope sem abortar.
func HasIntegrationScope(c *gin.Context, scope string) bool {
	val, ok := c.Get(ContextIntegrationScopes)
	if !ok {
		return false
	}
	scopes, _ := val.([]string)
	for _, s := range scopes {
		if s == scope {
			return true
		}
	}
	return false
}
