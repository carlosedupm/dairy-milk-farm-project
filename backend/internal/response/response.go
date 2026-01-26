package response

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// SuccessResponse representa o formato padronizado de resposta de sucesso
type SuccessResponse struct {
	Data      interface{} `json:"data"`
	Message   string      `json:"message"`
	Timestamp string      `json:"timestamp"`
}

// ErrorDetail representa detalhes de erro
type ErrorDetail struct {
	Code    string      `json:"code"`
	Message string      `json:"message"`
	Details interface{} `json:"details,omitempty"`
}

// ErrorResponse representa o formato padronizado de resposta de erro
type ErrorResponse struct {
	Error     ErrorDetail `json:"error"`
	Timestamp string      `json:"timestamp"`
}

// Códigos de erro padronizados
const (
	CodeValidationError = "VALIDATION_ERROR"
	CodeUnauthorized    = "UNAUTHORIZED"
	CodeForbidden       = "FORBIDDEN"
	CodeNotFound        = "NOT_FOUND"
	CodeConflict        = "CONFLICT"
	CodeInternalError   = "INTERNAL_ERROR"
	CodeBadRequest      = "BAD_REQUEST"
	CodeQuotaExceeded   = "QUOTA_EXCEEDED"
	CodeServiceUnavailable = "SERVICE_UNAVAILABLE"
)

// Success retorna uma resposta de sucesso padronizada
func Success(c *gin.Context, statusCode int, data interface{}, message string) {
	c.JSON(statusCode, SuccessResponse{
		Data:      data,
		Message:   message,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	})
}

// SuccessOK retorna uma resposta 200 OK padronizada
func SuccessOK(c *gin.Context, data interface{}, message string) {
	Success(c, http.StatusOK, data, message)
}

// SuccessCreated retorna uma resposta 201 Created padronizada
func SuccessCreated(c *gin.Context, data interface{}, message string) {
	Success(c, http.StatusCreated, data, message)
}

// Error retorna uma resposta de erro padronizada
func Error(c *gin.Context, statusCode int, code, message string, details interface{}) {
	c.JSON(statusCode, ErrorResponse{
		Error: ErrorDetail{
			Code:    code,
			Message: message,
			Details: details,
		},
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	})
}

// ErrorBadRequest retorna uma resposta 400 Bad Request padronizada
func ErrorBadRequest(c *gin.Context, message string, details interface{}) {
	Error(c, http.StatusBadRequest, CodeBadRequest, message, details)
}

// ErrorUnauthorized retorna uma resposta 401 Unauthorized padronizada
func ErrorUnauthorized(c *gin.Context, message string) {
	Error(c, http.StatusUnauthorized, CodeUnauthorized, message, nil)
}

// ErrorForbidden retorna uma resposta 403 Forbidden padronizada
func ErrorForbidden(c *gin.Context, message string) {
	Error(c, http.StatusForbidden, CodeForbidden, message, nil)
}

// ErrorNotFound retorna uma resposta 404 Not Found padronizada
func ErrorNotFound(c *gin.Context, message string) {
	Error(c, http.StatusNotFound, CodeNotFound, message, nil)
}

// ErrorConflict retorna uma resposta 409 Conflict padronizada
func ErrorConflict(c *gin.Context, message string, details interface{}) {
	Error(c, http.StatusConflict, CodeConflict, message, details)
}

// ErrorValidation retorna uma resposta 400 Validation Error padronizada
func ErrorValidation(c *gin.Context, message string, details interface{}) {
	Error(c, http.StatusBadRequest, CodeValidationError, message, details)
}

// ErrorInternal retorna uma resposta 500 Internal Server Error padronizada
func ErrorInternal(c *gin.Context, message string, details interface{}) {
	Error(c, http.StatusInternalServerError, CodeInternalError, message, details)
}

// ErrorTooManyRequests retorna uma resposta 429 Too Many Requests padronizada
func ErrorTooManyRequests(c *gin.Context, message string) {
	Error(c, http.StatusTooManyRequests, "TOO_MANY_REQUESTS", message, nil)
}

// ErrorQuotaExceeded retorna uma resposta 429 Quota Exceeded padronizada
func ErrorQuotaExceeded(c *gin.Context, message string, details interface{}) {
	Error(c, http.StatusTooManyRequests, CodeQuotaExceeded, message, details)
}

// ErrorServiceUnavailable retorna uma resposta 503 Service Unavailable padronizada
func ErrorServiceUnavailable(c *gin.Context, message string, details interface{}) {
	Error(c, http.StatusServiceUnavailable, CodeServiceUnavailable, message, details)
}
