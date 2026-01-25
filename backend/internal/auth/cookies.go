package auth

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// SetSecureCookie configura um cookie HttpOnly com flags de segurança apropriadas.
// sameSite: use SameSiteNoneMode quando frontend e API estão em origens diferentes (ex.: Vercel + Render).
func SetSecureCookie(c *gin.Context, name, value string, maxAge int, sameSite http.SameSite) {
	isSecure := c.GetHeader("X-Forwarded-Proto") == "https" || c.Request.TLS != nil
	if sameSite == http.SameSiteNoneMode {
		isSecure = true // SameSite=None exige Secure
	}

	cookie := &http.Cookie{
		Name:     name,
		Value:    value,
		Path:     "/",
		MaxAge:   maxAge,
		HttpOnly: true,
		Secure:   isSecure,
		SameSite: sameSite,
	}

	http.SetCookie(c.Writer, cookie)
}

// ClearCookie remove um cookie definindo MaxAge negativo.
// sameSite deve ser o mesmo usado em SetSecureCookie (ex.: SameSiteNone em cross-origin).
func ClearCookie(c *gin.Context, name string, sameSite http.SameSite) {
	isSecure := c.GetHeader("X-Forwarded-Proto") == "https" || c.Request.TLS != nil
	if sameSite == http.SameSiteNoneMode {
		isSecure = true
	}

	cookie := &http.Cookie{
		Name:     name,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   isSecure,
		SameSite: sameSite,
		Expires:  time.Unix(0, 0),
	}

	http.SetCookie(c.Writer, cookie)
}
