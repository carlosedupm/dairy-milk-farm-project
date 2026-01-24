package middleware

import (
	"time"

	"github.com/ceialmilk/api/internal/requestctx"
	"github.com/gin-gonic/gin"
)

// StructuredLoggingMiddleware cria logs estruturados para cada request
func StructuredLoggingMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		query := c.Request.URL.RawQuery
		method := c.Request.Method

		// Processar request
		c.Next()

		// Calcular duração
		latency := time.Since(start)
		statusCode := c.Writer.Status()
		clientIP := c.ClientIP()
		userAgent := c.Request.UserAgent()

		// Obter logger com correlation ID
		logger := requestctx.GetLogger(c)
		correlationID := requestctx.GetCorrelationID(c)

		// Log estruturado
		logger.Info("HTTP Request",
			"method", method,
			"path", path,
			"query", query,
			"status", statusCode,
			"latency_ms", latency.Milliseconds(),
			"client_ip", clientIP,
			"user_agent", userAgent,
			"correlation_id", correlationID,
		)

		// Log de erro se status >= 400
		if statusCode >= 400 {
			logger.Warn("HTTP Error",
				"method", method,
				"path", path,
				"status", statusCode,
				"latency_ms", latency.Milliseconds(),
				"correlation_id", correlationID,
			)
		}
	}
}
