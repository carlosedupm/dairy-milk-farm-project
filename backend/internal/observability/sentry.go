package observability

import (
	"log/slog"

	"github.com/getsentry/sentry-go"
)

// InitSentry inicializa o Sentry para captura de erros
func InitSentry(dsn string, environment string) error {
	if dsn == "" {
		slog.Info("Sentry DSN não configurado, captura de erros desabilitada")
		return nil
	}

	err := sentry.Init(sentry.ClientOptions{
		Dsn:              dsn,
		Environment:      environment,
		TracesSampleRate: 1.0, // 100% das transações em desenvolvimento, ajustar em produção
		Debug:            environment == "development",
		AttachStacktrace: true,
	})

	if err != nil {
		return err
	}

	slog.Info("Sentry inicializado", "environment", environment)
	return nil
}

// CaptureError captura um erro no Sentry com contexto adicional
func CaptureError(err error, tags map[string]string, extra map[string]interface{}) {
	if err == nil {
		return
	}

	hub := sentry.CurrentHub().Clone()
	
	// Adicionar tags
	for k, v := range tags {
		hub.Scope().SetTag(k, v)
	}

	// Adicionar contexto extra
	for k, v := range extra {
		hub.Scope().SetExtra(k, v)
	}

	hub.CaptureException(err)
}

// CaptureMessage captura uma mensagem no Sentry
func CaptureMessage(message string, tags map[string]string) {
	hub := sentry.CurrentHub().Clone()
	
	for k, v := range tags {
		hub.Scope().SetTag(k, v)
	}

	hub.CaptureMessage(message)
}

// Flush garante que todos os eventos sejam enviados antes de encerrar
func Flush() {
	sentry.Flush(2) // Timeout de 2 segundos
}
