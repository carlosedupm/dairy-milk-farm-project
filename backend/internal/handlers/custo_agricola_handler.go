package handlers

import (
	"strconv"
	"time"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/response"
	"github.com/ceialmilk/api/internal/service"
	"github.com/gin-gonic/gin"
)

type CustoAgricolaHandler struct {
	svc             *service.CustoAgricolaService
	safraCulturaSvc *service.SafraCulturaService
	areaSvc         *service.AreaService
	fazendaSvc      *service.FazendaService
}

func NewCustoAgricolaHandler(svc *service.CustoAgricolaService, safraCulturaSvc *service.SafraCulturaService, areaSvc *service.AreaService, fazendaSvc *service.FazendaService) *CustoAgricolaHandler {
	return &CustoAgricolaHandler{svc: svc, safraCulturaSvc: safraCulturaSvc, areaSvc: areaSvc, fazendaSvc: fazendaSvc}
}

func (h *CustoAgricolaHandler) ensureAccessSafraCultura(c *gin.Context, safraCulturaID int64) bool {
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

func (h *CustoAgricolaHandler) Create(c *gin.Context) {
	safraCulturaID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || safraCulturaID <= 0 {
		response.ErrorBadRequest(c, "safra_cultura_id inválido", nil)
		return
	}
	if !h.ensureAccessSafraCultura(c, safraCulturaID) {
		return
	}
	var req struct {
		Tipo         string   `json:"tipo" binding:"required"`
		Subcategoria *string  `json:"subcategoria"`
		Descricao    *string  `json:"descricao"`
		Valor        float64  `json:"valor" binding:"required"`
		Data         string   `json:"data" binding:"required"`
		Quantidade   *float64 `json:"quantidade"`
		Unidade      *string  `json:"unidade"`
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
	custo := &models.CustoAgricola{
		SafraCulturaID: safraCulturaID, Tipo: req.Tipo, Subcategoria: req.Subcategoria, Descricao: req.Descricao,
		Valor: req.Valor, Data: data, Quantidade: req.Quantidade, Unidade: req.Unidade, FornecedorID: req.FornecedorID,
	}
	if err := h.svc.Create(c.Request.Context(), custo); err != nil {
		response.ErrorInternal(c, "Erro ao criar custo", err.Error())
		return
	}
	response.SuccessCreated(c, custo, "Custo registrado com sucesso")
}

func (h *CustoAgricolaHandler) GetBySafraCulturaID(c *gin.Context) {
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
		response.ErrorInternal(c, "Erro ao listar custos", err.Error())
		return
	}
	response.SuccessOK(c, list, "Custos listados com sucesso")
}
