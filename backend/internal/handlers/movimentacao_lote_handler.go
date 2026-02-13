package handlers

import (
	"strconv"
	"time"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/response"
	"github.com/ceialmilk/api/internal/service"
	"github.com/gin-gonic/gin"
)

type MovimentacaoLoteHandler struct {
	svc        *service.MovimentacaoLoteService
	animalSvc  *service.AnimalService
	fazendaSvc *service.FazendaService
}

func NewMovimentacaoLoteHandler(svc *service.MovimentacaoLoteService, animalSvc *service.AnimalService, fazendaSvc *service.FazendaService) *MovimentacaoLoteHandler {
	return &MovimentacaoLoteHandler{svc: svc, animalSvc: animalSvc, fazendaSvc: fazendaSvc}
}

func (h *MovimentacaoLoteHandler) Movimentar(c *gin.Context) {
	animalID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.ErrorBadRequest(c, "ID do animal invalido", nil)
		return
	}
	animal, err := h.animalSvc.GetByID(c.Request.Context(), animalID)
	if err != nil {
		if err == service.ErrAnimalNotFound {
			response.ErrorNotFound(c, "Animal nao encontrado")
			return
		}
		response.ErrorInternal(c, "Erro ao buscar animal", err.Error())
		return
	}
	if !ValidateFazendaAccess(c, h.fazendaSvc, animal.FazendaID) {
		return
	}
	var req struct {
		LoteDestinoID int64   `json:"lote_destino_id" binding:"required"`
		Motivo        *string `json:"motivo"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorValidation(c, "Dados invalidos", err.Error())
		return
	}
	userIDVal, ok := c.Get("user_id")
	if !ok {
		response.ErrorUnauthorized(c, "Usuario nao identificado")
		return
	}
	userID, ok := userIDVal.(int64)
	if !ok {
		response.ErrorInternal(c, "ID de usuario invalido", nil)
		return
	}
	m := &models.MovimentacaoLote{
		AnimalID:      animalID,
		LoteDestinoID: req.LoteDestinoID,
		Motivo:        req.Motivo,
		UsuarioID:     userID,
		Data:          time.Now(),
	}
	if animal.LoteID != nil {
		m.LoteOrigemID = animal.LoteID
	}
	if err := h.svc.Create(c.Request.Context(), m); err != nil {
		if err == service.ErrAnimalNotFound {
			response.ErrorNotFound(c, "Animal nao encontrado")
			return
		}
		if err == service.ErrLoteNotFound {
			response.ErrorNotFound(c, "Lote de destino nao encontrado")
			return
		}
		response.ErrorInternal(c, "Erro ao movimentar animal", err.Error())
		return
	}
	response.SuccessCreated(c, m, "Animal movimentado com sucesso")
}
