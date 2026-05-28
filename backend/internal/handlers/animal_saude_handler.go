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

type animalSaudeService interface {
	ListByAnimalID(ctx context.Context, animalID int64) ([]*models.AnimalSaude, error)
	GetByID(ctx context.Context, animalID, saudeID int64) (*models.AnimalSaude, error)
	Create(ctx context.Context, animalID int64, in service.SaveAnimalSaudeInput) (*models.AnimalSaude, error)
	Update(ctx context.Context, animalID, saudeID int64, in service.SaveAnimalSaudeInput) (*models.AnimalSaude, error)
	Delete(ctx context.Context, animalID, saudeID int64) error
}

type AnimalSaudeHandler struct {
	svc        animalSaudeService
	animalSvc  *service.AnimalService
	fazendaSvc *service.FazendaService
}

func NewAnimalSaudeHandler(svc animalSaudeService, animalSvc *service.AnimalService, fazendaSvc *service.FazendaService) *AnimalSaudeHandler {
	return &AnimalSaudeHandler{
		svc:        svc,
		animalSvc:  animalSvc,
		fazendaSvc: fazendaSvc,
	}
}

type saveAnimalSaudeRequest struct {
	TipoCaso    string  `json:"tipo_caso" binding:"required"`
	DataInicio  string  `json:"data_inicio" binding:"required"`
	DataFim     *string `json:"data_fim"`
	Status      string  `json:"status" binding:"required"`
	Observacoes *string `json:"observacoes"`
}

func (h *AnimalSaudeHandler) List(c *gin.Context) {
	animalID, ok := h.resolveAnimalIDAndAccess(c)
	if !ok {
		return
	}
	list, err := h.svc.ListByAnimalID(c.Request.Context(), animalID)
	if err != nil {
		if h.respondCommonErrors(c, err) {
			return
		}
		response.ErrorInternal(c, "Erro ao listar casos de saúde do animal", err.Error())
		return
	}
	if list == nil {
		list = []*models.AnimalSaude{}
	}
	response.SuccessOK(c, list, "Casos de saúde listados com sucesso")
}

func (h *AnimalSaudeHandler) GetByID(c *gin.Context) {
	animalID, ok := h.resolveAnimalIDAndAccess(c)
	if !ok {
		return
	}
	saudeID, err := strconv.ParseInt(c.Param("saudeId"), 10, 64)
	if err != nil || saudeID <= 0 {
		response.ErrorBadRequest(c, "saude_id inválido", nil)
		return
	}
	row, err := h.svc.GetByID(c.Request.Context(), animalID, saudeID)
	if err != nil {
		if h.respondCommonErrors(c, err) {
			return
		}
		response.ErrorInternal(c, "Erro ao buscar caso de saúde", err.Error())
		return
	}
	response.SuccessOK(c, row, "Caso de saúde carregado com sucesso")
}

func (h *AnimalSaudeHandler) Create(c *gin.Context) {
	animalID, ok := h.resolveAnimalIDAndAccess(c)
	if !ok {
		return
	}
	var req saveAnimalSaudeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorBadRequest(c, "Corpo da requisição inválido", nil)
		return
	}
	in, ok := parseSaveAnimalSaudeInput(c, req)
	if !ok {
		return
	}
	if actorID, exists := GetActorUserID(c); exists {
		in.CreatedBy = &actorID
	}
	row, err := h.svc.Create(c.Request.Context(), animalID, in)
	if err != nil {
		if h.respondCommonErrors(c, err) {
			return
		}
		response.ErrorInternal(c, "Erro ao registrar caso de saúde", err.Error())
		return
	}
	response.SuccessCreated(c, row, "Caso de saúde registrado com sucesso")
}

func (h *AnimalSaudeHandler) Update(c *gin.Context) {
	animalID, ok := h.resolveAnimalIDAndAccess(c)
	if !ok {
		return
	}
	saudeID, err := strconv.ParseInt(c.Param("saudeId"), 10, 64)
	if err != nil || saudeID <= 0 {
		response.ErrorBadRequest(c, "saude_id inválido", nil)
		return
	}
	var req saveAnimalSaudeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorBadRequest(c, "Corpo da requisição inválido", nil)
		return
	}
	in, ok := parseSaveAnimalSaudeInput(c, req)
	if !ok {
		return
	}
	row, err := h.svc.Update(c.Request.Context(), animalID, saudeID, in)
	if err != nil {
		if h.respondCommonErrors(c, err) {
			return
		}
		response.ErrorInternal(c, "Erro ao atualizar caso de saúde", err.Error())
		return
	}
	response.SuccessOK(c, row, "Caso de saúde atualizado com sucesso")
}

func (h *AnimalSaudeHandler) Delete(c *gin.Context) {
	animalID, ok := h.resolveAnimalIDAndAccess(c)
	if !ok {
		return
	}
	saudeID, err := strconv.ParseInt(c.Param("saudeId"), 10, 64)
	if err != nil || saudeID <= 0 {
		response.ErrorBadRequest(c, "saude_id inválido", nil)
		return
	}
	if err := h.svc.Delete(c.Request.Context(), animalID, saudeID); err != nil {
		if h.respondCommonErrors(c, err) {
			return
		}
		response.ErrorInternal(c, "Erro ao excluir caso de saúde", err.Error())
		return
	}
	response.SuccessOK(c, nil, "Caso de saúde excluído com sucesso")
}

func (h *AnimalSaudeHandler) resolveAnimalIDAndAccess(c *gin.Context) (int64, bool) {
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

func parseSaveAnimalSaudeInput(c *gin.Context, req saveAnimalSaudeRequest) (service.SaveAnimalSaudeInput, bool) {
	dataInicio, err := time.Parse("2006-01-02", req.DataInicio)
	if err != nil {
		response.ErrorBadRequest(c, "data_inicio deve estar no formato YYYY-MM-DD", nil)
		return service.SaveAnimalSaudeInput{}, false
	}
	var dataFim *time.Time
	if req.DataFim != nil && *req.DataFim != "" {
		df, err := time.Parse("2006-01-02", *req.DataFim)
		if err != nil {
			response.ErrorBadRequest(c, "data_fim deve estar no formato YYYY-MM-DD", nil)
			return service.SaveAnimalSaudeInput{}, false
		}
		dataFim = &df
	}
	return service.SaveAnimalSaudeInput{
		TipoCaso:    req.TipoCaso,
		DataInicio:  dataInicio,
		DataFim:     dataFim,
		Status:      req.Status,
		Observacoes: req.Observacoes,
	}, true
}

func (h *AnimalSaudeHandler) respondCommonErrors(c *gin.Context, err error) bool {
	if RespondIfDomainWriteError(c, err) {
		return true
	}
	switch {
	case errors.Is(err, service.ErrAnimalNotFound):
		response.ErrorNotFound(c, "Animal não encontrado")
	case errors.Is(err, service.ErrAnimalSaudeNotFound):
		response.ErrorNotFound(c, "Caso de saúde não encontrado")
	case errors.Is(err, service.ErrAnimalSaudeTipoCasoInvalido),
		errors.Is(err, service.ErrAnimalSaudeStatusInvalido),
		errors.Is(err, service.ErrAnimalSaudeDataFimInvalida):
		response.ErrorValidation(c, err.Error(), nil)
	default:
		return false
	}
	return true
}
