package observability

import (
	"github.com/ceialmilk/api/internal/requestctx"
	"github.com/gin-gonic/gin"
)

// CaptureHandlerError captura erros dos handlers no Sentry com contexto
func CaptureHandlerError(c *gin.Context, err error, tags map[string]string) {
	if err == nil {
		return
	}

	correlationID := requestctx.GetCorrelationID(c)
	logger := requestctx.GetLogger(c)

	// Log do erro
	logger.Error("Handler error",
		"error", err,
		"correlation_id", correlationID,
		"path", c.Request.URL.Path,
		"method", c.Request.Method,
	)

	// Preparar tags para Sentry
	sentryTags := map[string]string{
		"correlation_id": correlationID,
		"path":           c.Request.URL.Path,
		"method":         c.Request.Method,
	}
	for k, v := range tags {
		sentryTags[k] = v
	}

	// Preparar contexto extra
	extra := map[string]interface{}{
		"user_id": c.GetString("user_id"),
		"email":   c.GetString("email"),
		"perfil":  c.GetString("perfil"),
	}

	// Capturar no Sentry
	CaptureError(err, sentryTags, extra)
}
