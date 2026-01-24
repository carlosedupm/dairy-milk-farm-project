package middleware

import (
	"net/http"

	"github.com/ceialmilk/api/internal/observability"
	"github.com/ceialmilk/api/internal/requestctx"
	"github.com/gin-gonic/gin"
)

// SentryRecoveryMiddleware captura panics e envia para o Sentry
func SentryRecoveryMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				// Obter informações do contexto
				correlationID := requestctx.GetCorrelationID(c)
				logger := requestctx.GetLogger(c)

				// Log do erro
				logger.Error("Panic capturado",
					"error", err,
					"correlation_id", correlationID,
					"path", c.Request.URL.Path,
					"method", c.Request.Method,
				)

				// Capturar no Sentry
				if panicErr, ok := err.(error); ok {
					observability.CaptureError(panicErr, map[string]string{
						"correlation_id": correlationID,
						"path":           c.Request.URL.Path,
						"method":         c.Request.Method,
					}, map[string]interface{}{
						"user_id": c.GetString("user_id"),
						"email":   c.GetString("email"),
					})
				} else {
					observability.CaptureMessage(
						"Panic: "+toString(err),
						map[string]string{
							"correlation_id": correlationID,
							"path":           c.Request.URL.Path,
							"method":         c.Request.Method,
						},
					)
				}

				// Retornar erro 500
				c.JSON(http.StatusInternalServerError, gin.H{
					"error": gin.H{
						"code":    "INTERNAL_ERROR",
						"message": "Erro interno do servidor",
					},
					"timestamp": "",
				})
				c.Abort()
			}
		}()

		c.Next()
	}
}

func toString(v interface{}) string {
	if s, ok := v.(string); ok {
		return s
	}
	return ""
}
