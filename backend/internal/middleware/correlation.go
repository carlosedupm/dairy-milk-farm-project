package middleware

import (
	"log/slog"

	"github.com/ceialmilk/api/internal/requestctx"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// CorrelationIDMiddleware adiciona um correlation ID a cada request
func CorrelationIDMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Tentar obter correlation ID do header
		correlationID := c.GetHeader(requestctx.CorrelationIDHeader)

		// Se não existir, gerar um novo
		if correlationID == "" {
			correlationID = uuid.New().String()
		}

		// Adicionar ao contexto do Gin
		c.Set(requestctx.CorrelationIDKey, correlationID)

		// Adicionar ao header de resposta para o cliente poder rastrear
		c.Header(requestctx.CorrelationIDHeader, correlationID)

		// Adicionar ao contexto do request para uso em logs
		c.Request = c.Request.WithContext(
			c.Request.Context(),
		)

		// Criar logger com correlation ID
		logger := slog.Default().With("correlation_id", correlationID)
		c.Set(requestctx.LoggerKey, logger)

		c.Next()
	}
}
