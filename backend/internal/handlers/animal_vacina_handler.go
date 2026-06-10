package handlers

import (
	"context"
	"errors"
	"strconv"
	"time"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/response"
	"github.com/ceialmilk/api/internal/service"
	"github.com/gin-gonic/gin"
)

type animalVacinaService interface {
	ListByAnimalID(ctx context.Context, animalID int64) ([]*models.AnimalVacina, error)
	GetByID(ctx context.Context, animalID, vacinaID int64) (*models.AnimalVacina, error)
	Create(ctx context.Context, animalID int64, in service.SaveAnimalVacinaInput, allowAgendar bool) (*models.AnimalVacina, error)
	Update(ctx context.Context, animalID, vacinaID int64, in service.SaveAnimalVacinaInput) (*models.AnimalVacina, error)
	Aplicar(ctx context.Context, animalID, vacinaID int64, in service.AplicarVacinaInput) (*models.AnimalVacina, error)
	Delete(ctx context.Context, animalID, vacinaID int64) error
}

type AnimalVacinaHandler struct {
	svc        animalVacinaService
	animalSvc  *service.AnimalService
	fazendaSvc *service.FazendaService
}

func NewAnimalVacinaHandler(svc animalVacinaService, animalSvc *service.AnimalService, fazendaSvc *service.FazendaService) *AnimalVacinaHandler {
	return &AnimalVacinaHandler{
		svc:        svc,
		animalSvc:  animalSvc,
		fazendaSvc: fazendaSvc,
	}
}

type saveAnimalVacinaRequest struct {
	TipoVacina         string  `json:"tipo_vacina" binding:"required"`
	Dose               *string `json:"dose"`
	DataPrevista       *string `json:"data_prevista"`
	DataAplicacao      *string `json:"data_aplicacao"`
	ValidadeDias       *int    `json:"validade_dias"`
	DataProximoReforco *string `json:"data_proximo_reforco"`
	Lote               *string `json:"lote"`
	Veterinario        *string `json:"veterinario"`
	Observacoes        *string `json:"observacoes"`
}

type aplicarAnimalVacinaRequest struct {
	DataAplicacao      string  `json:"data_aplicacao" binding:"required"`
	ValidadeDias       *int    `json:"validade_dias"`
	DataProximoReforco *string `json:"data_proximo_reforco"`
}

func (h *AnimalVacinaHandler) List(c *gin.Context) {
	animalID, ok := h.resolveAnimalIDAndAccess(c)
	if !ok {
		return
	}
	list, err := h.svc.ListByAnimalID(c.Request.Context(), animalID)
	if err != nil {
		if h.respondCommonErrors(c, err) {
			return
		}
		response.ErrorInternal(c, "Erro ao listar vacinas do animal", err.Error())
		return
	}
	if list == nil {
		list = []*models.AnimalVacina{}
	}
	response.SuccessOK(c, list, "Vacinas listadas com sucesso")
}

func (h *AnimalVacinaHandler) GetByID(c *gin.Context) {
	animalID, ok := h.resolveAnimalIDAndAccess(c)
	if !ok {
		return
	}
	vacinaID, ok := parseVacinaID(c)
	if !ok {
		return
	}
	row, err := h.svc.GetByID(c.Request.Context(), animalID, vacinaID)
	if err != nil {
		if h.respondCommonErrors(c, err) {
			return
		}
		response.ErrorInternal(c, "Erro ao buscar vacina", err.Error())
		return
	}
	response.SuccessOK(c, row, "Vacina carregada com sucesso")
}

func (h *AnimalVacinaHandler) Create(c *gin.Context) {
	animalID, ok := h.resolveAnimalIDAndAccess(c)
	if !ok {
		return
	}
	var req saveAnimalVacinaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorBadRequest(c, "Corpo da requisição inválido", nil)
		return
	}
	in, ok := parseSaveAnimalVacinaInput(c, req)
	if !ok {
		return
	}
	if actorID, exists := GetActorUserID(c); exists {
		in.CreatedBy = &actorID
	}
	// FUNCIONARIO só registra vacina aplicada (decisão G1 #4 do BRF-001); agendar prevista é GERENTE+.
	allowAgendar := getActorPerfil(c) != models.PerfilFuncionario
	row, err := h.svc.Create(c.Request.Context(), animalID, in, allowAgendar)
	if err != nil {
		if h.respondCommonErrors(c, err) {
			return
		}
		response.ErrorInternal(c, "Erro ao registrar vacina", err.Error())
		return
	}
	response.SuccessCreated(c, row, "Vacina registrada com sucesso")
}

func (h *AnimalVacinaHandler) Update(c *gin.Context) {
	animalID, ok := h.resolveAnimalIDAndAccess(c)
	if !ok {
		return
	}
	vacinaID, ok := parseVacinaID(c)
	if !ok {
		return
	}
	var req saveAnimalVacinaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorBadRequest(c, "Corpo da requisição inválido", nil)
		return
	}
	in, ok := parseSaveAnimalVacinaInput(c, req)
	if !ok {
		return
	}
	row, err := h.svc.Update(c.Request.Context(), animalID, vacinaID, in)
	if err != nil {
		if h.respondCommonErrors(c, err) {
			return
		}
		response.ErrorInternal(c, "Erro ao atualizar vacina", err.Error())
		return
	}
	response.SuccessOK(c, row, "Vacina atualizada com sucesso")
}

func (h *AnimalVacinaHandler) Aplicar(c *gin.Context) {
	animalID, ok := h.resolveAnimalIDAndAccess(c)
	if !ok {
		return
	}
	vacinaID, ok := parseVacinaID(c)
	if !ok {
		return
	}
	var req aplicarAnimalVacinaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorBadRequest(c, "Corpo da requisição inválido", nil)
		return
	}
	dataAplicacao, err := time.Parse("2006-01-02", req.DataAplicacao)
	if err != nil {
		response.ErrorBadRequest(c, "data_aplicacao deve estar no formato YYYY-MM-DD", nil)
		return
	}
	in := service.AplicarVacinaInput{
		DataAplicacao: dataAplicacao,
		ValidadeDias:  req.ValidadeDias,
	}
	if req.DataProximoReforco != nil && *req.DataProximoReforco != "" {
		t, err := time.Parse("2006-01-02", *req.DataProximoReforco)
		if err != nil {
			response.ErrorBadRequest(c, "data_proximo_reforco deve estar no formato YYYY-MM-DD", nil)
			return
		}
		in.DataProximoReforco = &t
	}
	row, err := h.svc.Aplicar(c.Request.Context(), animalID, vacinaID, in)
	if err != nil {
		if h.respondCommonErrors(c, err) {
			return
		}
		response.ErrorInternal(c, "Erro ao aplicar vacina", err.Error())
		return
	}
	response.SuccessOK(c, row, "Vacina aplicada com sucesso")
}

func (h *AnimalVacinaHandler) Delete(c *gin.Context) {
	animalID, ok := h.resolveAnimalIDAndAccess(c)
	if !ok {
		return
	}
	vacinaID, ok := parseVacinaID(c)
	if !ok {
		return
	}
	if err := h.svc.Delete(c.Request.Context(), animalID, vacinaID); err != nil {
		if h.respondCommonErrors(c, err) {
			return
		}
		response.ErrorInternal(c, "Erro ao excluir vacina", err.Error())
		return
	}
	response.SuccessOK(c, nil, "Vacina excluída com sucesso")
}

func (h *AnimalVacinaHandler) resolveAnimalIDAndAccess(c *gin.Context) (int64, bool) {
	animalID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || animalID <= 0 {
		response.ErrorBadRequest(c, "animal_id inválido", nil)
		return 0, false
	}
	animal, err := h.animalSvc.GetByID(c.Request.Context(), animalID)
	if err != nil {
		if errors.Is(err, service.ErrAnimalNotFound) {
			response.ErrorNotFound(c, "Animal não encontrado")
			return 0, false
		}
		response.ErrorInternal(c, "Erro ao validar animal", err.Error())
		return 0, false
	}
	if !ValidateFazendaAccess(c, h.fazendaSvc, animal.FazendaID) {
		return 0, false
	}
	return animalID, true
}

func parseVacinaID(c *gin.Context) (int64, bool) {
	vacinaID, err := strconv.ParseInt(c.Param("vacinaId"), 10, 64)
	if err != nil || vacinaID <= 0 {
		response.ErrorBadRequest(c, "vacina_id inválido", nil)
		return 0, false
	}
	return vacinaID, true
}

func parseSaveAnimalVacinaInput(c *gin.Context, req saveAnimalVacinaRequest) (service.SaveAnimalVacinaInput, bool) {
	in := service.SaveAnimalVacinaInput{
		TipoVacina:   req.TipoVacina,
		Dose:         req.Dose,
		ValidadeDias: req.ValidadeDias,
		Lote:         req.Lote,
		Veterinario:  req.Veterinario,
		Observacoes:  req.Observacoes,
	}
	parseDate := func(field string, value *string) (*time.Time, bool) {
		if value == nil || *value == "" {
			return nil, true
		}
		t, err := time.Parse("2006-01-02", *value)
		if err != nil {
			response.ErrorBadRequest(c, field+" deve estar no formato YYYY-MM-DD", nil)
			return nil, false
		}
		return &t, true
	}
	var ok bool
	if in.DataPrevista, ok = parseDate("data_prevista", req.DataPrevista); !ok {
		return service.SaveAnimalVacinaInput{}, false
	}
	if in.DataAplicacao, ok = parseDate("data_aplicacao", req.DataAplicacao); !ok {
		return service.SaveAnimalVacinaInput{}, false
	}
	if in.DataProximoReforco, ok = parseDate("data_proximo_reforco", req.DataProximoReforco); !ok {
		return service.SaveAnimalVacinaInput{}, false
	}
	return in, true
}

func (h *AnimalVacinaHandler) respondCommonErrors(c *gin.Context, err error) bool {
	if RespondIfDomainWriteError(c, err) {
		return true
	}
	switch {
	case errors.Is(err, service.ErrAnimalNotFound):
		response.ErrorNotFound(c, "Animal não encontrado")
	case errors.Is(err, service.ErrVacinaNotFound):
		response.Error(c, 404, "VACINA_NAO_ENCONTRADA", "Vacina não encontrada", nil)
	case errors.Is(err, service.ErrVacinaDuplicada):
		response.Error(c, 409, "VACINA_DUPLICADA", err.Error(), nil)
	case errors.Is(err, service.ErrVacinaJaAplicada):
		response.Error(c, 400, "VACINA_JA_APLICADA", err.Error(), nil)
	case errors.Is(err, service.ErrVacinaAgendamentoNaoPermitido):
		response.Error(c, 403, "VACINA_AGENDAMENTO_NAO_PERMITIDO", err.Error(), nil)
	case errors.Is(err, service.ErrVacinaTipoInvalido),
		errors.Is(err, service.ErrVacinaDataPrevistaObrigatoria),
		errors.Is(err, service.ErrVacinaValidadeInvalida):
		response.ErrorValidation(c, err.Error(), nil)
	default:
		return false
	}
	return true
}
