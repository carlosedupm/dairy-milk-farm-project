package handlers

import (
	"errors"
	"strings"

	"github.com/ceialmilk/api/internal/repository"
	"github.com/ceialmilk/api/internal/response"
	"github.com/ceialmilk/api/internal/service"
	"github.com/gin-gonic/gin"
)

type AssistenteHandler struct {
	svc     *service.AssistenteService
	userRepo *repository.UsuarioRepository
}

func NewAssistenteHandler(svc *service.AssistenteService, userRepo *repository.UsuarioRepository) *AssistenteHandler {
	return &AssistenteHandler{svc: svc, userRepo: userRepo}
}

// Interpretar recebe { "texto": "..." } e retorna { intent, payload, resumo }.
// Usa user_id, perfil e nome do usuário logado para contexto da IA.
func (h *AssistenteHandler) Interpretar(c *gin.Context) {
	userID := c.GetInt64("user_id")
	perfilVal, _ := c.Get("perfil")
	perfil, _ := perfilVal.(string)
	nomeUsuario := "Usuário"
	if user, err := h.userRepo.GetByID(c.Request.Context(), userID); err == nil && user != nil {
		if user.Nome != "" {
			nomeUsuario = user.Nome
		}
	}

	var req service.InterpretRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorValidation(c, "Dados inválidos", err.Error())
		return
	}

	resp, err := h.svc.Interpretar(c.Request.Context(), req.Texto, userID, perfil, nomeUsuario)
	if err != nil {
		if strings.Contains(err.Error(), "quota da API Gemini") {
			response.ErrorQuotaExceeded(c, "Limite de uso da API excedido. Tente novamente mais tarde.", nil)
			return
		}
		response.ErrorInternal(c, "Erro ao interpretar pedido", err.Error())
		return
	}

	response.SuccessOK(c, resp, "Pedido interpretado com sucesso")
}

// Executar recebe { "intent": "...", "payload": { ... } } (já confirmado pelo usuário) e executa a ação.
func (h *AssistenteHandler) Executar(c *gin.Context) {
	userID := c.GetInt64("user_id")

	var req service.ExecutarRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorValidation(c, "Dados inválidos", err.Error())
		return
	}

	result, err := h.svc.Executar(c.Request.Context(), req.Intent, req.Payload, userID)
	if err != nil {
		if errors.Is(err, service.ErrFazendaDuplicada) {
			response.ErrorConflict(c, "Já existe uma fazenda com esse nome e localização", nil)
			return
		}
		response.ErrorInternal(c, "Erro ao executar ação", err.Error())
		return
	}

	if req.Intent == "cadastrar_fazenda" {
		response.SuccessCreated(c, result, "Fazenda criada com sucesso")
	} else {
		response.SuccessOK(c, result, "Ação executada com sucesso")
	}
}
