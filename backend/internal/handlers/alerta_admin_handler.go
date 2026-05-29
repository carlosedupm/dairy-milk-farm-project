package handlers

import (
	"time"

	"github.com/ceialmilk/api/internal/response"
	"github.com/ceialmilk/api/internal/service"
	"github.com/gin-gonic/gin"
)

type AlertaAdminHandler struct {
	geracaoSvc *service.AlertaGeracaoService
}

func NewAlertaAdminHandler(geracaoSvc *service.AlertaGeracaoService) *AlertaAdminHandler {
	return &AlertaAdminHandler{geracaoSvc: geracaoSvc}
}

func (h *AlertaAdminHandler) GerarAlertasDiarios(c *gin.Context) {
	if h.geracaoSvc == nil {
		response.ErrorInternal(c, "Serviço de geração de alertas indisponível", "")
		return
	}
	res, err := h.geracaoSvc.GerarAlertasDiarios(c.Request.Context(), time.Now())
	if err != nil {
		response.ErrorInternal(c, "Erro ao gerar alertas diários", err.Error())
		return
	}
	response.SuccessOK(c, res, "Geração de alertas concluída")
}
