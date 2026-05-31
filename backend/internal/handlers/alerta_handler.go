package handlers

import (
	"errors"
	"strconv"
	"strings"
	"time"

	"github.com/ceialmilk/api/internal/response"
	"github.com/ceialmilk/api/internal/service"
	"github.com/gin-gonic/gin"
)

type AlertaHandler struct {
	svc        *service.AlertaService
	fazendaSvc *service.FazendaService
}

func NewAlertaHandler(svc *service.AlertaService, fazendaSvc *service.FazendaService) *AlertaHandler {
	return &AlertaHandler{svc: svc, fazendaSvc: fazendaSvc}
}

func parseAlertaFazendaID(c *gin.Context) (int64, bool) {
	fazendaID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || fazendaID <= 0 {
		response.ErrorBadRequest(c, "fazenda_id inválido", nil)
		return 0, false
	}
	return fazendaID, true
}

func parseAlertaID(c *gin.Context) (int64, bool) {
	alertaID, err := strconv.ParseInt(c.Param("alertaId"), 10, 64)
	if err != nil || alertaID <= 0 {
		response.ErrorBadRequest(c, "alerta_id inválido", nil)
		return 0, false
	}
	return alertaID, true
}

func getActorPerfil(c *gin.Context) string {
	perfilVal, _ := c.Get("perfil")
	perfil, _ := perfilVal.(string)
	return perfil
}

func (h *AlertaHandler) mapAlertaError(c *gin.Context, err error, internalMsg string) bool {
	if err == nil {
		return false
	}
	if RespondIfDomainWriteError(c, err) {
		return true
	}
	switch {
	case errors.Is(err, service.ErrAlertaNotFound):
		response.ErrorNotFound(c, "Alerta não encontrado")
	case errors.Is(err, service.ErrAlertaForbidden):
		response.ErrorForbidden(c, err.Error())
	case errors.Is(err, service.ErrAlertaSomenteManual),
		errors.Is(err, service.ErrAlertaSomenteManualCreate):
		response.ErrorForbidden(c, err.Error())
	case errors.Is(err, service.ErrAlertaTransicaoInvalida),
		errors.Is(err, service.ErrAlertaTipoInvalido),
		errors.Is(err, service.ErrAlertaSeveridadeInvalida),
		errors.Is(err, service.ErrAlertaStatusInvalido),
		errors.Is(err, service.ErrAlertaTituloObrigatorio),
		errors.Is(err, service.ErrAlertaPeriodoInvalido):
		response.ErrorValidation(c, err.Error(), nil)
	case errors.Is(err, service.ErrAlertaAnimalFazenda):
		response.ErrorForbidden(c, "Animal não pertence a esta fazenda.")
	case errors.Is(err, service.ErrAnimalNotFound):
		response.ErrorNotFound(c, "Animal não encontrado")
	default:
		response.ErrorInternal(c, internalMsg, err.Error())
	}
	return true
}

func parseAlertaListPeriod(startStr, endStr string) (*time.Time, *time.Time, error) {
	startStr = strings.TrimSpace(startStr)
	endStr = strings.TrimSpace(endStr)
	if startStr == "" && endStr == "" {
		return nil, nil, nil
	}
	if startStr == "" || endStr == "" {
		return nil, nil, service.ErrAlertaPeriodoInvalido
	}
	start, err := time.Parse("2006-01-02", startStr)
	if err != nil {
		return nil, nil, service.ErrAlertaPeriodoInvalido
	}
	end, err := time.Parse("2006-01-02", endStr)
	if err != nil {
		return nil, nil, service.ErrAlertaPeriodoInvalido
	}
	if start.After(end) {
		return nil, nil, service.ErrAlertaPeriodoInvalido
	}
	return &start, &end, nil
}

// List GET /api/v1/fazendas/:id/alertas
func (h *AlertaHandler) List(c *gin.Context) {
	fazendaID, ok := parseAlertaFazendaID(c)
	if !ok {
		return
	}
	if !ValidateFazendaAccess(c, h.fazendaSvc, fazendaID) {
		return
	}

	limit := parseQueryIntPositiveDef(c.Query("limit"), 25)
	offset := parseQueryIntNonNeg(c.DefaultQuery("offset", "0"), 0)
	if limit > 100 {
		limit = 100
	}

	periodStart, periodEnd, err := parseAlertaListPeriod(c.Query("start"), c.Query("end"))
	if err != nil {
		response.ErrorValidation(c, err.Error(), nil)
		return
	}

	list, total, err := h.svc.ListByFazenda(c.Request.Context(), fazendaID, service.AlertaListQuery{
		Status:      c.Query("status"),
		Tipo:        c.Query("tipo"),
		Severidade:  c.Query("severidade"),
		PeriodStart: periodStart,
		PeriodEnd:   periodEnd,
		Limit:       limit,
		Offset:      offset,
	})
	if h.mapAlertaError(c, err, "Erro ao listar alertas") {
		return
	}
	response.SuccessOK(c, gin.H{"alertas": list, "total": total}, "Alertas listados")
}

type createAlertaRequest struct {
	Tipo         string  `json:"tipo" binding:"required"`
	Titulo       string  `json:"titulo" binding:"required"`
	Descricao    *string `json:"descricao"`
	AnimalID     *int64  `json:"animal_id"`
	DataPrevista *string `json:"data_prevista"`
	Severidade   string  `json:"severidade" binding:"required"`
}

// Create POST /api/v1/fazendas/:id/alertas
func (h *AlertaHandler) Create(c *gin.Context) {
	fazendaID, ok := parseAlertaFazendaID(c)
	if !ok {
		return
	}
	if !ValidateFazendaAccess(c, h.fazendaSvc, fazendaID) {
		return
	}

	var req createAlertaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorBadRequest(c, "Corpo da requisição inválido", nil)
		return
	}

	actorID, ok := GetActorUserID(c)
	if !ok {
		response.ErrorUnauthorized(c, "Usuário não autenticado")
		return
	}

	var dataPrevista *time.Time
	if req.DataPrevista != nil && *req.DataPrevista != "" {
		t, err := time.Parse("2006-01-02", *req.DataPrevista)
		if err != nil {
			response.ErrorBadRequest(c, "data_prevista deve estar no formato YYYY-MM-DD", nil)
			return
		}
		dataPrevista = &t
	}

	row, err := h.svc.Create(c.Request.Context(), service.CreateAlertaInput{
		FazendaID:    fazendaID,
		Tipo:         req.Tipo,
		Titulo:       req.Titulo,
		Descricao:    req.Descricao,
		AnimalID:     req.AnimalID,
		DataPrevista: dataPrevista,
		Severidade:   req.Severidade,
		CreatedBy:    actorID,
	}, getActorPerfil(c))
	if h.mapAlertaError(c, err, "Erro ao criar alerta") {
		return
	}
	response.SuccessCreated(c, row, "Alerta criado")
}

// GetByID GET /api/v1/fazendas/:id/alertas/:alertaId
func (h *AlertaHandler) GetByID(c *gin.Context) {
	fazendaID, ok := parseAlertaFazendaID(c)
	if !ok {
		return
	}
	if !ValidateFazendaAccess(c, h.fazendaSvc, fazendaID) {
		return
	}
	alertaID, ok := parseAlertaID(c)
	if !ok {
		return
	}

	row, err := h.svc.GetByID(c.Request.Context(), fazendaID, alertaID)
	if h.mapAlertaError(c, err, "Erro ao buscar alerta") {
		return
	}
	response.SuccessOK(c, row, "Alerta encontrado")
}

type updateAlertaStatusRequest struct {
	Status string `json:"status" binding:"required"`
}

// UpdateStatus PATCH /api/v1/fazendas/:id/alertas/:alertaId/status
func (h *AlertaHandler) UpdateStatus(c *gin.Context) {
	fazendaID, ok := parseAlertaFazendaID(c)
	if !ok {
		return
	}
	if !ValidateFazendaAccess(c, h.fazendaSvc, fazendaID) {
		return
	}
	alertaID, ok := parseAlertaID(c)
	if !ok {
		return
	}

	var req updateAlertaStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorBadRequest(c, "Corpo da requisição inválido", nil)
		return
	}

	actorID, ok := GetActorUserID(c)
	if !ok {
		response.ErrorUnauthorized(c, "Usuário não autenticado")
		return
	}

	row, err := h.svc.UpdateStatus(c.Request.Context(), fazendaID, alertaID, service.UpdateAlertaStatusInput{
		Status:      req.Status,
		ActorUserID: actorID,
		Perfil:      getActorPerfil(c),
	})
	if h.mapAlertaError(c, err, "Erro ao atualizar status do alerta") {
		return
	}
	response.SuccessOK(c, row, "Status do alerta atualizado")
}

// Delete DELETE /api/v1/fazendas/:id/alertas/:alertaId
func (h *AlertaHandler) Delete(c *gin.Context) {
	fazendaID, ok := parseAlertaFazendaID(c)
	if !ok {
		return
	}
	if !ValidateFazendaAccess(c, h.fazendaSvc, fazendaID) {
		return
	}
	alertaID, ok := parseAlertaID(c)
	if !ok {
		return
	}

	err := h.svc.Delete(c.Request.Context(), fazendaID, alertaID, getActorPerfil(c))
	if h.mapAlertaError(c, err, "Erro ao excluir alerta") {
		return
	}
	response.SuccessOK(c, nil, "Alerta excluído")
}
