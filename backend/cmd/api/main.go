package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"github.com/ceialmilk/api/internal/auth"
	"github.com/ceialmilk/api/internal/config"
	"github.com/ceialmilk/api/internal/handlers"
	"github.com/ceialmilk/api/internal/logger"
	"github.com/ceialmilk/api/internal/middleware"
	"github.com/ceialmilk/api/internal/observability"
	"github.com/ceialmilk/api/internal/repository"
	"github.com/ceialmilk/api/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

func main() {
	cfg := config.Load()
	logger.Setup(cfg.LogLevel)

	// Obter working directory para paths relativos
	wd, err := os.Getwd()
	if err != nil {
		slog.Warn("Erro ao obter working directory", "error", err)
		wd = "."
	}

	// Verificação de variáveis de ambiente carregadas
	logEnvStatus(cfg)

	slog.Info("Iniciando CeialMilk API",
		"version", "1.0.0",
		"port", cfg.Port,
		"env", cfg.Env,
	)

	// Inicializar Sentry
	if err := observability.InitSentry(cfg.SentryDSN, cfg.Env); err != nil {
		slog.Warn("Falha ao inicializar Sentry", "error", err)
	}
	defer observability.Flush()

	if cfg.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()

	// Middlewares de observabilidade (ordem importa)
	router.Use(middleware.CorrelationIDMiddleware())     // Correlation ID primeiro
	router.Use(middleware.StructuredLoggingMiddleware()) // Logging estruturado
	router.Use(middleware.SentryRecoveryMiddleware())    // Captura de panics no Sentry

	// CORS
	router.Use(corsMiddleware(cfg.CORSOrigin))

	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":    "ok",
			"service":   "ceialmilk-api",
			"timestamp": time.Now().UTC().Format(time.RFC3339),
		})
	})

	if cfg.DatabaseURL == "" {
		slog.Warn("DATABASE_URL não definida: apenas /health disponível")
	} else {
		pool, err := config.ConnectDB(cfg.DatabaseURL)
		if err != nil {
			slog.Warn("Falha ao conectar ao banco; apenas /health disponível", "error", err)
		} else {
			defer pool.Close()

			if err := runMigrations(cfg.DatabaseURL); err != nil {
				slog.Warn("Falha ao executar migrações; apenas /health disponível", "error", err)
			} else {

				privateKey, publicKey := cfg.JWTPrivateKey, cfg.JWTPublicKey
				if privateKey == "" || publicKey == "" {
					if cfg.Env == "development" {
						privateKey, publicKey = config.DevJWTKeys()
						slog.Info("Usando chaves JWT de desenvolvimento (JWT_* não definidas)")
					} else {
						slog.Warn("JWT_PRIVATE_KEY ou JWT_PUBLIC_KEY não definidas: apenas /health disponível")
						privateKey = ""
					}
				}
				if privateKey != "" && publicKey != "" {
					jwtSvc, err := auth.NewJWTService(privateKey, publicKey)
					if err != nil {
						slog.Error("Falha ao inicializar JWT", "error", err)
						os.Exit(1)
					}

					userRepo := repository.NewUsuarioRepository(pool)
					fazendaRepo := repository.NewFazendaRepository(pool)
					refreshTokenRepo := repository.NewRefreshTokenRepository(pool)
					fazendaSvc := service.NewFazendaService(fazendaRepo)
					refreshTokenSvc := service.NewRefreshTokenService(refreshTokenRepo)
					cookieSameSite := http.SameSiteStrictMode
					if !strings.Contains(cfg.CORSOrigin, "localhost") {
						cookieSameSite = http.SameSiteNoneMode // cross-origin (Vercel + Render)
					}
					authHandler := handlers.NewAuthHandler(userRepo, jwtSvc, refreshTokenSvc, cookieSameSite)
					fazendaHandler := handlers.NewFazendaHandler(fazendaSvc)

					api := router.Group("/api")
					api.POST("/auth/login", authHandler.Login)
					api.POST("/auth/logout", authHandler.Logout)
					api.POST("/auth/refresh", authHandler.Refresh)
					api.POST("/auth/validate", authHandler.Validate)

					v1 := api.Group("/v1/fazendas", auth.AuthMiddleware(jwtSvc))
					{
						v1.GET("", fazendaHandler.GetAll)
						v1.GET("/count", fazendaHandler.Count)
						v1.GET("/exists", fazendaHandler.Exists)
						v1.GET("/search/by-nome", fazendaHandler.SearchByNome)
						v1.GET("/search/by-localizacao", fazendaHandler.SearchByLocalizacao)
						v1.GET("/search/by-vacas-min", fazendaHandler.SearchByVacasMin)
						v1.GET("/search/by-vacas-range", fazendaHandler.SearchByVacasRange)
						v1.GET("/:id", fazendaHandler.GetByID)
						v1.POST("", fazendaHandler.Create)
						v1.PUT("/:id", fazendaHandler.Update)
						v1.DELETE("/:id", fazendaHandler.Delete)
					}

					// Dev Studio routes (apenas se Gemini API key estiver configurada)
					if cfg.GeminiAPIKey != "" {
						devStudioRepo := repository.NewDevStudioRepository(pool)
						// Memory-bank está na raiz do projeto (workspace/memory-bank)
						// wd pode ser /workspace/backend ou /workspace/backend/cmd/api
						// Normalizar para /workspace primeiro
						workspaceRoot := wd
						for {
							if filepath.Base(workspaceRoot) == "workspace" {
								break
							}
							parent := filepath.Dir(workspaceRoot)
							if parent == workspaceRoot {
								// Chegou na raiz, usar caminho relativo
								workspaceRoot = wd
								break
							}
							workspaceRoot = parent
						}
						memoryBankPath := filepath.Join(workspaceRoot, "memory-bank")
						// Normalizar o path
						memoryBankPath, err = filepath.Abs(memoryBankPath)
						if err != nil {
							slog.Warn("Erro ao obter path do memory-bank", "error", err)
							memoryBankPath = filepath.Join(wd, "..", "..", "memory-bank")
						}
						slog.Info("Memory-bank path configurado", "path", memoryBankPath)
						
						// GitHub Service (opcional - apenas se configurado)
						var githubSvc *service.GitHubService
						if cfg.GitHubToken != "" && cfg.GitHubRepo != "" {
							githubSvc = service.NewGitHubService(cfg.GitHubToken, cfg.GitHubRepo)
							slog.Info("GitHub Service configurado", "repo", cfg.GitHubRepo)
						} else {
							slog.Warn("GitHub não configurado (GITHUB_TOKEN ou GITHUB_REPO não definidos). Funcionalidade de PRs desabilitada.")
						}
						
						devStudioSvc := service.NewDevStudioService(devStudioRepo, cfg.GeminiAPIKey, memoryBankPath, githubSvc, cfg.GitHubContextBranch)
						devStudioHandler := handlers.NewDevStudioHandler(devStudioSvc)

						devStudio := api.Group("/v1/dev-studio",
							middleware.CorrelationIDMiddleware(),
							middleware.StructuredLoggingMiddleware(),
							middleware.SentryRecoveryMiddleware(),
							auth.AuthMiddleware(jwtSvc),
							auth.RequireDeveloper(),
							middleware.DevStudioRateLimit(),
						)
						{
						devStudio.GET("/usage", devStudioHandler.Usage)
						devStudio.POST("/chat", devStudioHandler.Chat)
						devStudio.POST("/refine", devStudioHandler.Refine)
						devStudio.POST("/validate/:request_id", devStudioHandler.Validate)
						devStudio.POST("/implement/:request_id", devStudioHandler.Implement)
						devStudio.DELETE("/:request_id", devStudioHandler.Cancel)
						devStudio.GET("/history", devStudioHandler.History)
						devStudio.GET("/status/:id", devStudioHandler.Status)
						devStudio.GET("/diff/:request_id", devStudioHandler.GetDiff)
						}

						slog.Info("Rotas do Dev Studio registradas")
					} else {
						slog.Warn("GEMINI_API_KEY não configurada: Dev Studio desabilitado")
					}

					slog.Info("Rotas de API registradas")
				}
			}
		}
	}

	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("Falha ao iniciar servidor", "error", err)
			os.Exit(1)
		}
	}()

	slog.Info("Servidor iniciado", "address", srv.Addr)

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	slog.Info("Encerrando servidor...")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		slog.Error("Erro ao encerrar servidor", "error", err)
		observability.Flush() // Garantir que eventos do Sentry sejam enviados
		os.Exit(1)
	}

	observability.Flush() // Garantir que eventos do Sentry sejam enviados
	slog.Info("Servidor encerrado com sucesso")
}

func corsMiddleware(origin string) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}

func runMigrations(databaseURL string) error {
	wd, err := os.Getwd()
	if err != nil {
		return err
	}
	abs, err := filepath.Abs(filepath.Join(wd, "migrations"))
	if err != nil {
		return err
	}
	if _, err := os.Stat(abs); err != nil {
		return err
	}
	sourceURL := "file://" + filepath.ToSlash(abs)
	m, err := migrate.New(sourceURL, databaseURL)
	if err != nil {
		return err
	}
	defer m.Close()

	if err := m.Up(); err != nil {
		if err == migrate.ErrNoChange {
			slog.Info("Migrações já estão em dia")
			return nil
		}
		return err
	}
	slog.Info("Migrações aplicadas")
	return nil
}

// logEnvStatus exibe um resumo das variáveis de ambiente carregadas
// para garantir que foram reconhecidas corretamente
func logEnvStatus(cfg *config.Config) {
	slog.Info("📋 Status das Variáveis de Ambiente",
		"port", cfg.Port,
		"env", cfg.Env,
		"log_level", cfg.LogLevel,
		"cors_origin", cfg.CORSOrigin,
	)

	// Verificar variáveis críticas
	status := make(map[string]string)

	if cfg.DatabaseURL != "" {
		// Mascarar senha na URL do banco
		maskedURL := cfg.DatabaseURL
		if strings.Contains(maskedURL, "@") {
			parts := strings.Split(maskedURL, "@")
			if len(parts) > 0 {
				userPass := strings.Split(parts[0], "://")
				if len(userPass) > 1 {
					credentials := strings.Split(userPass[1], ":")
					if len(credentials) > 1 {
						maskedURL = userPass[0] + "://" + credentials[0] + ":****@" + parts[1]
					}
				}
			}
		}
		status["database_url"] = "✅ Configurada (" + maskedURL + ")"
	} else {
		status["database_url"] = "⚠️  Não configurada"
	}

	if cfg.JWTPrivateKey != "" && cfg.JWTPublicKey != "" {
		status["jwt_keys"] = "✅ Configuradas"
	} else if cfg.Env == "development" {
		status["jwt_keys"] = "✅ Usando chaves de desenvolvimento"
	} else {
		status["jwt_keys"] = "⚠️  Não configuradas"
	}

	if cfg.GeminiAPIKey != "" {
		maskedKey := cfg.GeminiAPIKey[:min(8, len(cfg.GeminiAPIKey))] + "..." + cfg.GeminiAPIKey[max(0, len(cfg.GeminiAPIKey)-4):]
		status["gemini_api_key"] = "✅ Configurada (" + maskedKey + ")"
	} else {
		status["gemini_api_key"] = "⚠️  Não configurada (Dev Studio desabilitado)"
	}

	if cfg.GitHubToken != "" && cfg.GitHubRepo != "" {
		status["github"] = "✅ Configurado (" + cfg.GitHubRepo + ")"
	} else {
		status["github"] = "ℹ️  Não configurado (PRs automáticos desabilitados)"
	}

	// Log estruturado com status
	for key, value := range status {
		slog.Info("  " + key + ": " + value)
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
