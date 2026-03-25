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

type FornecedorHandler struct {
	svc        *service.FornecedorService
	fazendaSvc *service.FazendaService
}

func NewFornecedorHandler(svc *service.FornecedorService, fazendaSvc *service.FazendaService) *FornecedorHandler {
	return &FornecedorHandler{svc: svc, fazendaSvc: fazendaSvc}
}

func (h *FornecedorHandler) Create(c *gin.Context) {
	fazendaID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || fazendaID <= 0 {
		response.ErrorBadRequest(c, "fazenda_id inválido", nil)
		return
	}
	if !ValidateFazendaAccess(c, h.fazendaSvc, fazendaID) {
		return
	}
	var req struct {
		Nome        string  `json:"nome" binding:"required"`
		Tipo        *string `json:"tipo"`
		Contato     *string `json:"contato"`
		Observacoes *string `json:"observacoes"`
		Ativo       *bool   `json:"ativo"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorValidation(c, "Dados inválidos", err.Error())
		return
	}
	tipo := models.FornecedorTipoCooperativa
	if req.Tipo != nil && *req.Tipo != "" {
		tipo = *req.Tipo
	}
	f := &models.Fornecedor{FazendaID: fazendaID, Nome: req.Nome, Tipo: tipo, Contato: req.Contato, Observacoes: req.Observacoes, Ativo: true}
	if req.Ativo != nil {
		f.Ativo = *req.Ativo
	}
	if err := h.svc.Create(c.Request.Context(), f); err != nil {
		response.ErrorInternal(c, "Erro ao criar fornecedor", err.Error())
		return
	}
	response.SuccessCreated(c, f, "Fornecedor criado com sucesso")
}

func (h *FornecedorHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.ErrorBadRequest(c, "ID inválido", nil)
		return
	}
	f, err := h.svc.GetByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, service.ErrFornecedorNotFound) || errors.Is(err, pgx.ErrNoRows) {
			response.ErrorNotFound(c, "Fornecedor não encontrado")
			return
		}
		response.ErrorInternal(c, "Erro ao buscar fornecedor", err.Error())
		return
	}
	if !ValidateFazendaAccess(c, h.fazendaSvc, f.FazendaID) {
		return
	}
	response.SuccessOK(c, f, "Fornecedor encontrado")
}

func (h *FornecedorHandler) GetByFazendaID(c *gin.Context) {
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
		response.ErrorInternal(c, "Erro ao listar fornecedores", err.Error())
		return
	}
	response.SuccessOK(c, list, "Fornecedores listados com sucesso")
}

func (h *FornecedorHandler) Update(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.ErrorBadRequest(c, "ID inválido", nil)
		return
	}
	f, err := h.svc.GetByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, service.ErrFornecedorNotFound) || errors.Is(err, pgx.ErrNoRows) {
			response.ErrorNotFound(c, "Fornecedor não encontrado")
			return
		}
		response.ErrorInternal(c, "Erro ao buscar fornecedor", err.Error())
		return
	}
	if !ValidateFazendaAccess(c, h.fazendaSvc, f.FazendaID) {
		return
	}
	var req struct {
		Nome        string  `json:"nome" binding:"required"`
		Tipo        *string `json:"tipo"`
		Contato     *string `json:"contato"`
		Observacoes *string `json:"observacoes"`
		Ativo       *bool   `json:"ativo"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorValidation(c, "Dados inválidos", err.Error())
		return
	}
	f.Nome = req.Nome
	if req.Tipo != nil {
		f.Tipo = *req.Tipo
	}
	f.Contato = req.Contato
	f.Observacoes = req.Observacoes
	if req.Ativo != nil {
		f.Ativo = *req.Ativo
	}
	if err := h.svc.Update(c.Request.Context(), f); err != nil {
		response.ErrorInternal(c, "Erro ao atualizar fornecedor", err.Error())
		return
	}
	response.SuccessOK(c, f, "Fornecedor atualizado com sucesso")
}

func (h *FornecedorHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.ErrorBadRequest(c, "ID inválido", nil)
		return
	}
	f, err := h.svc.GetByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, service.ErrFornecedorNotFound) || errors.Is(err, pgx.ErrNoRows) {
			response.ErrorNotFound(c, "Fornecedor não encontrado")
			return
		}
		response.ErrorInternal(c, "Erro ao buscar fornecedor", err.Error())
		return
	}
	if !ValidateFazendaAccess(c, h.fazendaSvc, f.FazendaID) {
		return
	}
	if err := h.svc.Delete(c.Request.Context(), id); err != nil {
		response.ErrorInternal(c, "Erro ao excluir fornecedor", err.Error())
		return
	}
	response.SuccessOK(c, nil, "Fornecedor excluído com sucesso")
}
