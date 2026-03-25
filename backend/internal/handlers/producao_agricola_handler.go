package handlers

import (
	"strconv"
	"time"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/response"
	"github.com/ceialmilk/api/internal/service"
	"github.com/gin-gonic/gin"
)

type ProducaoAgricolaHandler struct {
	svc             *service.ProducaoAgricolaService
	safraCulturaSvc *service.SafraCulturaService
	areaSvc         *service.AreaService
	fazendaSvc      *service.FazendaService
}

func NewProducaoAgricolaHandler(svc *service.ProducaoAgricolaService, safraCulturaSvc *service.SafraCulturaService, areaSvc *service.AreaService, fazendaSvc *service.FazendaService) *ProducaoAgricolaHandler {
	return &ProducaoAgricolaHandler{svc: svc, safraCulturaSvc: safraCulturaSvc, areaSvc: areaSvc, fazendaSvc: fazendaSvc}
}

func (h *ProducaoAgricolaHandler) ensureAccessSafraCultura(c *gin.Context, safraCulturaID int64) bool {
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

func (h *ProducaoAgricolaHandler) Create(c *gin.Context) {
	safraCulturaID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || safraCulturaID <= 0 {
		response.ErrorBadRequest(c, "safra_cultura_id inválido", nil)
		return
	}
	if !h.ensureAccessSafraCultura(c, safraCulturaID) {
		return
	}
	var req struct {
		Destino      string  `json:"destino" binding:"required"`
		QuantidadeKg float64 `json:"quantidade_kg" binding:"required"`
		Data         string  `json:"data" binding:"required"`
		Observacoes  *string `json:"observacoes"`
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
	p := &models.ProducaoAgricola{
		SafraCulturaID: safraCulturaID, Destino: req.Destino, QuantidadeKg: req.QuantidadeKg, Data: data, Observacoes: req.Observacoes,
	}
	if err := h.svc.Create(c.Request.Context(), p); err != nil {
		response.ErrorInternal(c, "Erro ao registrar produção", err.Error())
		return
	}
	response.SuccessCreated(c, p, "Produção registrada com sucesso")
}

func (h *ProducaoAgricolaHandler) GetBySafraCulturaID(c *gin.Context) {
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
		response.ErrorInternal(c, "Erro ao listar produções", err.Error())
		return
	}
	response.SuccessOK(c, list, "Produções listadas com sucesso")
}
