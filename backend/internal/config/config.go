package config

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/joho/godotenv"
)

type Config struct {
	Port          string
	Env           string
	LogLevel      string
	DatabaseURL   string
	JWTPrivateKey string
	JWTPublicKey  string
	CORSOrigin    string
	SentryDSN     string
	GeminiAPIKey  string
	GitHubToken   string
	GitHubRepo    string
}

func Load() *Config {
	// Obter diretório de trabalho atual
	wd, err := os.Getwd()
	if err != nil {
		wd = "."
	}

	// Tentar múltiplos caminhos para encontrar o .env
	envPaths := []string{
		filepath.Join(wd, "..", ".env"),        // /workspace/backend -> /workspace/.env
		filepath.Join(wd, ".env"),              // /workspace -> /workspace/.env
		filepath.Join("/workspace", ".env"),     // Caminho absoluto (devcontainer)
		".env",                                  // Diretório atual
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
		Port:          getEnv("PORT", "8080"),
		Env:           getEnv("ENV", "development"),
		LogLevel:      getEnv("LOG_LEVEL", "INFO"),
		DatabaseURL:   getEnv("DATABASE_URL", ""),
		JWTPrivateKey: getEnv("JWT_PRIVATE_KEY", ""),
		JWTPublicKey:  getEnv("JWT_PUBLIC_KEY", ""),
		CORSOrigin:    getEnv("CORS_ORIGIN", "http://localhost:3000"),
		SentryDSN:     getEnv("SENTRY_DSN", ""),
		GeminiAPIKey:  getEnv("GEMINI_API_KEY", ""),
		GitHubToken:   getEnv("GITHUB_TOKEN", ""),
		GitHubRepo:    getEnv("GITHUB_REPO", ""),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
