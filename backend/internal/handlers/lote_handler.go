package handlers

import (
	"errors"
	"strconv"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/response"
	"github.com/ceialmilk/api/internal/service"
	"github.com/gin-gonic/gin"
)

type LoteHandler struct {
	svc         *service.LoteService
	fazendaSvc  *service.FazendaService
}

func NewLoteHandler(svc *service.LoteService, fazendaSvc *service.FazendaService) *LoteHandler {
	return &LoteHandler{svc: svc, fazendaSvc: fazendaSvc}
}

func (h *LoteHandler) Create(c *gin.Context) {
	var req struct {
		Nome       string  `json:"nome" binding:"required"`
		FazendaID  int64    `json:"fazenda_id" binding:"required"`
		Tipo       *string  `json:"tipo"`
		Descricao  *string  `json:"descricao"`
		Ativo      *bool    `json:"ativo"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorValidation(c, "Dados invalidos", err.Error())
		return
	}
	if !ValidateFazendaAccess(c, h.fazendaSvc, req.FazendaID) {
		return
	}
	lote := &models.Lote{Nome: req.Nome, FazendaID: req.FazendaID, Tipo: req.Tipo, Descricao: req.Descricao, Ativo: true}
	if req.Ativo != nil {
		lote.Ativo = *req.Ativo
	}
	if err := h.svc.Create(c.Request.Context(), lote); err != nil {
		response.ErrorInternal(c, "Erro ao criar lote", err.Error())
		return
	}
	response.SuccessCreated(c, lote, "Lote criado com sucesso")
}

func (h *LoteHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.ErrorBadRequest(c, "ID invalido", nil)
		return
	}
	lote, err := h.svc.GetByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, service.ErrLoteNotFound) {
			response.ErrorNotFound(c, "Lote nao encontrado")
			return
		}
		response.ErrorInternal(c, "Erro ao buscar lote", err.Error())
		return
	}
	if !ValidateFazendaAccess(c, h.fazendaSvc, lote.FazendaID) {
		return
	}
	response.SuccessOK(c, lote, "Lote encontrado")
}

func (h *LoteHandler) GetByFazendaID(c *gin.Context) {
	fazendaID, err := strconv.ParseInt(c.Query("fazenda_id"), 10, 64)
	if err != nil || fazendaID <= 0 {
		response.ErrorBadRequest(c, "fazenda_id obrigatorio e deve ser maior que zero", nil)
		return
	}
	if !ValidateFazendaAccess(c, h.fazendaSvc, fazendaID) {
		return
	}
	list, err := h.svc.GetByFazendaID(c.Request.Context(), fazendaID)
	if err != nil {
		response.ErrorInternal(c, "Erro ao listar lotes", err.Error())
		return
	}
	response.SuccessOK(c, list, "Lotes listados com sucesso")
}

func (h *LoteHandler) Update(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.ErrorBadRequest(c, "ID invalido", nil)
		return
	}
	lote, err := h.svc.GetByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, service.ErrLoteNotFound) {
			response.ErrorNotFound(c, "Lote nao encontrado")
			return
		}
		response.ErrorInternal(c, "Erro ao buscar lote", err.Error())
		return
	}
	if !ValidateFazendaAccess(c, h.fazendaSvc, lote.FazendaID) {
		return
	}
	var req struct {
		Nome      string  `json:"nome" binding:"required"`
		Tipo      *string `json:"tipo"`
		Descricao *string `json:"descricao"`
		Ativo     *bool   `json:"ativo"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorValidation(c, "Dados invalidos", err.Error())
		return
	}
	lote.Nome = req.Nome
	lote.Tipo = req.Tipo
	lote.Descricao = req.Descricao
	if req.Ativo != nil {
		lote.Ativo = *req.Ativo
	}
	lote.ID = id
	if err := h.svc.Update(c.Request.Context(), lote); err != nil {
		response.ErrorInternal(c, "Erro ao atualizar lote", err.Error())
		return
	}
	response.SuccessOK(c, lote, "Lote atualizado com sucesso")
}

func (h *LoteHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.ErrorBadRequest(c, "ID invalido", nil)
		return
	}
	lote, err := h.svc.GetByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, service.ErrLoteNotFound) {
			response.ErrorNotFound(c, "Lote nao encontrado")
			return
		}
		response.ErrorInternal(c, "Erro ao buscar lote", err.Error())
		return
	}
	if !ValidateFazendaAccess(c, h.fazendaSvc, lote.FazendaID) {
		return
	}
	if err := h.svc.Delete(c.Request.Context(), id); err != nil {
		response.ErrorInternal(c, "Erro ao deletar lote", err.Error())
		return
	}
	response.SuccessOK(c, nil, "Lote deletado com sucesso")
}
