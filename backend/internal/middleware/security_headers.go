package middleware

import (
	"github.com/gin-gonic/gin"
)

// SecurityHeadersMiddleware aplica headers HTTP de segurança em todas as respostas.
// HSTS só é enviado quando production é true (HTTPS esperado em Render/produção).
func SecurityHeadersMiddleware(production bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		h := c.Writer.Header()
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("X-Frame-Options", "DENY")
		h.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		h.Set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
		if production {
			h.Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		}
		c.Next()
	}
}
