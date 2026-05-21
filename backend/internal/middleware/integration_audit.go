package middleware

import (
	"time"

	"github.com/ceialmilk/api/internal/auth"
	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/requestctx"
	"github.com/ceialmilk/api/internal/service"
	"github.com/gin-gonic/gin"
)

// IntegrationAuditMiddleware regista chamadas M2M após o handler.
func IntegrationAuditMiddleware(integracaoSvc *service.IntegracaoService) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()
		clientID, ok := auth.GetIntegrationClientID(c)
		if !ok || clientID <= 0 {
			return
		}
		var corr *string
		if v, ok := c.Get(requestctx.CorrelationIDKey); ok {
			if s, ok := v.(string); ok && s != "" {
				corr = &s
			}
		}
		var idem *string
		if v := c.GetHeader("Idempotency-Key"); v != "" {
			idem = &v
		}
		erro := c.Errors.ByType(gin.ErrorTypePrivate).String()
		if erro == "" && c.Writer.Status() >= 400 {
			erro = c.Errors.String()
		}
		var erroPtr *string
		if erro != "" {
			if len(erro) > 500 {
				erro = erro[:500]
			}
			erroPtr = &erro
		}
		ch := &models.IntegracaoChamada{
			ClienteID:      clientID,
			Method:         c.Request.Method,
			Path:           c.Request.URL.Path,
			StatusCode:     c.Writer.Status(),
			CorrelationID:  corr,
			IdempotencyKey: idem,
			DuracaoMs:      int(time.Since(start).Milliseconds()),
			ErroResumo:     erroPtr,
		}
		_ = integracaoSvc.LogChamada(c.Request.Context(), ch)
	}
}
