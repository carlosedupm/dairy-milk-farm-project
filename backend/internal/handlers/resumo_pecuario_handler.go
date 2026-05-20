package handlers

import (
	"strconv"

	"github.com/ceialmilk/api/internal/response"
	"github.com/ceialmilk/api/internal/service"
	"github.com/gin-gonic/gin"
)

type ResumoPecuarioHandler struct {
	svc        *service.ResumoPecuarioService
	fazendaSvc *service.FazendaService
}

func NewResumoPecuarioHandler(svc *service.ResumoPecuarioService, fazendaSvc *service.FazendaService) *ResumoPecuarioHandler {
	return &ResumoPecuarioHandler{svc: svc, fazendaSvc: fazendaSvc}
}

// GetByFazendaID GET /api/v1/fazendas/:id/resumo-pecuario?dias_parto=30
func (h *ResumoPecuarioHandler) GetByFazendaID(c *gin.Context) {
	fazendaID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.ErrorBadRequest(c, "ID da fazenda inválido", nil)
		return
	}
	if !ValidateFazendaAccess(c, h.fazendaSvc, fazendaID) {
		return
	}

	diasParto := 30
	if q := c.Query("dias_parto"); q != "" {
		if n, err := strconv.Atoi(q); err == nil {
			diasParto = n
		}
	}

	resumo, err := h.svc.Build(c.Request.Context(), fazendaID, diasParto)
	if err != nil {
		response.ErrorInternal(c, "Erro ao carregar resumo pecuário", err.Error())
		return
	}
	response.SuccessOK(c, resumo, "Resumo pecuário carregado com sucesso")
}
