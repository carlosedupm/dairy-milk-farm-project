package middleware

import (
	"fmt"
	"sync"
	"time"

	"github.com/ceialmilk/api/internal/response"
	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

// RateLimiter armazena limiters por usuário
type RateLimiter struct {
	limiters map[int64]*rate.Limiter
	mu       sync.Mutex
	rate     rate.Limit
	burst    int
}

// NewRateLimiter cria um novo rate limiter
func NewRateLimiter(requestsPerHour int) *RateLimiter {
	rl := &RateLimiter{
		limiters: make(map[int64]*rate.Limiter),
		rate:     rate.Every(time.Hour / time.Duration(requestsPerHour)),
		burst:    requestsPerHour,
	}

	// Limpar limiters antigos periodicamente
	go rl.cleanup()

	return rl
}

// GetLimiter obtém ou cria um limiter para o usuário
func (rl *RateLimiter) GetLimiter(userID int64) *rate.Limiter {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	limiter, exists := rl.limiters[userID]
	if !exists {
		limiter = rate.NewLimiter(rl.rate, rl.burst)
		rl.limiters[userID] = limiter
	}

	return limiter
}

// cleanup remove limiters antigos periodicamente
func (rl *RateLimiter) cleanup() {
	ticker := time.NewTicker(1 * time.Hour)
	defer ticker.Stop()

	for range ticker.C {
		rl.mu.Lock()
		// Em produção, poderia implementar lógica mais sofisticada
		// Por enquanto, apenas limpar se houver muitos limiters
		if len(rl.limiters) > 1000 {
			rl.limiters = make(map[int64]*rate.Limiter)
		}
		rl.mu.Unlock()
	}
}

// DevStudioRateLimit cria um middleware de rate limiting para Dev Studio
// MVP: 5 requests/hora por usuário
func DevStudioRateLimit() gin.HandlerFunc {
	limiter := NewRateLimiter(5) // 5 requests/hora

	return func(c *gin.Context) {
		userID, exists := c.Get("user_id")
		if !exists {
			response.ErrorUnauthorized(c, "Usuário não autenticado")
			c.Abort()
			return
		}

		userIDInt64, ok := userID.(int64)
		if !ok {
			response.ErrorInternal(c, "Erro interno", "user_id inválido")
			c.Abort()
			return
		}

		userLimiter := limiter.GetLimiter(userIDInt64)

		if !userLimiter.Allow() {
			response.ErrorTooManyRequests(c, fmt.Sprintf("Limite de requisições excedido. Máximo 5 requisições por hora."))
			c.Abort()
			return
		}

		c.Next()
	}
}
