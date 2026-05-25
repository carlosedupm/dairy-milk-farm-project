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

type RestricaoLeiteHandler struct {
	svc        *service.RestricaoLeiteService
	fazendaSvc *service.FazendaService
}

func NewRestricaoLeiteHandler(svc *service.RestricaoLeiteService, fazendaSvc *service.FazendaService) *RestricaoLeiteHandler {
	return &RestricaoLeiteHandler{svc: svc, fazendaSvc: fazendaSvc}
}

// GetAtivas GET /api/v1/fazendas/:id/restricoes-leite/ativas
func (h *RestricaoLeiteHandler) GetAtivas(c *gin.Context) {
	fazendaID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || fazendaID <= 0 {
		response.ErrorBadRequest(c, "fazenda_id inválido", nil)
		return
	}
	if !ValidateFazendaAccess(c, h.fazendaSvc, fazendaID) {
		return
	}
	list, err := h.svc.ListAtivasByFazenda(c.Request.Context(), fazendaID)
	if err != nil {
		response.ErrorInternal(c, "Erro ao listar restrições de leite", err.Error())
		return
	}
	if list == nil {
		list = []models.RestricaoLeiteAtiva{}
	}
	response.SuccessOK(c, list, "Restrições ativas")
}

type createRestricaoLeiteRequest struct {
	AnimalID   int64   `json:"animal_id" binding:"required"`
	Motivo     string  `json:"motivo" binding:"required"`
	InicioEm   *string `json:"inicio_em"`
	Observacao *string `json:"observacao"`
}

// Create POST /api/v1/fazendas/:id/restricoes-leite
func (h *RestricaoLeiteHandler) Create(c *gin.Context) {
	fazendaID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || fazendaID <= 0 {
		response.ErrorBadRequest(c, "fazenda_id inválido", nil)
		return
	}
	if !ValidateFazendaAccess(c, h.fazendaSvc, fazendaID) {
		return
	}

	var req createRestricaoLeiteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorBadRequest(c, "Corpo da requisição inválido", nil)
		return
	}

	var inicio *time.Time
	if req.InicioEm != nil && *req.InicioEm != "" {
		t, err := time.Parse("2006-01-02", *req.InicioEm)
		if err != nil {
			response.ErrorBadRequest(c, "inicio_em deve estar no formato YYYY-MM-DD", nil)
			return
		}
		inicio = &t
	}

	in := service.CreateRestricaoLeiteInput{
		FazendaID:  fazendaID,
		AnimalID:   req.AnimalID,
		Motivo:     req.Motivo,
		InicioEm:   inicio,
		Observacao: req.Observacao,
	}
	if actorID, ok := GetActorUserID(c); ok {
		in.CreatedBy = &actorID
	}
	row, err := h.svc.Create(c.Request.Context(), in)
	if err != nil {
		if RespondIfDomainWriteError(c, err) {
			return
		}
		switch {
		case errors.Is(err, service.ErrRestricaoLeiteMotivoInvalido):
			response.ErrorValidation(c, err.Error(), nil)
		case errors.Is(err, service.ErrAnimalNotFound):
			response.ErrorNotFound(c, "Animal não encontrado")
		case errors.Is(err, service.ErrRestricaoLeiteAnimalFazenda):
			response.ErrorForbidden(c, "Animal não pertence a esta fazenda.")
		case errors.Is(err, service.ErrRestricaoLeiteAnimalSemLactacao):
			response.ErrorValidation(c, err.Error(), nil)
		case errors.Is(err, service.ErrRestricaoLeiteJaAberta):
			response.ErrorConflict(c, err.Error(), nil)
		default:
			response.ErrorInternal(c, "Erro ao registrar restrição de leite", err.Error())
		}
		return
	}
	response.SuccessCreated(c, row, "Restrição de leite registrada")
}

type liberarRestricaoLeiteRequest struct {
	LiberadoEm         *string `json:"liberado_em"`
	LiberadoObservacao *string `json:"liberado_observacao"`
}

// Liberar PATCH /api/v1/fazendas/:id/restricoes-leite/:restricaoId/liberar
func (h *RestricaoLeiteHandler) Liberar(c *gin.Context) {
	fazendaID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || fazendaID <= 0 {
		response.ErrorBadRequest(c, "fazenda_id inválido", nil)
		return
	}
	if !ValidateFazendaAccess(c, h.fazendaSvc, fazendaID) {
		return
	}

	perfilVal, _ := c.Get("perfil")
	perfil, _ := perfilVal.(string)
	if !models.PodeLiberarRestricaoLeite(perfil) {
		response.ErrorForbidden(c, "Apenas gestão ou usuários autorizados podem liberar após o laboratório.")
		return
	}

	restricaoID, err := strconv.ParseInt(c.Param("restricaoId"), 10, 64)
	if err != nil || restricaoID <= 0 {
		response.ErrorBadRequest(c, "restricao_id inválido", nil)
		return
	}

	var req liberarRestricaoLeiteRequest
	if c.Request.ContentLength > 0 {
		if err := c.ShouldBindJSON(&req); err != nil {
			response.ErrorBadRequest(c, "Corpo da requisição inválido", nil)
			return
		}
	}

	liberadoEm := time.Now().UTC()
	if req.LiberadoEm != nil && *req.LiberadoEm != "" {
		t, err := time.Parse("2006-01-02", *req.LiberadoEm)
		if err != nil {
			response.ErrorBadRequest(c, "liberado_em deve estar no formato YYYY-MM-DD", nil)
			return
		}
		liberadoEm = t
	}

	libIn := service.LiberarRestricaoLeiteInput{
		LiberadoEm:         liberadoEm,
		LiberadoObservacao: req.LiberadoObservacao,
	}
	if actorID, ok := GetActorUserID(c); ok {
		libIn.LiberadoPor = &actorID
	}
	row, err := h.svc.Liberar(c.Request.Context(), fazendaID, restricaoID, libIn)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrRestricaoLeiteNotFound):
			response.ErrorNotFound(c, "Restrição não encontrada")
		case errors.Is(err, service.ErrRestricaoLeiteNaoAguardando):
			response.ErrorConflict(c, err.Error(), nil)
		default:
			response.ErrorInternal(c, "Erro ao liberar restrição de leite", err.Error())
		}
		return
	}
	response.SuccessOK(c, row, "Restrição liberada após laboratório")
}
