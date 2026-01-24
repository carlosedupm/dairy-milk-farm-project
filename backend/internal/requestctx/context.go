package requestctx

import (
	"log/slog"

	"github.com/gin-gonic/gin"
)

const CorrelationIDHeader = "X-Correlation-ID"
const CorrelationIDKey = "correlation_id"
const LoggerKey = "logger"

// GetCorrelationID obtém o correlation ID do contexto
func GetCorrelationID(c *gin.Context) string {
	if id, exists := c.Get(CorrelationIDKey); exists {
		if str, ok := id.(string); ok {
			return str
		}
	}
	return ""
}

// GetLogger obtém o logger com correlation ID do contexto
func GetLogger(c *gin.Context) *slog.Logger {
	if logger, exists := c.Get(LoggerKey); exists {
		if l, ok := logger.(*slog.Logger); ok {
			return l
		}
	}
	return slog.Default()
}
