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

type ProducaoHandler struct {
	service    *service.ProducaoService
	animalSvc  *service.AnimalService
	fazendaSvc *service.FazendaService
}

func NewProducaoHandler(service *service.ProducaoService, animalSvc *service.AnimalService, fazendaSvc *service.FazendaService) *ProducaoHandler {
	return &ProducaoHandler{service: service, animalSvc: animalSvc, fazendaSvc: fazendaSvc}
}

type CreateProducaoRequest struct {
	AnimalID   int64   `json:"animal_id" binding:"required"`
	Quantidade float64 `json:"quantidade" binding:"required"`
	DataHora   *string `json:"data_hora"` // ISO datetime, opcional (default: agora)
	Qualidade  *int    `json:"qualidade"` // 1-10
}

type UpdateProducaoRequest struct {
	AnimalID   int64   `json:"animal_id" binding:"required"`
	Quantidade float64 `json:"quantidade" binding:"required"`
	DataHora   *string `json:"data_hora"` // ISO datetime
	Qualidade  *int    `json:"qualidade"` // 1-10
}

func (h *ProducaoHandler) Create(c *gin.Context) {
	var req CreateProducaoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorValidation(c, "Dados inválidos", err.Error())
		return
	}

	// Buscar animal para validar acesso à fazenda
	animal, err := h.animalSvc.GetByID(c.Request.Context(), req.AnimalID)
	if err != nil {
		if errors.Is(err, service.ErrAnimalNotFound) {
			response.ErrorNotFound(c, "Animal não encontrado")
			return
		}
		response.ErrorInternal(c, "Erro ao buscar animal", err.Error())
		return
	}

	if !ValidateFazendaAccess(c, h.fazendaSvc, animal.FazendaID) {
		return
	}

	producao := &models.ProducaoLeite{
		AnimalID:   req.AnimalID,
		Quantidade: req.Quantidade,
		Qualidade:  req.Qualidade,
		DataHora:   time.Now(), // default
	}

	if req.DataHora != nil && *req.DataHora != "" {
		dataHora, err := time.Parse(time.RFC3339, *req.DataHora)
		if err != nil {
			// Tentar formato simples
			dataHora, err = time.Parse("2006-01-02T15:04:05", *req.DataHora)
			if err != nil {
				response.ErrorValidation(c, "Data/hora inválida", "formato esperado: ISO datetime")
				return
			}
		}
		producao.DataHora = dataHora
	}

	if err := h.service.Create(c.Request.Context(), producao); err != nil {
		response.ErrorInternal(c, "Erro ao registrar produção", err.Error())
		return
	}

	response.SuccessCreated(c, producao, "Produção registrada com sucesso")
}

func (h *ProducaoHandler) GetByID(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		response.ErrorBadRequest(c, "ID inválido", nil)
		return
	}

	producao, err := h.service.GetByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, service.ErrProducaoNotFound) {
			response.ErrorNotFound(c, "Registro de produção não encontrado")
			return
		}
		response.ErrorInternal(c, "Erro ao buscar produção", err.Error())
		return
	}

	// Buscar animal para validar acesso à fazenda
	animal, err := h.animalSvc.GetByID(c.Request.Context(), producao.AnimalID)
	if err != nil {
		response.ErrorInternal(c, "Erro ao validar acesso à produção", err.Error())
		return
	}

	if !ValidateFazendaAccess(c, h.fazendaSvc, animal.FazendaID) {
		return
	}

	response.SuccessOK(c, producao, "Produção encontrada")
}

func (h *ProducaoHandler) GetAll(c *gin.Context) {
	producoes, err := h.service.GetAll(c.Request.Context())
	if err != nil {
		response.ErrorInternal(c, "Erro ao buscar produções", err.Error())
		return
	}

	response.SuccessOK(c, producoes, "Produções listadas com sucesso")
}

func (h *ProducaoHandler) GetByAnimalID(c *gin.Context) {
	animalIDStr := c.Param("id")
	animalID, err := strconv.ParseInt(animalIDStr, 10, 64)
	if err != nil {
		response.ErrorBadRequest(c, "ID do animal inválido", nil)
		return
	}

	// Buscar animal para validar acesso à fazenda
	animal, err := h.animalSvc.GetByID(c.Request.Context(), animalID)
	if err != nil {
		if errors.Is(err, service.ErrAnimalNotFound) {
			response.ErrorNotFound(c, "Animal não encontrado")
			return
		}
		response.ErrorInternal(c, "Erro ao buscar animal", err.Error())
		return
	}

	if !ValidateFazendaAccess(c, h.fazendaSvc, animal.FazendaID) {
		return
	}

	producoes, err := h.service.GetByAnimalID(c.Request.Context(), animalID)
	if err != nil {
		if errors.Is(err, service.ErrAnimalNotFound) {
			response.ErrorNotFound(c, "Animal não encontrado")
			return
		}
		response.ErrorInternal(c, "Erro ao buscar produções", err.Error())
		return
	}

	response.SuccessOK(c, producoes, "Produções do animal listadas com sucesso")
}

func (h *ProducaoHandler) GetByDateRange(c *gin.Context) {
	startStr := c.Query("start")
	endStr := c.Query("end")

	if startStr == "" || endStr == "" {
		response.ErrorBadRequest(c, "parâmetros start e end são obrigatórios", nil)
		return
	}

	startDate, err := time.Parse("2006-01-02", startStr)
	if err != nil {
		response.ErrorValidation(c, "Data inicial inválida", "formato esperado: YYYY-MM-DD")
		return
	}

	endDate, err := time.Parse("2006-01-02", endStr)
	if err != nil {
		response.ErrorValidation(c, "Data final inválida", "formato esperado: YYYY-MM-DD")
		return
	}
	// Adicionar fim do dia para incluir todo o dia final
	endDate = endDate.Add(24*time.Hour - time.Second)

	producoes, err := h.service.GetByDateRange(c.Request.Context(), startDate, endDate)
	if err != nil {
		response.ErrorInternal(c, "Erro ao buscar produções", err.Error())
		return
	}

	response.SuccessOK(c, producoes, "Produções por período listadas com sucesso")
}

func (h *ProducaoHandler) Update(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		response.ErrorBadRequest(c, "ID inválido", nil)
		return
	}

	// Buscar produção para validar acesso
	producaoExistente, err := h.service.GetByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, service.ErrProducaoNotFound) {
			response.ErrorNotFound(c, "Registro de produção não encontrado")
			return
		}
		response.ErrorInternal(c, "Erro ao buscar produção", err.Error())
		return
	}

	animalExistente, err := h.animalSvc.GetByID(c.Request.Context(), producaoExistente.AnimalID)
	if err != nil {
		response.ErrorInternal(c, "Erro ao validar acesso", err.Error())
		return
	}

	if !ValidateFazendaAccess(c, h.fazendaSvc, animalExistente.FazendaID) {
		return
	}

	var req UpdateProducaoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorValidation(c, "Dados inválidos", err.Error())
		return
	}

	// Se estiver mudando de animal, validar acesso ao novo animal
	if req.AnimalID != producaoExistente.AnimalID {
		animalNovo, err := h.animalSvc.GetByID(c.Request.Context(), req.AnimalID)
		if err != nil {
			if errors.Is(err, service.ErrAnimalNotFound) {
				response.ErrorNotFound(c, "Novo animal não encontrado")
				return
			}
			response.ErrorInternal(c, "Erro ao buscar novo animal", err.Error())
			return
		}
		if !ValidateFazendaAccess(c, h.fazendaSvc, animalNovo.FazendaID) {
			return
		}
	}

	producao := &models.ProducaoLeite{
		ID:         id,
		AnimalID:   req.AnimalID,
		Quantidade: req.Quantidade,
		Qualidade:  req.Qualidade,
	}

	if req.DataHora != nil && *req.DataHora != "" {
		dataHora, err := time.Parse(time.RFC3339, *req.DataHora)
		if err != nil {
			dataHora, err = time.Parse("2006-01-02T15:04:05", *req.DataHora)
			if err != nil {
				response.ErrorValidation(c, "Data/hora inválida", "formato esperado: ISO datetime")
				return
			}
		}
		producao.DataHora = dataHora
	}

	if err := h.service.Update(c.Request.Context(), producao); err != nil {
		if errors.Is(err, service.ErrProducaoNotFound) {
			response.ErrorNotFound(c, "Registro de produção não encontrado")
			return
		}
		response.ErrorInternal(c, "Erro ao atualizar produção", err.Error())
		return
	}

	response.SuccessOK(c, producao, "Produção atualizada com sucesso")
}

func (h *ProducaoHandler) Delete(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		response.ErrorBadRequest(c, "ID inválido", nil)
		return
	}

	// Buscar produção para validar acesso
	producao, err := h.service.GetByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, service.ErrProducaoNotFound) {
			response.ErrorNotFound(c, "Registro de produção não encontrado")
			return
		}
		response.ErrorInternal(c, "Erro ao buscar produção", err.Error())
		return
	}

	animal, err := h.animalSvc.GetByID(c.Request.Context(), producao.AnimalID)
	if err != nil {
		response.ErrorInternal(c, "Erro ao validar acesso", err.Error())
		return
	}

	if !ValidateFazendaAccess(c, h.fazendaSvc, animal.FazendaID) {
		return
	}

	if err := h.service.Delete(c.Request.Context(), id); err != nil {
		if errors.Is(err, service.ErrProducaoNotFound) {
			response.ErrorNotFound(c, "Registro de produção não encontrado")
			return
		}
		response.ErrorInternal(c, "Erro ao deletar produção", err.Error())
		return
	}

	response.SuccessOK(c, nil, "Produção deletada com sucesso")
}

func (h *ProducaoHandler) Count(c *gin.Context) {
	n, err := h.service.Count(c.Request.Context())
	if err != nil {
		response.ErrorInternal(c, "Erro ao contar", err.Error())
		return
	}
	response.SuccessOK(c, gin.H{"count": n}, "Contagem realizada com sucesso")
}

func (h *ProducaoHandler) CountByAnimal(c *gin.Context) {
	animalIDStr := c.Param("id")
	animalID, err := strconv.ParseInt(animalIDStr, 10, 64)
	if err != nil {
		response.ErrorBadRequest(c, "ID do animal inválido", nil)
		return
	}

	// Validar acesso
	animal, err := h.animalSvc.GetByID(c.Request.Context(), animalID)
	if err != nil {
		if errors.Is(err, service.ErrAnimalNotFound) {
			response.ErrorNotFound(c, "Animal não encontrado")
			return
		}
		response.ErrorInternal(c, "Erro ao buscar animal", err.Error())
		return
	}

	if !ValidateFazendaAccess(c, h.fazendaSvc, animal.FazendaID) {
		return
	}

	n, err := h.service.CountByAnimal(c.Request.Context(), animalID)
	if err != nil {
		response.ErrorInternal(c, "Erro ao contar", err.Error())
		return
	}
	response.SuccessOK(c, gin.H{"count": n}, "Contagem realizada com sucesso")
}

func (h *ProducaoHandler) GetResumoByAnimal(c *gin.Context) {
	animalIDStr := c.Param("id")
	animalID, err := strconv.ParseInt(animalIDStr, 10, 64)
	if err != nil {
		response.ErrorBadRequest(c, "ID do animal inválido", nil)
		return
	}

	// Validar acesso
	animal, err := h.animalSvc.GetByID(c.Request.Context(), animalID)
	if err != nil {
		if errors.Is(err, service.ErrAnimalNotFound) {
			response.ErrorNotFound(c, "Animal não encontrado")
			return
		}
		response.ErrorInternal(c, "Erro ao buscar animal", err.Error())
		return
	}

	if !ValidateFazendaAccess(c, h.fazendaSvc, animal.FazendaID) {
		return
	}

	resumo, err := h.service.GetResumoByAnimal(c.Request.Context(), animalID)
	if err != nil {
		if errors.Is(err, service.ErrAnimalNotFound) {
			response.ErrorNotFound(c, "Animal não encontrado")
			return
		}
		response.ErrorInternal(c, "Erro ao buscar resumo", err.Error())
		return
	}

	response.SuccessOK(c, resumo, "Resumo de produção do animal")
}
