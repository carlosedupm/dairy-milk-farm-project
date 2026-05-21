package middleware

import (
	"fmt"

	"github.com/ceialmilk/api/internal/auth"
	"github.com/ceialmilk/api/internal/response"
	"github.com/gin-gonic/gin"
)

// IntegrationRateLimit limita requisições por cliente de integração.
func IntegrationRateLimit(requestsPerHour int) gin.HandlerFunc {
	limiter := NewRateLimiter(requestsPerHour)
	return func(c *gin.Context) {
		clientID, ok := auth.GetIntegrationClientID(c)
		if !ok {
			response.ErrorUnauthorized(c, "Cliente de integracao nao identificado")
			c.Abort()
			return
		}
		if !limiter.GetLimiter(clientID).Allow() {
			response.ErrorTooManyRequests(c, fmt.Sprintf("Limite de requisicoes excedido. Maximo %d por hora.", requestsPerHour))
			c.Abort()
			return
		}
		c.Next()
	}
}
