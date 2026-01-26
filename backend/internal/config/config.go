package config

import (
	"os"
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
}

func Load() *Config {
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
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
