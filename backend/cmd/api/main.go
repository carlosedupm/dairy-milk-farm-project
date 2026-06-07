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
	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/observability"
	apidocs "github.com/ceialmilk/api/internal/openapi"
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

	if cfg.Env == "production" {
		// Render e outros LB enviam X-Forwarded-For; necessário para rate limit por IP real.
		if err := router.SetTrustedProxies([]string{"0.0.0.0/0", "::/0"}); err != nil {
			slog.Warn("Falha ao configurar trusted proxies", "error", err)
		}
	} else {
		_ = router.SetTrustedProxies(nil)
	}

	// Middlewares de observabilidade (ordem importa)
	router.Use(middleware.CorrelationIDMiddleware())     // Correlation ID primeiro
	router.Use(middleware.PrometheusMiddleware())        // Métricas Prometheus
	router.Use(middleware.StructuredLoggingMiddleware()) // Logging estruturado
	router.Use(middleware.SentryRecoveryMiddleware())    // Captura de panics no Sentry

	// CORS
	router.Use(corsMiddleware(cfg.CORSOrigin))
	router.Use(middleware.SecurityHeadersMiddleware(cfg.Env == "production"))

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

	apidocs.RegisterIntegracaoDocsRoutes(router)
	slog.Info("Rotas OpenAPI integracoes registradas: /api/v1/integracoes/openapi.yaml, /docs")

	var apiRoutesRegistered bool
	var alertasCronCancel context.CancelFunc
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
					animalSaudeRepo := repository.NewAnimalSaudeRepository(pool)
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
					animalSvc := service.NewAnimalService(animalRepo, fazendaRepo, gestacaoRepo)
					animalSaudeSvc := service.NewAnimalSaudeService(animalSaudeRepo, animalRepo)
					reclassificacaoCategoriaSvc := service.NewReclassificacaoCategoriaService(animalRepo)
					producaoSvc := service.NewProducaoService(producaoRepo, animalRepo, lactacaoRepo)
					lactacaoSvc := service.NewLactacaoService(lactacaoRepo, animalRepo, fazendaRepo)
					restricaoLeiteRepo := repository.NewRestricaoLeiteRepository(pool)
					restricaoLeiteSvc := service.NewRestricaoLeiteService(restricaoLeiteRepo, animalRepo, lactacaoRepo)
					alertaRepo := repository.NewAlertaRepository(pool)
					alertaSvc := service.NewAlertaService(alertaRepo, animalRepo)
					pushSubRepo := repository.NewPushSubscriptionRepository(pool)
					pushSvc := service.NewPushNotificationService(cfg, pushSubRepo, fazendaRepo, alertaRepo)
					alertaSvc.SetPushNotificationService(pushSvc)
					pushHandler := handlers.NewPushHandler(pushSvc)
					animalBaixaSvc := service.NewAnimalBaixaService(pool, animalRepo, lactacaoRepo, gestacaoRepo, restricaoLeiteRepo)
					refreshTokenSvc := service.NewRefreshTokenService(refreshTokenRepo)
					cookieSameSite := http.SameSiteStrictMode
					if !strings.Contains(cfg.CORSOrigin, "localhost") {
						cookieSameSite = http.SameSiteNoneMode // cross-origin (Vercel + Render)
					}
					authHandler := handlers.NewAuthHandler(userRepo, jwtSvc, refreshTokenSvc, cookieSameSite)
					fazendaHandler := handlers.NewFazendaHandler(fazendaSvc)
					resumoPecuarioSvc := service.NewResumoPecuarioService(gestacaoRepo, restricaoLeiteRepo, producaoRepo, animalRepo)
					resumoPecuarioHandler := handlers.NewResumoPecuarioHandler(resumoPecuarioSvc, fazendaSvc)
					restricaoLeiteHandler := handlers.NewRestricaoLeiteHandler(restricaoLeiteSvc, fazendaSvc)
					alertaHandler := handlers.NewAlertaHandler(alertaSvc, fazendaSvc)
					producaoHandler := handlers.NewProducaoHandler(producaoSvc, animalSvc, fazendaSvc, lactacaoSvc)
					usuarioSvc := service.NewUsuarioService(userRepo)
					adminHandler := handlers.NewAdminHandler(usuarioSvc, fazendaSvc)

					loteSvc := service.NewLoteService(loteRepo, fazendaRepo)
					movimentacaoLoteSvc := service.NewMovimentacaoLoteService(movimentacaoLoteRepo, animalRepo, loteRepo)
					cioSvc := service.NewCioService(cioRepo, animalRepo, fazendaRepo)
					loteHandler := handlers.NewLoteHandler(loteSvc, fazendaSvc)
					movimentacaoLoteHandler := handlers.NewMovimentacaoLoteHandler(movimentacaoLoteSvc, animalSvc, fazendaSvc)
					cioHandler := handlers.NewCioHandler(cioSvc, fazendaSvc)
					protocoloIatfSvc := service.NewProtocoloIATFService(protocoloIatfRepo, fazendaRepo)
					coberturaSvc := service.NewCoberturaService(coberturaRepo, animalRepo, fazendaRepo, gestacaoRepo, diagnosticoGestacaoRepo, cioRepo)
					diagnosticoGestacaoSvc := service.NewDiagnosticoGestacaoService(diagnosticoGestacaoRepo, animalRepo, gestacaoRepo, coberturaRepo, fazendaRepo)
					gestacaoSvc := service.NewGestacaoService(gestacaoRepo, animalRepo, fazendaRepo)
					timelineRepo := repository.NewTimelineRepository(pool)
					animalCicloSvc := service.NewAnimalCicloService(cioRepo, coberturaRepo, diagnosticoGestacaoRepo, gestacaoRepo, secagemRepo, partoRepo, lactacaoRepo, producaoRepo, animalSaudeRepo, timelineRepo, userRepo)
					conformidadeSvc := service.NewConformidadeService(pool)
					conformidadeHandler := handlers.NewConformidadeHandler(conformidadeSvc, fazendaSvc)
					alertasEstadoRepo := repository.NewAlertasGeracaoEstadoRepository(pool)
					alertaGeracaoLoc, locErr := time.LoadLocation(cfg.AlertasTZ)
					if locErr != nil || cfg.AlertasTZ == "" {
						alertaGeracaoLoc, _ = time.LoadLocation("America/Sao_Paulo")
					}
					var alertaGeracaoSvc *service.AlertaGeracaoService
					alertaGeracaoSvc, geracaoErr := service.NewAlertaGeracaoService(
						alertaRepo,
						fazendaRepo,
						animalSaudeRepo,
						gestacaoRepo,
						restricaoLeiteRepo,
						cioRepo,
						conformidadeSvc,
						alertasEstadoRepo,
						userRepo,
						alertaGeracaoLoc,
					)
					if geracaoErr != nil {
						slog.Warn("Geração automática de alertas indisponível", "error", geracaoErr)
					} else {
						alertaGeracaoSvc.SetPushNotificationService(pushSvc)
						animalSaudeSvc.SetAlertaAutoResolver(alertaGeracaoSvc)
						restricaoLeiteSvc.SetAlertaAutoResolver(alertaGeracaoSvc)
						cronCtx, cancel := context.WithCancel(context.Background())
						alertasCronCancel = cancel
						service.RunAlertasCron(cronCtx, cfg, alertaGeracaoSvc)
					}
					var alertaAdminHandler *handlers.AlertaAdminHandler
					if alertaGeracaoSvc != nil {
						alertaAdminHandler = handlers.NewAlertaAdminHandler(alertaGeracaoSvc)
					}
					animalHandler := handlers.NewAnimalHandler(animalSvc, animalBaixaSvc, fazendaSvc, producaoSvc, reclassificacaoCategoriaSvc, restricaoLeiteSvc, gestacaoSvc, animalCicloSvc, animalSaudeSvc, userRepo)
					animalSaudeHandler := handlers.NewAnimalSaudeHandler(animalSaudeSvc, animalSvc, fazendaSvc)
					criaSvc := service.NewCriaService(pool, criaRepo, partoRepo, animalRepo)
					partoSvc := service.NewPartoService(pool, partoRepo, animalRepo, gestacaoRepo, lactacaoRepo, fazendaRepo, criaSvc)
					secagemSvc := service.NewSecagemService(pool, secagemRepo, lactacaoRepo, animalRepo, fazendaRepo)
					if alertaGeracaoSvc != nil {
						secagemSvc.SetAlertaAutoResolver(alertaGeracaoSvc)
					}
					coberturaHandler := handlers.NewCoberturaHandler(coberturaSvc, fazendaSvc)
					diagnosticoGestacaoHandler := handlers.NewDiagnosticoGestacaoHandler(diagnosticoGestacaoSvc, fazendaSvc, animalSvc)
					integracaoRepo := repository.NewIntegracaoRepository(pool)
					integracaoSvc := service.NewIntegracaoService(integracaoRepo, userRepo)
					integracaoHandler := handlers.NewIntegracaoHandler(integracaoSvc, animalSvc, diagnosticoGestacaoSvc, coberturaSvc, animalSaudeSvc, alertaSvc)
					integracaoAdminHandler := handlers.NewIntegracaoAdminHandler(integracaoSvc)
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
					authPublic := api.Group("/auth")
					loginWindow := time.Duration(cfg.AuthLoginRateWindowMinutes) * time.Minute
					if cfg.AuthLoginRateWindowMinutes <= 0 {
						loginWindow = 15 * time.Minute
					}
					loginLimit := cfg.AuthLoginRateLimit
					if loginLimit <= 0 {
						loginLimit = 10
					}
					registerLimit := cfg.AuthRegisterRateLimit
					if registerLimit <= 0 {
						registerLimit = 5
					}
					refreshLimit := cfg.AuthRefreshRateLimit
					if refreshLimit <= 0 {
						refreshLimit = 30
					}
					authPublic.POST("/register",
						middleware.AuthRateLimit(middleware.AuthRateLimitConfig{Limit: registerLimit, Window: time.Hour}),
						authHandler.Register,
					)
					authPublic.POST("/login",
						middleware.AuthRateLimit(middleware.AuthRateLimitConfig{Limit: loginLimit, Window: loginWindow}),
						authHandler.Login,
					)
					authPublic.POST("/logout", authHandler.Logout)
					authPublic.POST("/refresh",
						middleware.AuthRateLimit(middleware.AuthRateLimitConfig{Limit: refreshLimit, Window: time.Hour}),
						authHandler.Refresh,
					)
					authPublic.POST("/validate", authHandler.Validate)

					// Minhas fazendas (usuário logado)
					me := api.Group("/v1/me", auth.AuthMiddleware(jwtSvc), auth.RequirePerfilAPIAccess())
					{
						me.GET("", authHandler.Me)
						me.GET("/fazendas", fazendaHandler.GetMinhasFazendas)
						me.POST("/fazendas", fazendaHandler.CreateMinha)
						me.PUT("/fazenda-ativa", pushHandler.UpdateFazendaAtiva)
						me.GET("/push/vapid-public-key", pushHandler.GetVapidPublicKey)
						me.PUT("/push-subscription", pushHandler.UpsertSubscription)
						me.DELETE("/push-subscription", pushHandler.DeleteSubscription)
					}

					v1 := api.Group("/v1/fazendas", auth.AuthMiddleware(jwtSvc), auth.RequirePerfilAPIAccess())
					{
						v1.GET("", auth.RequireAdmin(), fazendaHandler.GetAll)
						v1.GET("/count", auth.RequireAdmin(), fazendaHandler.Count)
						v1.GET("/exists", auth.RequireAdmin(), fazendaHandler.Exists)
						v1.GET("/search/by-nome", auth.RequireAdmin(), fazendaHandler.SearchByNome)
						v1.GET("/search/by-localizacao", auth.RequireAdmin(), fazendaHandler.SearchByLocalizacao)
						v1.GET("/search/by-vacas-min", auth.RequireAdmin(), fazendaHandler.SearchByVacasMin)
						v1.GET("/search/by-vacas-range", auth.RequireAdmin(), fazendaHandler.SearchByVacasRange)
						v1.GET("/:id/usuarios-vinculados", fazendaHandler.GetUsuariosVinculados)
						v1.GET("/:id/resumo-pecuario", resumoPecuarioHandler.GetByFazendaID)
						v1.GET("/:id/auditoria/conformidade", conformidadeHandler.GetConformidade)
						v1.GET("/:id", fazendaHandler.GetByID)
						// Criar e editar fazendas requerem perfil ADMIN ou DEVELOPER; excluir: ADMIN/DEVELOPER/GESTAO/PROPRIETARIO
						v1.POST("", auth.RequireAdmin(), fazendaHandler.Create)
						v1.PUT("/:id", auth.RequireAdmin(), fazendaHandler.Update)
						v1.DELETE("/:id", auth.RequirePodeDeletarFazenda(), fazendaHandler.Delete)
						// Animais por fazenda
						v1.GET("/:id/animais", animalHandler.GetByFazendaID)
						v1.GET("/:id/animais/count", animalHandler.CountByFazenda)
						v1.GET("/:id/animais/em-lactacao", animalHandler.GetEmLactacaoByFazendaID)
						v1.GET("/:id/animais/para-cobertura", animalHandler.GetParaCoberturaByFazendaID)
						v1.GET("/:id/animais/para-toque", animalHandler.GetParaToqueByFazendaID)
						v1.GET("/:id/animais/para-parto", animalHandler.GetParaPartoByFazendaID)
						v1.GET("/:id/animais/para-abertura-lactacao", animalHandler.GetParaAberturaLactacaoByFazendaID)
						// Restrições de leite (descarte / laboratório)
						v1.GET("/:id/restricoes-leite/ativas", restricaoLeiteHandler.GetAtivas)
						v1.POST("/:id/restricoes-leite", restricaoLeiteHandler.Create)
						v1.PATCH("/:id/restricoes-leite/:restricaoId/liberar", restricaoLeiteHandler.Liberar)
						// Alertas proativos
						v1.GET("/:id/alertas", alertaHandler.List)
						v1.POST("/:id/alertas", alertaHandler.Create)
						v1.GET("/:id/alertas/:alertaId", alertaHandler.GetByID)
						v1.PATCH("/:id/alertas/:alertaId/status", alertaHandler.UpdateStatus)
						v1.DELETE("/:id/alertas/:alertaId", alertaHandler.Delete)
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
						v1.GET("/:id/folgas/resumo-equidade", folgasHandler.GetResumoEquidade)
					}

					// Rotas de Animais
					animais := api.Group("/v1/animais", auth.AuthMiddleware(jwtSvc), auth.RequirePerfilAPIAccess())
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
						animais.GET("/:id/contexto", animalHandler.GetContextoByID)
						animais.GET("/:id/timeline", animalHandler.GetTimelineByID)
						animais.GET("/:id/saude", animalSaudeHandler.List)
						animais.GET("/:id/saude/:saudeId", animalSaudeHandler.GetByID)
						animais.POST("/:id/saude", animalSaudeHandler.Create)
						animais.PUT("/:id/saude/:saudeId", animalSaudeHandler.Update)
						animais.DELETE("/:id/saude/:saudeId", animalSaudeHandler.Delete)
						animais.POST("/:id/baixa/reverter", animalHandler.ReverterBaixa)
						animais.POST("/:id/baixa", animalHandler.RegistrarBaixa)
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
					producao := api.Group("/v1/producao", auth.AuthMiddleware(jwtSvc), auth.RequirePerfilAPIAccess())
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
					lotes := api.Group("/v1/lotes", auth.AuthMiddleware(jwtSvc), auth.RequirePerfilAPIAccess())
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
					cios := api.Group("/v1/cios", auth.AuthMiddleware(jwtSvc), auth.RequirePerfilAPIAccess())
					{
						cios.GET("", cioHandler.GetByFazendaID)
						cios.GET("/by-animal/:id", cioHandler.GetByAnimalID)
						cios.GET("/:id", cioHandler.GetByID)
						cios.POST("", cioHandler.Create)
						cios.PUT("/:id", cioHandler.Update)
						cios.DELETE("/:id", cioHandler.Delete)
					}
					// Coberturas
					coberturas := api.Group("/v1/coberturas", auth.AuthMiddleware(jwtSvc), auth.RequirePerfilAPIAccess())
					{
						coberturas.GET("", coberturaHandler.GetByFazendaID)
						coberturas.GET("/:id", coberturaHandler.GetByID)
						coberturas.POST("", coberturaHandler.Create)
						coberturas.PUT("/:id", coberturaHandler.Update)
						coberturas.DELETE("/:id", coberturaHandler.Delete)
					}
					// Toques (diagnosticos de gestacao)
					toques := api.Group("/v1/toques", auth.AuthMiddleware(jwtSvc), auth.RequirePerfilAPIAccess())
					{
						toques.GET("", diagnosticoGestacaoHandler.GetByFazendaID)
						toques.POST("", diagnosticoGestacaoHandler.Create)
						toques.POST("/lote", diagnosticoGestacaoHandler.CreateLote)
					}
					// Gestacoes
					gestacoes := api.Group("/v1/gestacoes", auth.AuthMiddleware(jwtSvc), auth.RequirePerfilAPIAccess())
					{
						gestacoes.GET("", gestacaoHandler.GetByFazendaID)
					}
					// Partos
					partos := api.Group("/v1/partos", auth.AuthMiddleware(jwtSvc), auth.RequirePerfilAPIAccess())
					{
						partos.GET("", partoHandler.GetByFazendaID)
						partos.GET("/:id", partoHandler.GetByID)
						partos.POST("", partoHandler.Create)
						partos.PUT("/:id", partoHandler.Update)
						partos.DELETE("/:id", partoHandler.Delete)
					}
					// Crias
					crias := api.Group("/v1/crias", auth.AuthMiddleware(jwtSvc), auth.RequirePerfilAPIAccess())
					{
						crias.GET("", criaHandler.GetByPartoID)
						crias.POST("", criaHandler.Create)
					}
					// Secagens
					secagens := api.Group("/v1/secagens", auth.AuthMiddleware(jwtSvc), auth.RequirePerfilAPIAccess())
					{
						secagens.GET("", secagemHandler.GetByFazendaID)
						secagens.POST("", secagemHandler.Create)
					}
					// Lactacoes
					lactacoes := api.Group("/v1/lactacoes", auth.AuthMiddleware(jwtSvc), auth.RequirePerfilAPIAccess())
					{
						lactacoes.GET("", lactacaoHandler.GetByFazendaID)
						lactacoes.POST("", lactacaoHandler.Create)
					}
					// Protocolos IATF
					protocolosIatf := api.Group("/v1/protocolos-iatf", auth.AuthMiddleware(jwtSvc), auth.RequirePerfilAPIAccess())
					{
						protocolosIatf.GET("", protocoloIatfHandler.GetByFazendaID)
						protocolosIatf.POST("", protocoloIatfHandler.Create)
					}

					// Módulo agrícola: fornecedores (CRUD por id)
					fornecedores := api.Group("/v1/fornecedores", auth.AuthMiddleware(jwtSvc), auth.RequirePerfilAPIAccess())
					{
						fornecedores.GET("/:id", fornecedorHandler.GetByID)
						fornecedores.PUT("/:id", fornecedorHandler.Update)
						fornecedores.DELETE("/:id", fornecedorHandler.Delete)
					}
					// Módulo agrícola: áreas (CRUD por id)
					areas := api.Group("/v1/areas", auth.AuthMiddleware(jwtSvc), auth.RequirePerfilAPIAccess())
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
					safrasCulturas := api.Group("/v1/safras-culturas", auth.AuthMiddleware(jwtSvc), auth.RequirePerfilAPIAccess())
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
					admin := api.Group("/v1/admin", auth.AuthMiddleware(jwtSvc), auth.RequirePerfilAPIAccess(), auth.RequireAdmin())
					{
						admin.GET("/usuarios/pendentes-provisao", adminHandler.ListPendentesProvisao)
						admin.GET("/usuarios", adminHandler.ListUsuarios)
						admin.POST("/usuarios", adminHandler.CreateUsuario)
						admin.PUT("/usuarios/:id", adminHandler.UpdateUsuario)
						admin.PATCH("/usuarios/:id/toggle-enabled", adminHandler.ToggleEnabled)
						admin.GET("/usuarios/:id/fazendas", adminHandler.GetUsuarioFazendas)
						admin.PUT("/usuarios/:id/fazendas", adminHandler.SetUsuarioFazendas)
						admin.GET("/integracoes", integracaoAdminHandler.List)
						admin.POST("/integracoes", integracaoAdminHandler.Create)
						admin.GET("/integracoes/:id", integracaoAdminHandler.GetByID)
						admin.PATCH("/integracoes/:id", integracaoAdminHandler.Update)
						admin.POST("/integracoes/:id/rotacionar-chave", integracaoAdminHandler.RotacionarChave)
						admin.POST("/integracoes/:id/revogar", integracaoAdminHandler.Revogar)
						admin.GET("/integracoes/:id/chamadas", integracaoAdminHandler.ListChamadas)
						if alertaAdminHandler != nil {
							admin.POST("/alertas/gerar", alertaAdminHandler.GerarAlertasDiarios)
						}
					}
					slog.Info("Rotas de Admin registradas")

					integracaoRL := cfg.IntegrationRateLimitPerHour
					if integracaoRL <= 0 {
						integracaoRL = 300
					}
					integ := api.Group("/v1/integracoes",
						auth.IntegrationAuthMiddleware(integracaoSvc),
						middleware.IntegrationRateLimit(integracaoRL),
						middleware.IntegrationAuditMiddleware(integracaoSvc),
					)
					{
						integ.GET("/me", integracaoHandler.Me)
						integ.GET("/animais/search", auth.RequireIntegrationScope(models.ScopeAnimaisRead), integracaoHandler.SearchAnimais)
						integ.GET("/animais/:id", auth.RequireIntegrationScope(models.ScopeAnimaisRead), integracaoHandler.GetAnimal)
						integ.GET("/coberturas", auth.RequireIntegrationScope(models.ScopeCoberturasRead), integracaoHandler.ListCoberturas)
						integ.POST("/coberturas", auth.RequireIntegrationScope(models.ScopeCoberturasWrite), integracaoHandler.CreateCobertura)
						integ.POST("/coberturas/lote", auth.RequireIntegrationScope(models.ScopeCoberturasWrite), integracaoHandler.CreateCoberturaLote)
						integ.POST("/toques", auth.RequireIntegrationScope(models.ScopeToquesWrite), integracaoHandler.CreateToque)
						integ.POST("/toques/lote", auth.RequireIntegrationScope(models.ScopeToquesWrite), integracaoHandler.CreateToqueLote)
						integ.GET("/saude", auth.RequireIntegrationScope(models.ScopeSaudeRead), integracaoHandler.ListSaude)
						integ.POST("/saude", auth.RequireIntegrationScope(models.ScopeSaudeWrite), integracaoHandler.CreateSaude)
						integ.GET("/alertas", auth.RequireIntegrationScope(models.ScopeAlertasRead), integracaoHandler.ListAlertas)
					}
					slog.Info("Rotas de Integracoes M2M registradas")

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
							auth.RequirePerfilAPIAccess(),
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
							animalSaudeSvc, alertaSvc,
						)
						if err != nil {
							slog.Warn("Falha ao inicializar Assistente Live", "error", err)
						}
						assistenteLiveHandler := handlers.NewAssistenteLiveHandler(assistenteLiveSvc, userRepo, cfg.CORSOrigin)

						assistente := api.Group("/v1/assistente")
						{
							// Rotas HTTP normais continuam com AuthMiddleware padrão
							assistente.POST("/interpretar", auth.AuthMiddleware(jwtSvc), auth.RequirePerfilAPIAccess(), assistenteHandler.Interpretar)
							assistente.POST("/executar", auth.AuthMiddleware(jwtSvc), auth.RequirePerfilAPIAccess(), assistenteHandler.Executar)

							// Rota WebSocket Live (AuthMiddleware injetado manualmente ou via sub-grupo se necessário)
							assistente.GET("/live", auth.AuthMiddleware(jwtSvc), auth.RequirePerfilAPIAccess(), assistenteLiveHandler.LiveSession)
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
	if alertasCronCancel != nil {
		alertasCronCancel()
	}
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
