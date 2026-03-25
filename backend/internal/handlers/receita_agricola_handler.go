package handlers

import (
	"strconv"
	"time"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/response"
	"github.com/ceialmilk/api/internal/service"
	"github.com/gin-gonic/gin"
)

type ReceitaAgricolaHandler struct {
	svc             *service.ReceitaAgricolaService
	safraCulturaSvc *service.SafraCulturaService
	areaSvc         *service.AreaService
	fazendaSvc      *service.FazendaService
}

func NewReceitaAgricolaHandler(svc *service.ReceitaAgricolaService, safraCulturaSvc *service.SafraCulturaService, areaSvc *service.AreaService, fazendaSvc *service.FazendaService) *ReceitaAgricolaHandler {
	return &ReceitaAgricolaHandler{svc: svc, safraCulturaSvc: safraCulturaSvc, areaSvc: areaSvc, fazendaSvc: fazendaSvc}
}

func (h *ReceitaAgricolaHandler) ensureAccessSafraCultura(c *gin.Context, safraCulturaID int64) bool {
	sc, err := h.safraCulturaSvc.GetByID(c.Request.Context(), safraCulturaID)
	if err != nil {
		return false
	}
	area, err := h.areaSvc.GetByID(c.Request.Context(), sc.AreaID)
	if err != nil {
		return false
	}
	return ValidateFazendaAccess(c, h.fazendaSvc, area.FazendaID)
}

func (h *ReceitaAgricolaHandler) Create(c *gin.Context) {
	safraCulturaID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || safraCulturaID <= 0 {
		response.ErrorBadRequest(c, "safra_cultura_id inválido", nil)
		return
	}
	if !h.ensureAccessSafraCultura(c, safraCulturaID) {
		return
	}
	var req struct {
		Descricao    *string  `json:"descricao"`
		Valor        float64  `json:"valor" binding:"required"`
		QuantidadeKg *float64 `json:"quantidade_kg"`
		PrecoPorKg   *float64 `json:"preco_por_kg"`
		Data         string   `json:"data" binding:"required"`
		FornecedorID *int64   `json:"fornecedor_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorValidation(c, "Dados inválidos", err.Error())
		return
	}
	data, err := time.Parse("2006-01-02", req.Data)
	if err != nil {
		response.ErrorValidation(c, "data inválida", err.Error())
		return
	}
	rec := &models.ReceitaAgricola{
		SafraCulturaID: safraCulturaID, Descricao: req.Descricao, Valor: req.Valor,
		QuantidadeKg: req.QuantidadeKg, PrecoPorKg: req.PrecoPorKg, Data: data, FornecedorID: req.FornecedorID,
	}
	if err := h.svc.Create(c.Request.Context(), rec); err != nil {
		response.ErrorInternal(c, "Erro ao registrar receita", err.Error())
		return
	}
	response.SuccessCreated(c, rec, "Receita registrada com sucesso")
}

func (h *ReceitaAgricolaHandler) GetBySafraCulturaID(c *gin.Context) {
	safraCulturaID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || safraCulturaID <= 0 {
		response.ErrorBadRequest(c, "safra_cultura_id inválido", nil)
		return
	}
	if !h.ensureAccessSafraCultura(c, safraCulturaID) {
		return
	}
	list, err := h.svc.GetBySafraCulturaID(c.Request.Context(), safraCulturaID)
	if err != nil {
		response.ErrorInternal(c, "Erro ao listar receitas", err.Error())
		return
	}
	response.SuccessOK(c, list, "Receitas listadas com sucesso")
}
