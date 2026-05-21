package handlers

import (
	"strconv"

	"github.com/ceialmilk/api/internal/response"
	"github.com/ceialmilk/api/internal/service"
	"github.com/gin-gonic/gin"
)

type ConformidadeHandler struct {
	svc        *service.ConformidadeService
	fazendaSvc *service.FazendaService
}

func NewConformidadeHandler(svc *service.ConformidadeService, fazendaSvc *service.FazendaService) *ConformidadeHandler {
	return &ConformidadeHandler{svc: svc, fazendaSvc: fazendaSvc}
}

// GetConformidade lista anomalias de integridade dos dados da fazenda (gestão).
func (h *ConformidadeHandler) GetConformidade(c *gin.Context) {
	fazendaID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || fazendaID <= 0 {
		response.ErrorBadRequest(c, "ID da fazenda inválido", nil)
		return
	}
	if !ValidateFazendaAccessOrGestao(c, h.fazendaSvc, fazendaID) {
		return
	}
	list, err := h.svc.ListByFazenda(c.Request.Context(), fazendaID)
	if err != nil {
		response.ErrorInternal(c, "Erro ao auditar conformidade", err.Error())
		return
	}
	response.SuccessOK(c, gin.H{
		"fazenda_id": fazendaID,
		"total":      len(list),
		"anomalias":  list,
	}, "OK")
}
