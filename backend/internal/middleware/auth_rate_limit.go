package middleware

import (
	"fmt"
	"strconv"
	"sync"
	"time"

	"github.com/ceialmilk/api/internal/response"
	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

// AuthRateLimitConfig define limite e janela para rate limit por IP.
type AuthRateLimitConfig struct {
	Limit  int
	Window time.Duration
}

// IPRateLimiter limita requisições por chave (ex.: IP do cliente).
type IPRateLimiter struct {
	limiters map[string]*rate.Limiter
	mu       sync.Mutex
	rate     rate.Limit
	burst    int
}

// NewIPRateLimiter cria um limiter com até limit requisições por janela.
func NewIPRateLimiter(limit int, window time.Duration) *IPRateLimiter {
	if limit <= 0 {
		limit = 1
	}
	if window <= 0 {
		window = time.Minute
	}
	rl := &IPRateLimiter{
		limiters: make(map[string]*rate.Limiter),
		rate:     rate.Limit(float64(limit) / window.Seconds()),
		burst:    limit,
	}
	go rl.cleanup()
	return rl
}

func (rl *IPRateLimiter) GetLimiter(key string) *rate.Limiter {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	limiter, exists := rl.limiters[key]
	if !exists {
		limiter = rate.NewLimiter(rl.rate, rl.burst)
		rl.limiters[key] = limiter
	}
	return limiter
}

func (rl *IPRateLimiter) cleanup() {
	ticker := time.NewTicker(1 * time.Hour)
	defer ticker.Stop()
	for range ticker.C {
		rl.mu.Lock()
		if len(rl.limiters) > 10000 {
			rl.limiters = make(map[string]*rate.Limiter)
		}
		rl.mu.Unlock()
	}
}

// AuthRateLimit limita requisições anônimas por IP (login, registro, refresh).
func AuthRateLimit(cfg AuthRateLimitConfig) gin.HandlerFunc {
	limiter := NewIPRateLimiter(cfg.Limit, cfg.Window)
	retryAfterSec := int(cfg.Window.Seconds())
	if retryAfterSec < 1 {
		retryAfterSec = 60
	}
	msg := fmt.Sprintf("Limite de requisições excedido. Máximo %d por %s.", cfg.Limit, formatWindow(cfg.Window))

	return func(c *gin.Context) {
		ip := c.ClientIP()
		if ip == "" {
			ip = "unknown"
		}
		if !limiter.GetLimiter(ip).Allow() {
			c.Header("Retry-After", strconv.Itoa(retryAfterSec))
			response.ErrorTooManyRequests(c, msg)
			c.Abort()
			return
		}
		c.Next()
	}
}

func formatWindow(d time.Duration) string {
	if d%(time.Hour) == 0 && d >= time.Hour {
		h := int(d / time.Hour)
		if h == 1 {
			return "hora"
		}
		return fmt.Sprintf("%d horas", h)
	}
	if d%(time.Minute) == 0 && d >= time.Minute {
		m := int(d / time.Minute)
		if m == 1 {
			return "minuto"
		}
		return fmt.Sprintf("%d minutos", m)
	}
	return d.String()
}
