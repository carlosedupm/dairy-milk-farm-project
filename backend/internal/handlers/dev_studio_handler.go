package handlers

import (
	"strconv"
	"strings"

	"github.com/ceialmilk/api/internal/observability"
	"github.com/ceialmilk/api/internal/requestctx"
	"github.com/ceialmilk/api/internal/response"
	"github.com/ceialmilk/api/internal/service"
	"github.com/gin-gonic/gin"
)

type DevStudioHandler struct {
	devStudioSvc *service.DevStudioService
}

func NewDevStudioHandler(devStudioSvc *service.DevStudioService) *DevStudioHandler {
	return &DevStudioHandler{devStudioSvc: devStudioSvc}
}

type ChatRequest struct {
	Prompt string `json:"prompt" binding:"required"`
}

type RefineRequest struct {
	RequestID int64  `json:"request_id" binding:"required"`
	Feedback  string `json:"feedback" binding:"required"`
}

// Chat gera código via IA
func (h *DevStudioHandler) Chat(c *gin.Context) {
	var req ChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorValidation(c, "Dados inválidos", err.Error())
		return
	}

	userID := c.GetInt64("user_id")
	logger := requestctx.GetLogger(c)

	// Verificar perfil DEVELOPER
	perfil, exists := c.Get("perfil")
	if !exists || perfil != "DEVELOPER" {
		response.ErrorForbidden(c, "Acesso negado. Perfil DEVELOPER necessário.")
		return
	}

	// Gerar código com Gemini API
	codeResponse, err := h.devStudioSvc.GenerateCode(c.Request.Context(), req.Prompt, userID)
	if err != nil {
		observability.CaptureHandlerError(c, err, map[string]string{
			"action": "generate_code",
		})
		
		// Tratamento específico para quota excedida
		if strings.Contains(err.Error(), "quota da API Gemini excedida") {
			response.ErrorQuotaExceeded(c, 
				"Quota da API Gemini excedida. Verifique sua conta no Google Cloud Console ou aguarde o reset da quota.",
				map[string]interface{}{
					"error": err.Error(),
					"help": "Acesse https://ai.google.dev/gemini-api/docs/rate-limits para mais informações",
				})
			return
		}
		
		response.ErrorInternal(c, "Erro ao gerar código", err.Error())
		return
	}

	logger.Info("Código gerado com sucesso",
		"user_id", userID,
		"request_id", codeResponse.RequestID,
	)

	response.SuccessOK(c, codeResponse, "Código gerado com sucesso")
}

// Refine refina o código gerado a partir do feedback do usuário (ex.: divergência da estrutura do projeto).
func (h *DevStudioHandler) Refine(c *gin.Context) {
	var req RefineRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorValidation(c, "Dados inválidos", err.Error())
		return
	}

	userID := c.GetInt64("user_id")
	logger := requestctx.GetLogger(c)

	perfil, exists := c.Get("perfil")
	if !exists || perfil != "DEVELOPER" {
		response.ErrorForbidden(c, "Acesso negado. Perfil DEVELOPER necessário.")
		return
	}

	codeResponse, err := h.devStudioSvc.RefineCode(c.Request.Context(), req.RequestID, userID, req.Feedback)
	if err != nil {
		observability.CaptureHandlerError(c, err, map[string]string{"action": "refine_code"})
		if strings.Contains(err.Error(), "quota da API Gemini excedida") {
			response.ErrorQuotaExceeded(c,
				"Quota da API Gemini excedida. Verifique sua conta no Google Cloud Console ou aguarde o reset da quota.",
				map[string]interface{}{
					"error": err.Error(),
					"help":  "https://ai.google.dev/gemini-api/docs/rate-limits",
				})
			return
		}
		if strings.Contains(err.Error(), "não pertence ao usuário") {
			response.ErrorForbidden(c, "Request não pertence ao usuário.")
			return
		}
		response.ErrorInternal(c, "Erro ao refinar código", err.Error())
		return
	}

	logger.Info("Código refinado com sucesso", "user_id", userID, "request_id", codeResponse.RequestID)
	response.SuccessOK(c, codeResponse, "Código refinado com sucesso")
}

// Validate valida código sintaticamente
func (h *DevStudioHandler) Validate(c *gin.Context) {
	idStr := c.Param("request_id")
	requestID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		response.ErrorValidation(c, "ID inválido", err.Error())
		return
	}

	// Verificar perfil DEVELOPER
	perfil, exists := c.Get("perfil")
	if !exists || perfil != "DEVELOPER" {
		response.ErrorForbidden(c, "Acesso negado. Perfil DEVELOPER necessário.")
		return
	}

	// Validar código
	if err := h.devStudioSvc.ValidateCode(c.Request.Context(), requestID); err != nil {
		observability.CaptureHandlerError(c, err, map[string]string{
			"action": "validate_code",
		})
		response.ErrorInternal(c, "Erro ao validar código", err.Error())
		return
	}

	// Buscar request atualizado para retornar status correto
	updatedRequest, err := h.devStudioSvc.GetStatus(c.Request.Context(), requestID)
	if err != nil {
		observability.CaptureHandlerError(c, err, map[string]string{
			"action": "get_status_after_validate",
		})
		// Mesmo com erro ao buscar, retornar sucesso pois validação foi bem-sucedida
		response.SuccessOK(c, gin.H{
			"request_id": requestID,
			"status":     "validated",
		}, "Código validado com sucesso")
		return
	}

	response.SuccessOK(c, updatedRequest, "Código validado com sucesso")
}

// Usage retorna métricas de uso do Dev Studio (última hora e hoje).
func (h *DevStudioHandler) Usage(c *gin.Context) {
	userID := c.GetInt64("user_id")

	// Verificar perfil DEVELOPER
	perfil, exists := c.Get("perfil")
	if !exists || perfil != "DEVELOPER" {
		response.ErrorForbidden(c, "Acesso negado. Perfil DEVELOPER necessário.")
		return
	}

	usage, err := h.devStudioSvc.GetUsage(c.Request.Context(), userID)
	if err != nil {
		observability.CaptureHandlerError(c, err, map[string]string{
			"action": "get_usage",
		})
		response.ErrorInternal(c, "Erro ao buscar uso", err.Error())
		return
	}

	response.SuccessOK(c, usage, "Uso recuperado com sucesso")
}

// History lista histórico de requests do usuário
func (h *DevStudioHandler) History(c *gin.Context) {
	userID := c.GetInt64("user_id")

	// Verificar perfil DEVELOPER
	perfil, exists := c.Get("perfil")
	if !exists || perfil != "DEVELOPER" {
		response.ErrorForbidden(c, "Acesso negado. Perfil DEVELOPER necessário.")
		return
	}

	history, err := h.devStudioSvc.GetHistory(c.Request.Context(), userID)
	if err != nil {
		observability.CaptureHandlerError(c, err, map[string]string{
			"action": "get_history",
		})
		response.ErrorInternal(c, "Erro ao buscar histórico", err.Error())
		return
	}

	response.SuccessOK(c, history, "Histórico recuperado com sucesso")
}

// Status busca status de request específico
func (h *DevStudioHandler) Status(c *gin.Context) {
	idStr := c.Param("id")
	requestID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		response.ErrorValidation(c, "ID inválido", err.Error())
		return
	}

	userID := c.GetInt64("user_id")

	// Verificar perfil DEVELOPER
	perfil, exists := c.Get("perfil")
	if !exists || perfil != "DEVELOPER" {
		response.ErrorForbidden(c, "Acesso negado. Perfil DEVELOPER necessário.")
		return
	}

	status, err := h.devStudioSvc.GetStatus(c.Request.Context(), requestID)
	if err != nil {
		observability.CaptureHandlerError(c, err, map[string]string{
			"action": "get_status",
		})
		response.ErrorNotFound(c, "Request não encontrado")
		return
	}

	// Verificar se o request pertence ao usuário
	if status.UserID != userID {
		response.ErrorForbidden(c, "Acesso negado. Request não pertence ao usuário.")
		return
	}

	response.SuccessOK(c, status, "Status recuperado com sucesso")
}

// Implement cria Pull Request no GitHub
func (h *DevStudioHandler) Implement(c *gin.Context) {
	idStr := c.Param("request_id")
	requestID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		response.ErrorValidation(c, "ID inválido", err.Error())
		return
	}

	userID := c.GetInt64("user_id")

	// Verificar perfil DEVELOPER
	perfil, exists := c.Get("perfil")
	if !exists || perfil != "DEVELOPER" {
		response.ErrorForbidden(c, "Acesso negado. Perfil DEVELOPER necessário.")
		return
	}

	// Buscar request para verificar se pertence ao usuário
	request, err := h.devStudioSvc.GetStatus(c.Request.Context(), requestID)
	if err != nil {
		observability.CaptureHandlerError(c, err, map[string]string{
			"action": "get_request_before_implement",
		})
		response.ErrorNotFound(c, "Request não encontrado")
		return
	}

	if request.UserID != userID {
		response.ErrorForbidden(c, "Acesso negado. Request não pertence ao usuário.")
		return
	}

	// Implementar (criar PR)
	if err := h.devStudioSvc.Implement(c.Request.Context(), requestID); err != nil {
		observability.CaptureHandlerError(c, err, map[string]string{
			"action": "implement",
		})
		response.ErrorInternal(c, "Erro ao criar Pull Request", err.Error())
		return
	}

	// Buscar request atualizado para retornar PR info
	updatedRequest, err := h.devStudioSvc.GetStatus(c.Request.Context(), requestID)
	if err != nil {
		observability.CaptureHandlerError(c, err, map[string]string{
			"action": "get_status_after_implement",
		})
		// Mesmo com erro ao buscar, retornar sucesso pois PR foi criado
		response.SuccessOK(c, gin.H{
			"request_id": requestID,
			"status":     "implemented",
			"message":    "Pull Request criado com sucesso",
		}, "Pull Request criado com sucesso")
		return
	}

	response.SuccessOK(c, updatedRequest, "Pull Request criado com sucesso")
}
