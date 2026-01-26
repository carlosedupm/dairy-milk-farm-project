package auth

import (
	"strings"

	"github.com/ceialmilk/api/internal/response"
	"github.com/gin-gonic/gin"
)

func AuthMiddleware(jwtService *JWTService) gin.HandlerFunc {
	return func(c *gin.Context) {
		var token string

		// Tentar obter token do cookie HttpOnly primeiro
		if cookieToken, err := c.Cookie("ceialmilk_token"); err == nil && cookieToken != "" {
			token = cookieToken
		} else {
			// Fallback: tentar obter do header Authorization
			authHeader := c.GetHeader("Authorization")
			if authHeader == "" {
				response.ErrorUnauthorized(c, "Token de autenticação não fornecido")
				c.Abort()
				return
			}

			// Extrair token do header "Bearer <token>"
			parts := strings.Split(authHeader, " ")
			if len(parts) != 2 || parts[0] != "Bearer" {
				response.ErrorUnauthorized(c, "Formato de token inválido")
				c.Abort()
				return
			}
			token = parts[1]
		}

		claims, err := jwtService.ValidateToken(token)
		if err != nil {
			response.ErrorUnauthorized(c, "Token inválido ou expirado")
			c.Abort()
			return
		}

		// Adicionar claims ao contexto
		c.Set("user_id", claims.UserID)
		c.Set("email", claims.Email)
		c.Set("perfil", claims.Perfil)

		c.Next()
	}
}

// RequireDeveloper verifica se o usuário tem perfil DEVELOPER
func RequireDeveloper() gin.HandlerFunc {
	return func(c *gin.Context) {
		perfil, exists := c.Get("perfil")
		if !exists || perfil != "DEVELOPER" {
			response.ErrorForbidden(c, "Acesso negado. Perfil DEVELOPER necessário.")
			c.Abort()
			return
		}
		c.Next()
	}
}
