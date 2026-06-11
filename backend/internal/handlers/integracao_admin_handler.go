package handlers

import (
	"strconv"

	"github.com/ceialmilk/api/internal/response"
	"github.com/ceialmilk/api/internal/service"
	"github.com/gin-gonic/gin"
)

type IntegracaoAdminHandler struct {
	integracaoSvc *service.IntegracaoService
}

func NewIntegracaoAdminHandler(integracaoSvc *service.IntegracaoService) *IntegracaoAdminHandler {
	return &IntegracaoAdminHandler{integracaoSvc: integracaoSvc}
}

type createIntegracaoRequest struct {
	Nome       string   `json:"nome" binding:"required"`
	FazendaIDs []int64  `json:"fazenda_ids" binding:"required"`
	Scopes     []string `json:"scopes" binding:"required"`
}

type updateIntegracaoRequest struct {
	Nome       *string  `json:"nome"`
	Ativo      *bool    `json:"ativo"`
	FazendaIDs []int64  `json:"fazenda_ids"`
	Scopes     []string `json:"scopes"`
}

func (h *IntegracaoAdminHandler) List(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	list, total, err := h.integracaoSvc.List(c.Request.Context(), limit, offset)
	if err != nil {
		response.ErrorInternal(c, "Erro ao listar integracoes", err.Error())
		return
	}
	for _, item := range list {
		item.KeyHash = ""
	}
	response.SuccessOK(c, gin.H{"clientes": list, "total": total}, "OK")
}

func (h *IntegracaoAdminHandler) Create(c *gin.Context) {
	var req createIntegracaoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorValidation(c, "Dados invalidos", err.Error())
		return
	}
	adminID, ok := GetActorUserID(c)
	if !ok {
		response.ErrorUnauthorized(c, "Admin nao identificado")
		return
	}
	cliente, apiKey, err := h.integracaoSvc.CreateCliente(c.Request.Context(), req.Nome, req.FazendaIDs, req.Scopes, adminID)
	if err != nil {
		response.ErrorValidation(c, err.Error(), nil)
		return
	}
	cliente.KeyHash = ""
	resp := gin.H{
		"cliente": cliente,
		"api_key": apiKey,
	}
	response.SuccessCreated(c, resp, "Cliente criado. Guarde a api_key — nao sera exibida novamente.")
}

func (h *IntegracaoAdminHandler) GetByID(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	cliente, err := h.integracaoSvc.GetByID(c.Request.Context(), id)
	if err != nil {
		response.ErrorNotFound(c, "Cliente nao encontrado")
		return
	}
	cliente.KeyHash = ""
	limit, _ := strconv.Atoi(c.DefaultQuery("chamadas_limit", "20"))
	chamadas, _ := h.integracaoSvc.ListChamadas(c.Request.Context(), id, limit, 0)
	response.SuccessOK(c, gin.H{"cliente": cliente, "chamadas_recentes": chamadas}, "OK")
}

func (h *IntegracaoAdminHandler) Update(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	var req updateIntegracaoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorValidation(c, "Dados invalidos", err.Error())
		return
	}
	nome := ""
	if req.Nome != nil {
		nome = *req.Nome
	}
	var fazendaIDs []int64
	if req.FazendaIDs != nil {
		fazendaIDs = req.FazendaIDs
	}
	var scopes []string
	if req.Scopes != nil {
		scopes = req.Scopes
	}
	if err := h.integracaoSvc.UpdateCliente(c.Request.Context(), id, nome, req.Ativo, fazendaIDs, scopes); err != nil {
		response.ErrorValidation(c, err.Error(), nil)
		return
	}
	cliente, _ := h.integracaoSvc.GetByID(c.Request.Context(), id)
	if cliente != nil {
		cliente.KeyHash = ""
	}
	response.SuccessOK(c, cliente, "Cliente atualizado")
}

func (h *IntegracaoAdminHandler) RotacionarChave(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	apiKey, err := h.integracaoSvc.RotacionarChave(c.Request.Context(), id)
	if err != nil {
		response.ErrorNotFound(c, "Cliente nao encontrado")
		return
	}
	response.SuccessOK(c, gin.H{"api_key": apiKey}, "Nova chave gerada. Guarde a api_key — nao sera exibida novamente.")
}

func (h *IntegracaoAdminHandler) Revogar(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	if err := h.integracaoSvc.Revogar(c.Request.Context(), id); err != nil {
		response.ErrorNotFound(c, "Cliente nao encontrado")
		return
	}
	response.SuccessOK(c, nil, "Cliente revogado")
}

func (h *IntegracaoAdminHandler) Reativar(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	apiKey, err := h.integracaoSvc.Reativar(c.Request.Context(), id)
	if err != nil {
		response.ErrorNotFound(c, "Cliente nao encontrado ou nao esta revogado")
		return
	}
	response.SuccessOK(c, gin.H{"api_key": apiKey}, "Cliente reativado. Guarde a nova api_key — nao sera exibida novamente.")
}

func (h *IntegracaoAdminHandler) ListChamadas(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	chamadas, err := h.integracaoSvc.ListChamadas(c.Request.Context(), id, limit, offset)
	if err != nil {
		response.ErrorInternal(c, "Erro ao listar chamadas", err.Error())
		return
	}
	response.SuccessOK(c, gin.H{"chamadas": chamadas}, "OK")
}
