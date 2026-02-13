package handlers

import (
	"errors"
	"strconv"
	"time"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/response"
	"github.com/ceialmilk/api/internal/service"
	"github.com/gin-gonic/gin"
)

type CioHandler struct {
	svc *service.CioService
	fazendaSvc *service.FazendaService
}

func NewCioHandler(svc *service.CioService, fazendaSvc *service.FazendaService) *CioHandler {
	return &CioHandler{svc: svc, fazendaSvc: fazendaSvc}
}

func (h *CioHandler) Create(c *gin.Context) {
	var req struct {
		AnimalID       int64   `json:"animal_id" binding:"required"`
		DataDetectado  string  `json:"data_detectado" binding:"required"`
		MetodoDeteccao *string `json:"metodo_deteccao"`
		Intensidade    *string `json:"intensidade"`
		Observacoes    *string `json:"observacoes"`
		FazendaID      int64   `json:"fazenda_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorValidation(c, "Dados invalidos", err.Error())
		return
	}
	if !ValidateFazendaAccess(c, h.fazendaSvc, req.FazendaID) { return }
	t, err := time.Parse(time.RFC3339, req.DataDetectado)
	if err != nil {
		response.ErrorValidation(c, "data_detectado invalida", err.Error())
		return
	}
	cio := &models.Cio{AnimalID: req.AnimalID, DataDetectado: t, MetodoDeteccao: req.MetodoDeteccao, Intensidade: req.Intensidade, Observacoes: req.Observacoes, FazendaID: req.FazendaID}
	if err := h.svc.Create(c.Request.Context(), cio); err != nil {
		response.ErrorInternal(c, "Erro ao registrar cio", err.Error())
		return
	}
	response.SuccessCreated(c, cio, "Cio registrado com sucesso")
}

func (h *CioHandler) GetByID(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	cio, err := h.svc.GetByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, service.ErrCioNotFound) { response.ErrorNotFound(c, "Cio nao encontrado"); return }
		response.ErrorInternal(c, "Erro ao buscar cio", err.Error()); return
	}
	if !ValidateFazendaAccess(c, h.fazendaSvc, cio.FazendaID) { return }
	response.SuccessOK(c, cio, "OK")
}

func (h *CioHandler) GetByFazendaID(c *gin.Context) {
	fazendaID, err := strconv.ParseInt(c.Query("fazenda_id"), 10, 64)
	if err != nil || fazendaID <= 0 { response.ErrorBadRequest(c, "fazenda_id obrigatorio", nil); return }
	if !ValidateFazendaAccess(c, h.fazendaSvc, fazendaID) { return }
	list, err := h.svc.GetByFazendaID(c.Request.Context(), fazendaID)
	if err != nil { response.ErrorInternal(c, "Erro ao listar cios", err.Error()); return }
	response.SuccessOK(c, list, "OK")
}

func (h *CioHandler) GetByAnimalID(c *gin.Context) {
	animalID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil { response.ErrorBadRequest(c, "ID invalido", nil); return }
	list, err := h.svc.GetByAnimalID(c.Request.Context(), animalID)
	if err != nil { response.ErrorInternal(c, "Erro ao listar cios", err.Error()); return }
	response.SuccessOK(c, list, "OK")
}

func (h *CioHandler) Delete(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	cio, err := h.svc.GetByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, service.ErrCioNotFound) { response.ErrorNotFound(c, "Cio nao encontrado"); return }
		response.ErrorInternal(c, "Erro ao buscar cio", err.Error()); return
	}
	if !ValidateFazendaAccess(c, h.fazendaSvc, cio.FazendaID) { return }
	if err := h.svc.Delete(c.Request.Context(), id); err != nil {
		response.ErrorInternal(c, "Erro ao deletar cio", err.Error()); return
	}
	response.SuccessOK(c, nil, "Cio deletado com sucesso")
}
