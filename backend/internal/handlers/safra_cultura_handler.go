package handlers

import (
	"errors"
	"strconv"
	"time"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/response"
	"github.com/ceialmilk/api/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
)

type SafraCulturaHandler struct {
	svc        *service.SafraCulturaService
	areaSvc    *service.AreaService
	fazendaSvc *service.FazendaService
}

func NewSafraCulturaHandler(svc *service.SafraCulturaService, areaSvc *service.AreaService, fazendaSvc *service.FazendaService) *SafraCulturaHandler {
	return &SafraCulturaHandler{svc: svc, areaSvc: areaSvc, fazendaSvc: fazendaSvc}
}

func (h *SafraCulturaHandler) ensureFazendaAccessBySafraCulturaID(c *gin.Context, safraCulturaID int64) bool {
	sc, err := h.svc.GetByID(c.Request.Context(), safraCulturaID)
	if err != nil {
		return false
	}
	area, err := h.areaSvc.GetByID(c.Request.Context(), sc.AreaID)
	if err != nil {
		return false
	}
	return ValidateFazendaAccess(c, h.fazendaSvc, area.FazendaID)
}

func (h *SafraCulturaHandler) Create(c *gin.Context) {
	var req struct {
		AreaID        int64   `json:"area_id" binding:"required"`
		Ano           int     `json:"ano" binding:"required"`
		Cultura       string  `json:"cultura" binding:"required"`
		Status        *string `json:"status"`
		DataPlantio   *string `json:"data_plantio"`
		DataColheita  *string `json:"data_colheita"`
		Observacoes   *string `json:"observacoes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorValidation(c, "Dados inválidos", err.Error())
		return
	}
	area, err := h.areaSvc.GetByID(c.Request.Context(), req.AreaID)
	if err != nil {
		response.ErrorNotFound(c, "Área não encontrada")
		return
	}
	if !ValidateFazendaAccess(c, h.fazendaSvc, area.FazendaID) {
		return
	}
	status := models.SafraCulturaStatusPlantada
	if req.Status != nil {
		status = *req.Status
	}
	var dataPlantio, dataColheita *time.Time
	if req.DataPlantio != nil && *req.DataPlantio != "" {
		t, _ := time.Parse("2006-01-02", *req.DataPlantio)
		dataPlantio = &t
	}
	if req.DataColheita != nil && *req.DataColheita != "" {
		t, _ := time.Parse("2006-01-02", *req.DataColheita)
		dataColheita = &t
	}
	sc := &models.SafraCultura{
		AreaID: req.AreaID, Ano: req.Ano, Cultura: req.Cultura, Status: status,
		DataPlantio: dataPlantio, DataColheita: dataColheita, Observacoes: req.Observacoes,
	}
	if err := h.svc.Create(c.Request.Context(), sc); err != nil {
		response.ErrorInternal(c, "Erro ao criar safra/cultura", err.Error())
		return
	}
	response.SuccessCreated(c, sc, "Safra/cultura criada com sucesso")
}

func (h *SafraCulturaHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.ErrorBadRequest(c, "ID inválido", nil)
		return
	}
	sc, err := h.svc.GetByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, service.ErrSafraCulturaNotFound) || errors.Is(err, pgx.ErrNoRows) {
			response.ErrorNotFound(c, "Safra/cultura não encontrada")
			return
		}
		response.ErrorInternal(c, "Erro ao buscar safra/cultura", err.Error())
		return
	}
	if !h.ensureFazendaAccessBySafraCulturaID(c, id) {
		return
	}
	response.SuccessOK(c, sc, "Safra/cultura encontrada")
}

func (h *SafraCulturaHandler) GetByAreaIDAndAno(c *gin.Context) {
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
	list, err := h.svc.GetByAreaIDAndAno(c.Request.Context(), areaID, ano)
	if err != nil {
		response.ErrorInternal(c, "Erro ao listar safras/culturas", err.Error())
		return
	}
	response.SuccessOK(c, list, "Safras/culturas listadas com sucesso")
}

func (h *SafraCulturaHandler) Update(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.ErrorBadRequest(c, "ID inválido", nil)
		return
	}
	sc, err := h.svc.GetByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, service.ErrSafraCulturaNotFound) || errors.Is(err, pgx.ErrNoRows) {
			response.ErrorNotFound(c, "Safra/cultura não encontrada")
			return
		}
		response.ErrorInternal(c, "Erro ao buscar safra/cultura", err.Error())
		return
	}
	if !h.ensureFazendaAccessBySafraCulturaID(c, id) {
		return
	}
	var req struct {
		Status       *string `json:"status"`
		DataPlantio  *string `json:"data_plantio"`
		DataColheita *string `json:"data_colheita"`
		Observacoes  *string `json:"observacoes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorValidation(c, "Dados inválidos", err.Error())
		return
	}
	if req.Status != nil {
		sc.Status = *req.Status
	}
	if req.DataPlantio != nil && *req.DataPlantio != "" {
		t, _ := time.Parse("2006-01-02", *req.DataPlantio)
		sc.DataPlantio = &t
	}
	if req.DataColheita != nil && *req.DataColheita != "" {
		t, _ := time.Parse("2006-01-02", *req.DataColheita)
		sc.DataColheita = &t
	}
	if req.Observacoes != nil {
		sc.Observacoes = req.Observacoes
	}
	if err := h.svc.Update(c.Request.Context(), sc); err != nil {
		response.ErrorInternal(c, "Erro ao atualizar safra/cultura", err.Error())
		return
	}
	response.SuccessOK(c, sc, "Safra/cultura atualizada com sucesso")
}

func (h *SafraCulturaHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.ErrorBadRequest(c, "ID inválido", nil)
		return
	}
	if !h.ensureFazendaAccessBySafraCulturaID(c, id) {
		return
	}
	if err := h.svc.Delete(c.Request.Context(), id); err != nil {
		response.ErrorInternal(c, "Erro ao excluir safra/cultura", err.Error())
		return
	}
	response.SuccessOK(c, nil, "Safra/cultura excluída com sucesso")
}
