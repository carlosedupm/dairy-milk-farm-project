package openapi

import (
	"embed"
	"net/http"

	"github.com/gin-gonic/gin"
)

//go:embed integracoes-v1.openapi.yaml
var integracaoSpecFS embed.FS

const specFileName = "integracoes-v1.openapi.yaml"

// RegisterIntegracaoDocsRoutes expõe OpenAPI e Swagger UI (público, sem API key).
func RegisterIntegracaoDocsRoutes(router *gin.Engine) {
	g := router.Group("/api/v1/integracoes")
	g.GET("/openapi.yaml", serveOpenAPISpec)
	g.GET("/docs", serveSwaggerUI)
	g.GET("/swagger", func(c *gin.Context) {
		c.Redirect(http.StatusFound, "/api/v1/integracoes/docs")
	})
}

func serveOpenAPISpec(c *gin.Context) {
	data, err := integracaoSpecFS.ReadFile(specFileName)
	if err != nil {
		c.String(http.StatusInternalServerError, "spec not found")
		return
	}
	c.Data(http.StatusOK, "application/yaml; charset=utf-8", data)
}

func serveSwaggerUI(c *gin.Context) {
	c.Header("Content-Type", "text/html; charset=utf-8")
	// CSP restrita ao necessário pelo Swagger UI (assets via unpkg + script/estilos inline próprios)
	c.Header("Content-Security-Policy",
		"default-src 'self'; "+
			"script-src 'self' 'unsafe-inline' https://unpkg.com; "+
			"style-src 'self' 'unsafe-inline' https://unpkg.com; "+
			"img-src 'self' data:; "+
			"connect-src 'self'; "+
			"object-src 'none'; "+
			"base-uri 'self'; "+
			"frame-ancestors 'none'")
	c.Header("X-Content-Type-Options", "nosniff")
	c.Header("X-Frame-Options", "DENY")
	c.String(http.StatusOK, swaggerUIHTML)
}

const swaggerUIHTML = `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>CeialMilk — API Integrações</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js" crossorigin></script>
  <script>
    window.onload = function () {
      window.ui = SwaggerUIBundle({
        url: "/api/v1/integracoes/openapi.yaml",
        dom_id: "#swagger-ui",
        deepLinking: true,
        persistAuthorization: true,
        tryItOutEnabled: true,
        displayRequestDuration: true,
        filter: true,
        syntaxHighlight: { activate: true, theme: "agate" }
      });
    };
  </script>
</body>
</html>`
