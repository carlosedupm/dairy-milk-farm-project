package handlers

import (
	"strconv"

	"github.com/ceialmilk/api/internal/response"
	"github.com/ceialmilk/api/internal/service"
	"github.com/gin-gonic/gin"
)

type ResultadoAgricolaHandler struct {
	svc        *service.ResultadoAgricolaService
	areaSvc    *service.AreaService
	fazendaSvc *service.FazendaService
}

func NewResultadoAgricolaHandler(svc *service.ResultadoAgricolaService, areaSvc *service.AreaService, fazendaSvc *service.FazendaService) *ResultadoAgricolaHandler {
	return &ResultadoAgricolaHandler{svc: svc, areaSvc: areaSvc, fazendaSvc: fazendaSvc}
}

func (h *ResultadoAgricolaHandler) GetByAreaIDAndAno(c *gin.Context) {
	areaID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.ErrorBadRequest(c, "area_id inválido", nil)
		return
	}
	anoStr := c.Param("ano")
	ano, err := strconv.Atoi(anoStr)
	if err != nil {
		response.ErrorBadRequest(c, "ano inválido", nil)
		return
	}
	area, err := h.areaSvc.GetByID(c.Request.Context(), areaID)
	if err != nil {
		response.ErrorNotFound(c, "Área não encontrada")
		return
	}
	if !ValidateFazendaAccess(c, h.fazendaSvc, area.FazendaID) {
		return
	}
	res, err := h.svc.GetResultadoByAreaAndAno(c.Request.Context(), areaID, ano)
	if err != nil {
		response.ErrorInternal(c, "Erro ao calcular resultado", err.Error())
		return
	}
	response.SuccessOK(c, res, "Resultado por área/safra")
}

func (h *ResultadoAgricolaHandler) GetByFazendaIDAndAno(c *gin.Context) {
	fazendaID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || fazendaID <= 0 {
		response.ErrorBadRequest(c, "fazenda_id inválido", nil)
		return
	}
	if !ValidateFazendaAccess(c, h.fazendaSvc, fazendaID) {
		return
	}
	anoStr := c.Param("ano")
	ano, err := strconv.Atoi(anoStr)
	if err != nil {
		response.ErrorBadRequest(c, "ano inválido", nil)
		return
	}
	list, totalCustos, totalReceitas, err := h.svc.GetResultadoByFazendaAndAno(c.Request.Context(), fazendaID, ano)
	if err != nil {
		response.ErrorInternal(c, "Erro ao calcular resultado", err.Error())
		return
	}
	response.SuccessOK(c, gin.H{
		"por_area":       list,
		"total_custos":   totalCustos,
		"total_receitas": totalReceitas,
		"resultado":      totalReceitas - totalCustos,
	}, "Resultado agrícola consolidado")
}

func (h *ResultadoAgricolaHandler) GetComparativoFornecedores(c *gin.Context) {
	fazendaID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || fazendaID <= 0 {
		response.ErrorBadRequest(c, "fazenda_id inválido", nil)
		return
	}
	if !ValidateFazendaAccess(c, h.fazendaSvc, fazendaID) {
		return
	}
	anoStr := c.Param("ano")
	ano, err := strconv.Atoi(anoStr)
	if err != nil {
		response.ErrorBadRequest(c, "ano inválido", nil)
		return
	}
	list, err := h.svc.GetComparativoFornecedoresByFazendaAndAno(c.Request.Context(), fazendaID, ano)
	if err != nil {
		response.ErrorInternal(c, "Erro ao obter comparativo de fornecedores", err.Error())
		return
	}
	response.SuccessOK(c, list, "Comparativo de fornecedores por safra")
}
