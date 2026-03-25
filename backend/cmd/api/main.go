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
	"github.com/prometheus/client_golang/prometheus/promhttp"
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
	router.Use(middleware.PrometheusMiddleware())        // Métricas Prometheus
	router.Use(middleware.StructuredLoggingMiddleware()) // Logging estruturado
	router.Use(middleware.SentryRecoveryMiddleware())    // Captura de panics no Sentry

	// CORS
	router.Use(corsMiddleware(cfg.CORSOrigin))

	// Endpoint de métricas Prometheus
	router.GET("/metrics", gin.WrapH(promhttp.Handler()))
	slog.Info("Endpoint de métricas Prometheus registrado em /metrics")

	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":    "ok",
			"service":   "ceialmilk-api",
			"timestamp": time.Now().UTC().Format(time.RFC3339),
		})
	})

	var apiRoutesRegistered bool
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
					animalRepo := repository.NewAnimalRepository(pool)
					producaoRepo := repository.NewProducaoRepository(pool)
					loteRepo := repository.NewLoteRepository(pool)
					movimentacaoLoteRepo := repository.NewMovimentacaoLoteRepository(pool)
					cioRepo := repository.NewCioRepository(pool)
					protocoloIatfRepo := repository.NewProtocoloIATFRepository(pool)
					coberturaRepo := repository.NewCoberturaRepository(pool)
					diagnosticoGestacaoRepo := repository.NewDiagnosticoGestacaoRepository(pool)
					gestacaoRepo := repository.NewGestacaoRepository(pool)
					partoRepo := repository.NewPartoRepository(pool)
					criaRepo := repository.NewCriaRepository(pool)
					secagemRepo := repository.NewSecagemRepository(pool)
					lactacaoRepo := repository.NewLactacaoRepository(pool)
					refreshTokenRepo := repository.NewRefreshTokenRepository(pool)
					// Módulo agrícola
					fornecedorRepo := repository.NewFornecedorRepository(pool)
					areaRepo := repository.NewAreaRepository(pool)
					analiseSoloRepo := repository.NewAnaliseSoloRepository(pool)
					safraCulturaRepo := repository.NewSafraCulturaRepository(pool)
					custoAgricolaRepo := repository.NewCustoAgricolaRepository(pool)
					producaoAgricolaRepo := repository.NewProducaoAgricolaRepository(pool)
					receitaAgricolaRepo := repository.NewReceitaAgricolaRepository(pool)
					fazendaSvc := service.NewFazendaService(fazendaRepo)
					folgasRepo := repository.NewFolgasRepository(pool)
					folgasSvc := service.NewFolgasService(folgasRepo, fazendaSvc)
					folgasHandler := handlers.NewFolgasHandler(folgasSvc)
					animalSvc := service.NewAnimalService(animalRepo, fazendaRepo)
					reclassificacaoCategoriaSvc := service.NewReclassificacaoCategoriaService(animalRepo)
					producaoSvc := service.NewProducaoService(producaoRepo, animalRepo)
					refreshTokenSvc := service.NewRefreshTokenService(refreshTokenRepo)
					cookieSameSite := http.SameSiteStrictMode
					if !strings.Contains(cfg.CORSOrigin, "localhost") {
						cookieSameSite = http.SameSiteNoneMode // cross-origin (Vercel + Render)
					}
					authHandler := handlers.NewAuthHandler(userRepo, jwtSvc, refreshTokenSvc, cookieSameSite)
					fazendaHandler := handlers.NewFazendaHandler(fazendaSvc)
					animalHandler := handlers.NewAnimalHandler(animalSvc, fazendaSvc, reclassificacaoCategoriaSvc)
					producaoHandler := handlers.NewProducaoHandler(producaoSvc, animalSvc, fazendaSvc)
					usuarioSvc := service.NewUsuarioService(userRepo)
					adminHandler := handlers.NewAdminHandler(usuarioSvc, fazendaSvc)


					loteSvc := service.NewLoteService(loteRepo, fazendaRepo)
					movimentacaoLoteSvc := service.NewMovimentacaoLoteService(movimentacaoLoteRepo, animalRepo, loteRepo)
					cioSvc := service.NewCioService(cioRepo, animalRepo, fazendaRepo)
					loteHandler := handlers.NewLoteHandler(loteSvc, fazendaSvc)
					movimentacaoLoteHandler := handlers.NewMovimentacaoLoteHandler(movimentacaoLoteSvc, animalSvc, fazendaSvc)
					cioHandler := handlers.NewCioHandler(cioSvc, fazendaSvc)
					protocoloIatfSvc := service.NewProtocoloIATFService(protocoloIatfRepo, fazendaRepo)
					coberturaSvc := service.NewCoberturaService(coberturaRepo, animalRepo, fazendaRepo)
					diagnosticoGestacaoSvc := service.NewDiagnosticoGestacaoService(diagnosticoGestacaoRepo, animalRepo, gestacaoRepo, coberturaRepo, fazendaRepo)
					gestacaoSvc := service.NewGestacaoService(gestacaoRepo, animalRepo, fazendaRepo)
					partoSvc := service.NewPartoService(partoRepo, animalRepo, gestacaoRepo, lactacaoRepo, fazendaRepo)
					criaSvc := service.NewCriaService(criaRepo, partoRepo, animalRepo)
					secagemSvc := service.NewSecagemService(secagemRepo, animalRepo, fazendaRepo)
					lactacaoSvc := service.NewLactacaoService(lactacaoRepo, animalRepo, fazendaRepo)
					coberturaHandler := handlers.NewCoberturaHandler(coberturaSvc, fazendaSvc)
					diagnosticoGestacaoHandler := handlers.NewDiagnosticoGestacaoHandler(diagnosticoGestacaoSvc, fazendaSvc)
					gestacaoHandler := handlers.NewGestacaoHandler(gestacaoSvc, fazendaSvc)
					partoHandler := handlers.NewPartoHandler(partoSvc, fazendaSvc)
					criaHandler := handlers.NewCriaHandler(criaSvc)
					secagemHandler := handlers.NewSecagemHandler(secagemSvc, fazendaSvc)
					lactacaoHandler := handlers.NewLactacaoHandler(lactacaoSvc, fazendaSvc)
					protocoloIatfHandler := handlers.NewProtocoloIATFHandler(protocoloIatfSvc, fazendaSvc)
					// Serviços e handlers do módulo agrícola
					fornecedorSvc := service.NewFornecedorService(fornecedorRepo)
					areaSvc := service.NewAreaService(areaRepo)
					analiseSoloSvc := service.NewAnaliseSoloService(analiseSoloRepo)
					safraCulturaSvc := service.NewSafraCulturaService(safraCulturaRepo, areaRepo)
					custoAgricolaSvc := service.NewCustoAgricolaService(custoAgricolaRepo)
					producaoAgricolaSvc := service.NewProducaoAgricolaService(producaoAgricolaRepo)
					receitaAgricolaSvc := service.NewReceitaAgricolaService(receitaAgricolaRepo)
					resultadoAgricolaSvc := service.NewResultadoAgricolaService(fornecedorRepo, areaRepo, safraCulturaRepo, custoAgricolaRepo, receitaAgricolaRepo)
					fornecedorHandler := handlers.NewFornecedorHandler(fornecedorSvc, fazendaSvc)
					areaHandler := handlers.NewAreaHandler(areaSvc, fazendaSvc)
					analiseSoloHandler := handlers.NewAnaliseSoloHandler(analiseSoloSvc, areaSvc, fazendaSvc)
					safraCulturaHandler := handlers.NewSafraCulturaHandler(safraCulturaSvc, areaSvc, fazendaSvc)
					custoAgricolaHandler := handlers.NewCustoAgricolaHandler(custoAgricolaSvc, safraCulturaSvc, areaSvc, fazendaSvc)
					producaoAgricolaHandler := handlers.NewProducaoAgricolaHandler(producaoAgricolaSvc, safraCulturaSvc, areaSvc, fazendaSvc)
					receitaAgricolaHandler := handlers.NewReceitaAgricolaHandler(receitaAgricolaSvc, safraCulturaSvc, areaSvc, fazendaSvc)
					resultadoAgricolaHandler := handlers.NewResultadoAgricolaHandler(resultadoAgricolaSvc, areaSvc, fazendaSvc)
					api := router.Group("/api")
					api.POST("/auth/register", authHandler.Register)
					api.POST("/auth/login", authHandler.Login)
					api.POST("/auth/logout", authHandler.Logout)
					api.POST("/auth/refresh", authHandler.Refresh)
					api.POST("/auth/validate", authHandler.Validate)

					// Minhas fazendas (usuário logado)
					me := api.Group("/v1/me", auth.AuthMiddleware(jwtSvc))
					{
						me.GET("/fazendas", fazendaHandler.GetMinhasFazendas)
					}

					v1 := api.Group("/v1/fazendas", auth.AuthMiddleware(jwtSvc))
					{
						v1.GET("", fazendaHandler.GetAll)
						v1.GET("/count", fazendaHandler.Count)
						v1.GET("/exists", fazendaHandler.Exists)
						v1.GET("/search/by-nome", fazendaHandler.SearchByNome)
						v1.GET("/search/by-localizacao", fazendaHandler.SearchByLocalizacao)
						v1.GET("/search/by-vacas-min", fazendaHandler.SearchByVacasMin)
						v1.GET("/search/by-vacas-range", fazendaHandler.SearchByVacasRange)
						v1.GET("/:id/usuarios-vinculados", fazendaHandler.GetUsuariosVinculados)
						v1.GET("/:id", fazendaHandler.GetByID)
						// Criar, editar e excluir fazendas requerem perfil ADMIN ou DEVELOPER
						v1.POST("", auth.RequireAdmin(), fazendaHandler.Create)
						v1.PUT("/:id", auth.RequireAdmin(), fazendaHandler.Update)
						v1.DELETE("/:id", auth.RequireAdmin(), fazendaHandler.Delete)
						// Animais por fazenda
						v1.GET("/:id/animais", animalHandler.GetByFazendaID)
						v1.GET("/:id/animais/count", animalHandler.CountByFazenda)
						// Módulo agrícola: fornecedores e áreas por fazenda
						v1.GET("/:id/fornecedores/comparativo/:ano", resultadoAgricolaHandler.GetComparativoFornecedores)
						v1.GET("/:id/fornecedores", fornecedorHandler.GetByFazendaID)
						v1.POST("/:id/fornecedores", fornecedorHandler.Create)
						v1.GET("/:id/areas", areaHandler.GetByFazendaID)
						v1.POST("/:id/areas", areaHandler.Create)
						v1.GET("/:id/resultado-agricola/:ano", resultadoAgricolaHandler.GetByFazendaIDAndAno)
						// Folgas (escala 5x1)
						v1.GET("/:id/folgas/config", folgasHandler.GetConfig)
						v1.PUT("/:id/folgas/config", auth.RequireGestaoFolgas(), folgasHandler.PutConfig)
						v1.GET("/:id/folgas/escala", folgasHandler.GetEscala)
						v1.POST("/:id/folgas/gerar", auth.RequireGestaoFolgas(), folgasHandler.PostGerar)
						v1.POST("/:id/folgas/alteracoes", auth.RequireGestaoFolgas(), folgasHandler.PostAlteracoes)
						v1.POST("/:id/folgas/justificativas", folgasHandler.PostJustificativa)
						v1.GET("/:id/folgas/alteracoes", folgasHandler.GetAlteracoes)
						v1.GET("/:id/folgas/alertas", folgasHandler.GetAlertas)
					}

					// Rotas de Animais
					animais := api.Group("/v1/animais", auth.AuthMiddleware(jwtSvc))
					{
						animais.GET("", animalHandler.GetAll)
						animais.GET("/count", animalHandler.Count)
						animais.GET("/search/by-identificacao", animalHandler.SearchByIdentificacao)
						animais.GET("/filter/by-status-saude", animalHandler.GetByStatusSaude)
						animais.GET("/filter/by-sexo", animalHandler.GetBySexo)
						animais.GET("/filter/by-lote", animalHandler.GetByLoteID)
						animais.GET("/filter/by-categoria", animalHandler.GetByCategoria)
						animais.GET("/filter/by-status-reprodutivo", animalHandler.GetByStatusReprodutivo)
						animais.POST("/reclassificar-categoria", animalHandler.RunReclassificacaoPorIdade)
						animais.GET("/:id", animalHandler.GetByID)
						animais.POST("", animalHandler.Create)
						animais.PUT("/:id", animalHandler.Update)
						animais.DELETE("/:id", animalHandler.Delete)
						// Produção por animal
						animais.GET("/:id/producao", producaoHandler.GetByAnimalID)
						animais.GET("/:id/producao/count", producaoHandler.CountByAnimal)
						animais.GET("/:id/producao/resumo", producaoHandler.GetResumoByAnimal)
					}
					slog.Info("Rotas de Animais registradas")

					// Rotas de Produção de Leite
					producao := api.Group("/v1/producao", auth.AuthMiddleware(jwtSvc))
					{
						producao.GET("", producaoHandler.GetAll)
						producao.GET("/count", producaoHandler.Count)
						producao.GET("/filter/by-date", producaoHandler.GetByDateRange)
						producao.GET("/:id", producaoHandler.GetByID)
						producao.POST("", producaoHandler.Create)
						producao.PUT("/:id", producaoHandler.Update)
						producao.DELETE("/:id", producaoHandler.Delete)
					}
					slog.Info("Rotas de Produção de Leite registradas")

					// Rotas de Lotes
					lotes := api.Group("/v1/lotes", auth.AuthMiddleware(jwtSvc))
					{
						lotes.GET("", loteHandler.GetByFazendaID)
						lotes.GET("/:id", loteHandler.GetByID)
						lotes.POST("", loteHandler.Create)
						lotes.PUT("/:id", loteHandler.Update)
						lotes.DELETE("/:id", loteHandler.Delete)
					}
					// Movimentar animal de lote
					animais.POST("/:id/movimentar-lote", movimentacaoLoteHandler.Movimentar)
					// Rotas de Cios
					cios := api.Group("/v1/cios", auth.AuthMiddleware(jwtSvc))
					{
						cios.GET("", cioHandler.GetByFazendaID)
						cios.GET("/by-animal/:id", cioHandler.GetByAnimalID)
						cios.GET("/:id", cioHandler.GetByID)
						cios.POST("", cioHandler.Create)
						cios.PUT("/:id", cioHandler.Update)
						cios.DELETE("/:id", cioHandler.Delete)
					}
					// Coberturas
					coberturas := api.Group("/v1/coberturas", auth.AuthMiddleware(jwtSvc))
					{
						coberturas.GET("", coberturaHandler.GetByFazendaID)
						coberturas.GET("/:id", coberturaHandler.GetByID)
						coberturas.POST("", coberturaHandler.Create)
					}
					// Toques (diagnosticos de gestacao)
					toques := api.Group("/v1/toques", auth.AuthMiddleware(jwtSvc))
					{
						toques.GET("", diagnosticoGestacaoHandler.GetByFazendaID)
						toques.POST("", diagnosticoGestacaoHandler.Create)
					}
					// Gestacoes
					gestacoes := api.Group("/v1/gestacoes", auth.AuthMiddleware(jwtSvc))
					{
						gestacoes.GET("", gestacaoHandler.GetByFazendaID)
					}
					// Partos
					partos := api.Group("/v1/partos", auth.AuthMiddleware(jwtSvc))
					{
						partos.GET("", partoHandler.GetByFazendaID)
						partos.POST("", partoHandler.Create)
					}
					// Crias
					crias := api.Group("/v1/crias", auth.AuthMiddleware(jwtSvc))
					{
						crias.GET("", criaHandler.GetByPartoID)
						crias.POST("", criaHandler.Create)
					}
					// Secagens
					secagens := api.Group("/v1/secagens", auth.AuthMiddleware(jwtSvc))
					{
						secagens.GET("", secagemHandler.GetByFazendaID)
						secagens.POST("", secagemHandler.Create)
					}
					// Lactacoes
					lactacoes := api.Group("/v1/lactacoes", auth.AuthMiddleware(jwtSvc))
					{
						lactacoes.GET("", lactacaoHandler.GetByFazendaID)
						lactacoes.POST("", lactacaoHandler.Create)
					}
					// Protocolos IATF
					protocolosIatf := api.Group("/v1/protocolos-iatf", auth.AuthMiddleware(jwtSvc))
					{
						protocolosIatf.GET("", protocoloIatfHandler.GetByFazendaID)
						protocolosIatf.POST("", protocoloIatfHandler.Create)
					}

					// Módulo agrícola: fornecedores (CRUD por id)
					fornecedores := api.Group("/v1/fornecedores", auth.AuthMiddleware(jwtSvc))
					{
						fornecedores.GET("/:id", fornecedorHandler.GetByID)
						fornecedores.PUT("/:id", fornecedorHandler.Update)
						fornecedores.DELETE("/:id", fornecedorHandler.Delete)
					}
					// Módulo agrícola: áreas (CRUD por id)
					areas := api.Group("/v1/areas", auth.AuthMiddleware(jwtSvc))
					{
						areas.GET("/:id", areaHandler.GetByID)
						areas.PUT("/:id", areaHandler.Update)
						areas.DELETE("/:id", areaHandler.Delete)
						areas.GET("/:id/analises-solo", analiseSoloHandler.GetByAreaID)
						areas.POST("/:id/analises-solo", analiseSoloHandler.Create)
						areas.GET("/:id/safras/:ano", safraCulturaHandler.GetByAreaIDAndAno)
						areas.GET("/:id/resultado/:ano", resultadoAgricolaHandler.GetByAreaIDAndAno)
					}
					// Módulo agrícola: safras-culturas
					safrasCulturas := api.Group("/v1/safras-culturas", auth.AuthMiddleware(jwtSvc))
					{
						safrasCulturas.POST("", safraCulturaHandler.Create)
						safrasCulturas.GET("/:id", safraCulturaHandler.GetByID)
						safrasCulturas.PUT("/:id", safraCulturaHandler.Update)
						safrasCulturas.DELETE("/:id", safraCulturaHandler.Delete)
						safrasCulturas.GET("/:id/custos", custoAgricolaHandler.GetBySafraCulturaID)
						safrasCulturas.POST("/:id/custos", custoAgricolaHandler.Create)
						safrasCulturas.GET("/:id/producoes", producaoAgricolaHandler.GetBySafraCulturaID)
						safrasCulturas.POST("/:id/producoes", producaoAgricolaHandler.Create)
						safrasCulturas.GET("/:id/receitas", receitaAgricolaHandler.GetBySafraCulturaID)
						safrasCulturas.POST("/:id/receitas", receitaAgricolaHandler.Create)
					}

					// Admin routes (perfil ADMIN ou DEVELOPER)
					admin := api.Group("/v1/admin", auth.AuthMiddleware(jwtSvc), auth.RequireAdmin())
					{
						admin.GET("/usuarios", adminHandler.ListUsuarios)
						admin.POST("/usuarios", adminHandler.CreateUsuario)
						admin.PUT("/usuarios/:id", adminHandler.UpdateUsuario)
						admin.PATCH("/usuarios/:id/toggle-enabled", adminHandler.ToggleEnabled)
						admin.GET("/usuarios/:id/fazendas", adminHandler.GetUsuarioFazendas)
						admin.PUT("/usuarios/:id/fazendas", adminHandler.SetUsuarioFazendas)
					}
					slog.Info("Rotas de Admin registradas")

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

						devStudioSvc := service.NewDevStudioService(devStudioRepo, cfg.GeminiAPIKey, cfg.GeminiModel, memoryBankPath, githubSvc, cfg.GitHubContextBranch)
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

						// Assistente em linguagem natural (interpretar + executar; qualquer usuário autenticado)
						modelAssistente := cfg.GeminiModelAssistente
						if modelAssistente == "" {
							modelAssistente = cfg.GeminiModel
						}
					assistenteSvc := service.NewAssistenteService(cfg.GeminiAPIKey, modelAssistente, fazendaSvc, animalSvc, producaoSvc)
					assistenteHandler := handlers.NewAssistenteHandler(assistenteSvc, userRepo)
					
					// Assistente Live (Multimodal)
					assistenteLiveSvc, err := service.NewAssistenteLiveService(
						cfg.GeminiAPIKey, cfg.GeminiModel,
						fazendaSvc, animalSvc, producaoSvc,
						loteSvc, cioSvc, coberturaSvc,
						diagnosticoGestacaoSvc, gestacaoSvc,
						partoSvc, secagemSvc, lactacaoSvc,
						movimentacaoLoteSvc,
					)
					if err != nil {
						slog.Warn("Falha ao inicializar Assistente Live", "error", err)
					}
					assistenteLiveHandler := handlers.NewAssistenteLiveHandler(assistenteLiveSvc, userRepo, cfg.CORSOrigin)

					assistente := api.Group("/v1/assistente")
					{
						// Rotas HTTP normais continuam com AuthMiddleware padrão
						assistente.POST("/interpretar", auth.AuthMiddleware(jwtSvc), assistenteHandler.Interpretar)
						assistente.POST("/executar", auth.AuthMiddleware(jwtSvc), assistenteHandler.Executar)
						
						// Rota WebSocket Live (AuthMiddleware injetado manualmente ou via sub-grupo se necessário)
						assistente.GET("/live", auth.AuthMiddleware(jwtSvc), assistenteLiveHandler.LiveSession)
					}
					slog.Info("Rotas do Assistente (linguagem natural e live) registradas")
					} else {
						slog.Warn("GEMINI_API_KEY não configurada: Dev Studio e Assistente desabilitados")
					}

					apiRoutesRegistered = true
					slog.Info("Rotas de API registradas")
				}
			}
		}
	}

	// Quando a API está em modo degradado (DB/JWT não configurados), /api/* retorna 503 em vez de 404
	if !apiRoutesRegistered {
		apiFallback := router.Group("/api")
		apiFallback.Any("/*path", func(c *gin.Context) {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"error":     "service_unavailable",
				"message":   "API temporariamente indisponível. Verifique DATABASE_URL, conexão com o banco e chaves JWT. Consulte os logs do servidor.",
				"timestamp": time.Now().UTC().Format(time.RFC3339),
			})
		})
		slog.Info("Rotas /api em modo degradado: requisições retornam 503 até configuração completa")
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
		status["gemini_model"] = cfg.GeminiModel
		if cfg.GeminiModelAssistente != "" {
			status["gemini_model_assistente"] = cfg.GeminiModelAssistente
		} else {
			status["gemini_model_assistente"] = "(usa " + cfg.GeminiModel + ")"
		}
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
