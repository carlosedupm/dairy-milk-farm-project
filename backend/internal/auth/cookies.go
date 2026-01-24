package auth

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// SetSecureCookie configura um cookie HttpOnly com flags de segurança apropriadas
func SetSecureCookie(c *gin.Context, name, value string, maxAge int) {
	isSecure := c.GetHeader("X-Forwarded-Proto") == "https" || c.Request.TLS != nil

	// Usar http.SetCookie diretamente para ter controle sobre SameSite
	cookie := &http.Cookie{
		Name:     name,
		Value:    value,
		Path:     "/",
		MaxAge:   maxAge,
		HttpOnly: true,
		Secure:   isSecure,
		SameSite: http.SameSiteStrictMode, // Proteção CSRF
	}

	http.SetCookie(c.Writer, cookie)
}

// ClearCookie remove um cookie definindo MaxAge negativo
func ClearCookie(c *gin.Context, name string) {
	cookie := &http.Cookie{
		Name:     name,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   c.GetHeader("X-Forwarded-Proto") == "https" || c.Request.TLS != nil,
		SameSite: http.SameSiteStrictMode,
		Expires:  time.Unix(0, 0),
	}

	http.SetCookie(c.Writer, cookie)
}
