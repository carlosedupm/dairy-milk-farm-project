package handlers

import (
	"errors"
	"strconv"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/response"
	"github.com/ceialmilk/api/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
)

type AreaHandler struct {
	svc        *service.AreaService
	fazendaSvc *service.FazendaService
}

func NewAreaHandler(svc *service.AreaService, fazendaSvc *service.FazendaService) *AreaHandler {
	return &AreaHandler{svc: svc, fazendaSvc: fazendaSvc}
}

func (h *AreaHandler) Create(c *gin.Context) {
	fazendaID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || fazendaID <= 0 {
		response.ErrorBadRequest(c, "fazenda_id inválido", nil)
		return
	}
	if !ValidateFazendaAccess(c, h.fazendaSvc, fazendaID) {
		return
	}
	var req struct {
		Nome      string  `json:"nome" binding:"required"`
		Hectares  float64 `json:"hectares" binding:"required"`
		Descricao *string `json:"descricao"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorValidation(c, "Dados inválidos", err.Error())
		return
	}
	a := &models.Area{FazendaID: fazendaID, Nome: req.Nome, Hectares: req.Hectares, Descricao: req.Descricao}
	if err := h.svc.Create(c.Request.Context(), a); err != nil {
		response.ErrorInternal(c, "Erro ao criar área", err.Error())
		return
	}
	response.SuccessCreated(c, a, "Área criada com sucesso")
}

func (h *AreaHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.ErrorBadRequest(c, "ID inválido", nil)
		return
	}
	a, err := h.svc.GetByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, service.ErrAreaNotFound) || errors.Is(err, pgx.ErrNoRows) {
			response.ErrorNotFound(c, "Área não encontrada")
			return
		}
		response.ErrorInternal(c, "Erro ao buscar área", err.Error())
		return
	}
	if !ValidateFazendaAccess(c, h.fazendaSvc, a.FazendaID) {
		return
	}
	response.SuccessOK(c, a, "Área encontrada")
}

func (h *AreaHandler) GetByFazendaID(c *gin.Context) {
	fazendaID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || fazendaID <= 0 {
		response.ErrorBadRequest(c, "fazenda_id inválido", nil)
		return
	}
	if !ValidateFazendaAccess(c, h.fazendaSvc, fazendaID) {
		return
	}
	list, err := h.svc.GetByFazendaID(c.Request.Context(), fazendaID)
	if err != nil {
		response.ErrorInternal(c, "Erro ao listar áreas", err.Error())
		return
	}
	response.SuccessOK(c, list, "Áreas listadas com sucesso")
}

func (h *AreaHandler) Update(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.ErrorBadRequest(c, "ID inválido", nil)
		return
	}
	a, err := h.svc.GetByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, service.ErrAreaNotFound) || errors.Is(err, pgx.ErrNoRows) {
			response.ErrorNotFound(c, "Área não encontrada")
			return
		}
		response.ErrorInternal(c, "Erro ao buscar área", err.Error())
		return
	}
	if !ValidateFazendaAccess(c, h.fazendaSvc, a.FazendaID) {
		return
	}
	var req struct {
		Nome      string  `json:"nome" binding:"required"`
		Hectares  float64 `json:"hectares" binding:"required"`
		Descricao *string `json:"descricao"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorValidation(c, "Dados inválidos", err.Error())
		return
	}
	a.Nome = req.Nome
	a.Hectares = req.Hectares
	a.Descricao = req.Descricao
	if err := h.svc.Update(c.Request.Context(), a); err != nil {
		response.ErrorInternal(c, "Erro ao atualizar área", err.Error())
		return
	}
	response.SuccessOK(c, a, "Área atualizada com sucesso")
}

func (h *AreaHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.ErrorBadRequest(c, "ID inválido", nil)
		return
	}
	a, err := h.svc.GetByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, service.ErrAreaNotFound) || errors.Is(err, pgx.ErrNoRows) {
			response.ErrorNotFound(c, "Área não encontrada")
			return
		}
		response.ErrorInternal(c, "Erro ao buscar área", err.Error())
		return
	}
	if !ValidateFazendaAccess(c, h.fazendaSvc, a.FazendaID) {
		return
	}
	if err := h.svc.Delete(c.Request.Context(), id); err != nil {
		response.ErrorInternal(c, "Erro ao excluir área", err.Error())
		return
	}
	response.SuccessOK(c, nil, "Área excluída com sucesso")
}
