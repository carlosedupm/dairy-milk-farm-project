package config

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/joho/godotenv"
)

type Config struct {
	Port                        string
	Env                         string
	LogLevel                    string
	DatabaseURL                 string
	JWTPrivateKey               string
	JWTPublicKey                string
	CORSOrigin                  string
	SentryDSN                   string
	GeminiAPIKey                string
	GeminiModel                 string // modelo para Dev Studio (default: gemini-2.0-flash)
	GeminiModelAssistente       string // modelo para Assistente; se vazio usa GeminiModel (ex.: gemini-2.5-flash-lite)
	GitHubToken                 string
	GitHubRepo                  string
	GitHubContextBranch         string // branch de produção para contexto Dev Studio (default: main)
	IntegrationRateLimitPerHour int    // rate limit M2M por cliente (default: 300)
	AuthLoginRateLimit          int    // tentativas de login por IP por janela (default: 10)
	AuthLoginRateWindowMinutes  int    // janela do login em minutos (default: 15)
	AuthRegisterRateLimit       int    // registos por IP por hora (default: 5)
	AuthRefreshRateLimit        int    // refresh por IP por hora (default: 30)
	AlertasCronEnabled          bool   // geração diária de alertas (default: true)
	AlertasCronHour             int    // hora local do disparo (default: 6)
	AlertasTZ                   string // timezone do cron (default: America/Sao_Paulo)
	VAPIDPublicKey              string // chave pública Web Push (VAPID)
	VAPIDPrivateKey             string // chave privada Web Push (VAPID)
	VAPIDSubject                string // contact URI (ex.: mailto:suporte@ceialmilk.com)
	MetricsToken                string // token Bearer para proteger /metrics (obrigatório em produção)
	TrustedProxies              string // CSV de CIDRs confiáveis para X-Forwarded-For (default: ranges privados)
}

func Load() *Config {
	// Obter diretório de trabalho atual
	wd, err := os.Getwd()
	if err != nil {
		wd = "."
	}

	// Tentar múltiplos caminhos para encontrar o .env
	envPaths := []string{
		filepath.Join(wd, "..", ".env"),     // /workspace/backend -> /workspace/.env
		filepath.Join(wd, ".env"),           // /workspace -> /workspace/.env
		filepath.Join("/workspace", ".env"), // Caminho absoluto (devcontainer)
		".env",                              // Diretório atual
	}

	var loadedPath string
	for _, envPath := range envPaths {
		absPath, _ := filepath.Abs(envPath)
		if _, err := os.Stat(envPath); err == nil {
			// Usar Overload para forçar sobrescrever variáveis existentes
			if err := godotenv.Overload(envPath); err != nil {
				// Usar fmt para garantir que aparece mesmo sem logger configurado
				fmt.Printf("⚠️  Erro ao carregar .env: %s (path: %s)\n", err, absPath)
			} else {
				loadedPath = absPath
				fmt.Printf("✅ Variáveis de ambiente carregadas de .env: %s\n", absPath)
				break
			}
		}
	}

	if loadedPath == "" {
		fmt.Println("ℹ️  Arquivo .env não encontrado. Usando variáveis de ambiente do sistema.")
	}

	return &Config{
		Port:                        getEnv("PORT", "8080"),
		Env:                         getEnv("ENV", "development"),
		LogLevel:                    getEnv("LOG_LEVEL", "INFO"),
		DatabaseURL:                 getEnv("DATABASE_URL", ""),
		JWTPrivateKey:               getEnv("JWT_PRIVATE_KEY", ""),
		JWTPublicKey:                getEnv("JWT_PUBLIC_KEY", ""),
		CORSOrigin:                  getEnv("CORS_ORIGIN", "http://localhost:3000"),
		SentryDSN:                   getEnv("SENTRY_DSN", ""),
		GeminiAPIKey:                getEnv("GEMINI_API_KEY", ""),
		GeminiModel:                 getEnv("GEMINI_MODEL", "gemini-2.0-flash"),
		GeminiModelAssistente:       getEnv("GEMINI_MODEL_ASSISTENTE", ""),
		GitHubToken:                 getEnv("GITHUB_TOKEN", ""),
		GitHubRepo:                  getEnv("GITHUB_REPO", ""),
		GitHubContextBranch:         getEnv("GITHUB_CONTEXT_BRANCH", "main"),
		IntegrationRateLimitPerHour: getEnvInt("INTEGRATION_RATE_LIMIT_PER_HOUR", 300),
		AuthLoginRateLimit:          getEnvInt("AUTH_LOGIN_RATE_LIMIT", 10),
		AuthLoginRateWindowMinutes:  getEnvInt("AUTH_LOGIN_RATE_WINDOW_MINUTES", 15),
		AuthRegisterRateLimit:       getEnvInt("AUTH_REGISTER_RATE_LIMIT", 5),
		AuthRefreshRateLimit:        getEnvInt("AUTH_REFRESH_RATE_LIMIT", 30),
		AlertasCronEnabled:          getEnvBool("ALERTAS_CRON_ENABLED", true),
		AlertasCronHour:             getEnvInt("ALERTAS_CRON_HOUR", 6),
		AlertasTZ:                   getEnv("ALERTAS_TZ", "America/Sao_Paulo"),
		VAPIDPublicKey:              getEnv("VAPID_PUBLIC_KEY", ""),
		VAPIDPrivateKey:             getEnv("VAPID_PRIVATE_KEY", ""),
		VAPIDSubject:                getEnv("VAPID_SUBJECT", "mailto:suporte@ceialmilk.com"),
		MetricsToken:                getEnv("METRICS_TOKEN", ""),
		TrustedProxies:              getEnv("TRUSTED_PROXIES", ""),
	}
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		var n int
		if _, err := fmt.Sscanf(value, "%d", &n); err == nil && n > 0 {
			return n
		}
	}
	return defaultValue
}

func getEnvBool(key string, defaultValue bool) bool {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	switch value {
	case "1", "true", "TRUE", "yes", "YES", "on", "ON":
		return true
	case "0", "false", "FALSE", "no", "NO", "off", "OFF":
		return false
	default:
		return defaultValue
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
