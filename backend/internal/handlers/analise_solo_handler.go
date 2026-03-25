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

type AnaliseSoloHandler struct {
	svc        *service.AnaliseSoloService
	areaSvc    *service.AreaService
	fazendaSvc *service.FazendaService
}

func NewAnaliseSoloHandler(svc *service.AnaliseSoloService, areaSvc *service.AreaService, fazendaSvc *service.FazendaService) *AnaliseSoloHandler {
	return &AnaliseSoloHandler{svc: svc, areaSvc: areaSvc, fazendaSvc: fazendaSvc}
}

func parseDateOptional(s *string) (*time.Time, error) {
	if s == nil || *s == "" {
		return nil, nil
	}
	t, err := time.Parse("2006-01-02", *s)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (h *AnaliseSoloHandler) Create(c *gin.Context) {
	areaID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || areaID <= 0 {
		response.ErrorBadRequest(c, "area_id inválido", nil)
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
	var req struct {
		DataColeta       string   `json:"data_coleta" binding:"required"`
		DataResultado    *string  `json:"data_resultado"`
		Ph               *float64 `json:"ph"`
		FosforoP         *string  `json:"fosforo_p"`
		PotassioK        *string  `json:"potassio_k"`
		MateriaOrganica  *string  `json:"materia_organica"`
		Recomendacoes    *string  `json:"recomendacoes"`
		Laboratorio      *string  `json:"laboratorio"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorValidation(c, "Dados inválidos", err.Error())
		return
	}
	dataColeta, err := time.Parse("2006-01-02", req.DataColeta)
	if err != nil {
		response.ErrorValidation(c, "data_coleta inválida", err.Error())
		return
	}
	dataResultado, _ := parseDateOptional(req.DataResultado)
	a := &models.AnaliseSolo{
		AreaID: areaID, DataColeta: dataColeta, DataResultado: dataResultado,
		Ph: req.Ph, FosforoP: req.FosforoP, PotassioK: req.PotassioK, MateriaOrganica: req.MateriaOrganica,
		Recomendacoes: req.Recomendacoes, Laboratorio: req.Laboratorio,
	}
	if err := h.svc.Create(c.Request.Context(), a); err != nil {
		response.ErrorInternal(c, "Erro ao criar análise de solo", err.Error())
		return
	}
	response.SuccessCreated(c, a, "Análise de solo criada com sucesso")
}

func (h *AnaliseSoloHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.ErrorBadRequest(c, "ID inválido", nil)
		return
	}
	a, err := h.svc.GetByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, service.ErrAnaliseSoloNotFound) || errors.Is(err, pgx.ErrNoRows) {
			response.ErrorNotFound(c, "Análise de solo não encontrada")
			return
		}
		response.ErrorInternal(c, "Erro ao buscar análise", err.Error())
		return
	}
	area, _ := h.areaSvc.GetByID(c.Request.Context(), a.AreaID)
	if area != nil && !ValidateFazendaAccess(c, h.fazendaSvc, area.FazendaID) {
		return
	}
	response.SuccessOK(c, a, "Análise encontrada")
}

func (h *AnaliseSoloHandler) GetByAreaID(c *gin.Context) {
	areaID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || areaID <= 0 {
		response.ErrorBadRequest(c, "area_id inválido", nil)
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
	list, err := h.svc.GetByAreaID(c.Request.Context(), areaID)
	if err != nil {
		response.ErrorInternal(c, "Erro ao listar análises", err.Error())
		return
	}
	response.SuccessOK(c, list, "Análises listadas com sucesso")
}
