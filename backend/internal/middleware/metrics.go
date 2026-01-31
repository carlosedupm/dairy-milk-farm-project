package middleware

import (
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	// Contador de requisições HTTP
	httpRequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "http_requests_total",
			Help: "Total de requisições HTTP por método, rota e status",
		},
		[]string{"method", "route", "status"},
	)

	// Histograma de latência das requisições
	httpRequestDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_request_duration_seconds",
			Help:    "Duração das requisições HTTP em segundos",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"method", "route"},
	)

	// Gauge de requisições em andamento
	httpRequestsInFlight = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "http_requests_in_flight",
			Help: "Número de requisições HTTP em andamento",
		},
	)

	// Contador de erros
	httpErrorsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "http_errors_total",
			Help: "Total de erros HTTP por método, rota e código de erro",
		},
		[]string{"method", "route", "error_code"},
	)
)

// PrometheusMiddleware coleta métricas de todas as requisições HTTP
func PrometheusMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Incrementar requisições em andamento
		httpRequestsInFlight.Inc()
		defer httpRequestsInFlight.Dec()

		// Registrar tempo de início
		start := time.Now()

		// Obter rota padrão (para evitar alta cardinalidade em rotas com parâmetros)
		route := c.FullPath()
		if route == "" {
			route = "unknown"
		}

		// Processar requisição
		c.Next()

		// Calcular duração
		duration := time.Since(start).Seconds()

		// Obter status code
		status := strconv.Itoa(c.Writer.Status())

		// Registrar métricas
		httpRequestsTotal.WithLabelValues(c.Request.Method, route, status).Inc()
		httpRequestDuration.WithLabelValues(c.Request.Method, route).Observe(duration)

		// Registrar erros (4xx e 5xx)
		if c.Writer.Status() >= 400 {
			httpErrorsTotal.WithLabelValues(c.Request.Method, route, status).Inc()
		}
	}
}

// Métricas customizadas para operações específicas

// Contador de operações de banco de dados
var DBOperationsTotal = promauto.NewCounterVec(
	prometheus.CounterOpts{
		Name: "db_operations_total",
		Help: "Total de operações de banco de dados por tipo e tabela",
	},
	[]string{"operation", "table"},
)

// Histograma de latência de operações de banco
var DBOperationDuration = promauto.NewHistogramVec(
	prometheus.HistogramOpts{
		Name:    "db_operation_duration_seconds",
		Help:    "Duração das operações de banco de dados em segundos",
		Buckets: []float64{0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1},
	},
	[]string{"operation", "table"},
)

// Contador de logins
var AuthLoginsTotal = promauto.NewCounterVec(
	prometheus.CounterOpts{
		Name: "auth_logins_total",
		Help: "Total de tentativas de login por resultado",
	},
	[]string{"result"}, // "success", "invalid_credentials", "user_disabled"
)

// Contador de registros de usuários
var AuthRegistrationsTotal = promauto.NewCounterVec(
	prometheus.CounterOpts{
		Name: "auth_registrations_total",
		Help: "Total de registros de usuários por resultado",
	},
	[]string{"result"}, // "success", "email_exists", "error"
)
