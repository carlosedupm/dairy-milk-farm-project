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

type FazendaHandler struct {
	service *service.FazendaService
}

func NewFazendaHandler(service *service.FazendaService) *FazendaHandler {
	return &FazendaHandler{service: service}
}

type CreateFazendaRequest struct {
	Nome        string  `json:"nome" binding:"required"`
	Localizacao *string `json:"localizacao"`
	Fundacao    *string `json:"fundacao"` // ISO date YYYY-MM-DD
}

type UpdateFazendaRequest struct {
	Nome        string  `json:"nome" binding:"required"`
	Localizacao *string `json:"localizacao"`
	Fundacao    *string `json:"fundacao"` // ISO date YYYY-MM-DD
}

func (h *FazendaHandler) Create(c *gin.Context) {
	var req CreateFazendaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorValidation(c, "Dados inválidos", err.Error())
		return
	}

	fazenda := &models.Fazenda{
		Nome:            req.Nome,
		Localizacao:     req.Localizacao,
		QuantidadeVacas: 0,
	}
	if fundacao, err := parseFundacao(req.Fundacao); err != nil {
		response.ErrorValidation(c, "Data de fundação inválida", err.Error())
		return
	} else if fundacao != nil {
		fazenda.Fundacao = fundacao
	}

	if err := h.service.Create(c.Request.Context(), fazenda); err != nil {
		if errors.Is(err, service.ErrFazendaDuplicada) {
			response.ErrorConflict(c, "Já existe uma fazenda com esse nome e localização", nil)
			return
		}
		response.ErrorInternal(c, "Erro ao criar fazenda", err.Error())
		return
	}

	response.SuccessCreated(c, fazenda, "Fazenda criada com sucesso")
}

func (h *FazendaHandler) GetByID(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		response.ErrorBadRequest(c, "ID inválido", nil)
		return
	}

	// Validar acesso
	if !ValidateFazendaAccess(c, h.service, id) {
		return
	}

	fazenda, err := h.service.GetByID(c.Request.Context(), id)
	if err != nil {
		response.ErrorNotFound(c, "Fazenda não encontrada")
		return
	}

	response.SuccessOK(c, fazenda, "Fazenda encontrada")
}

func (h *FazendaHandler) GetAll(c *gin.Context) {
	fazendas, err := h.service.GetAll(c.Request.Context())
	if err != nil {
		response.ErrorInternal(c, "Erro ao buscar fazendas", err.Error())
		return
	}

	response.SuccessOK(c, fazendas, "Fazendas listadas com sucesso")
}

func (h *FazendaHandler) Update(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		response.ErrorBadRequest(c, "ID inválido", nil)
		return
	}

	// Validar acesso
	if !ValidateFazendaAccess(c, h.service, id) {
		return
	}

	var req UpdateFazendaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorValidation(c, "Dados inválidos", err.Error())
		return
	}

	fazenda := &models.Fazenda{
		ID:              id,
		Nome:            req.Nome,
		Localizacao:     req.Localizacao,
		QuantidadeVacas: 0,
	}
	if fundacao, err := parseFundacao(req.Fundacao); err != nil {
		response.ErrorValidation(c, "Data de fundação inválida", err.Error())
		return
	} else if fundacao != nil {
		fazenda.Fundacao = fundacao
	}

	if err := h.service.Update(c.Request.Context(), fazenda); err != nil {
		if errors.Is(err, service.ErrFazendaNotFound) {
			response.ErrorNotFound(c, "Fazenda não encontrada")
			return
		}
		if errors.Is(err, service.ErrFazendaDuplicada) {
			response.ErrorConflict(c, "Já existe uma fazenda com esse nome e localização", nil)
			return
		}
		response.ErrorInternal(c, "Erro ao atualizar fazenda", err.Error())
		return
	}

	response.SuccessOK(c, fazenda, "Fazenda atualizada com sucesso")
}

func (h *FazendaHandler) Delete(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		response.ErrorBadRequest(c, "ID inválido", nil)
		return
	}

	// Validar acesso
	if !ValidateFazendaAccess(c, h.service, id) {
		return
	}

	if err := h.service.Delete(c.Request.Context(), id); err != nil {
		if errors.Is(err, service.ErrFazendaNotFound) {
			response.ErrorNotFound(c, "Fazenda não encontrada")
			return
		}
		response.ErrorInternal(c, "Erro ao deletar fazenda", err.Error())
		return
	}

	response.SuccessOK(c, nil, "Fazenda deletada com sucesso")
}

func parseFundacao(s *string) (*time.Time, error) {
	if s == nil || *s == "" {
		return nil, nil
	}
	t, err := time.Parse("2006-01-02", *s)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (h *FazendaHandler) SearchByNome(c *gin.Context) {
	nome := c.Query("nome")
	if nome == "" {
		response.ErrorBadRequest(c, "parâmetro nome é obrigatório", nil)
		return
	}
	list, err := h.service.SearchByNome(c.Request.Context(), nome)
	if err != nil {
		response.ErrorInternal(c, "Erro ao buscar", err.Error())
		return
	}
	response.SuccessOK(c, list, "Busca realizada com sucesso")
}

func (h *FazendaHandler) SearchByLocalizacao(c *gin.Context) {
	loc := c.Query("localizacao")
	if loc == "" {
		response.ErrorBadRequest(c, "parâmetro localizacao é obrigatório", nil)
		return
	}
	list, err := h.service.SearchByLocalizacao(c.Request.Context(), loc)
	if err != nil {
		response.ErrorInternal(c, "Erro ao buscar", err.Error())
		return
	}
	response.SuccessOK(c, list, "Busca realizada com sucesso")
}

func (h *FazendaHandler) SearchByVacasMin(c *gin.Context) {
	qtyStr := c.Query("quantidade")
	if qtyStr == "" {
		response.ErrorBadRequest(c, "parâmetro quantidade é obrigatório", nil)
		return
	}
	qty, err := strconv.Atoi(qtyStr)
	if err != nil || qty < 0 {
		response.ErrorValidation(c, "quantidade deve ser um inteiro não negativo", nil)
		return
	}
	list, err := h.service.SearchByVacasMin(c.Request.Context(), qty)
	if err != nil {
		response.ErrorInternal(c, "Erro ao buscar", err.Error())
		return
	}
	response.SuccessOK(c, list, "Busca realizada com sucesso")
}

func (h *FazendaHandler) SearchByVacasRange(c *gin.Context) {
	minStr, maxStr := c.Query("min"), c.Query("max")
	if minStr == "" || maxStr == "" {
		response.ErrorBadRequest(c, "parâmetros min e max são obrigatórios", nil)
		return
	}
	min, err1 := strconv.Atoi(minStr)
	max, err2 := strconv.Atoi(maxStr)
	if err1 != nil || err2 != nil || min < 0 || max < 0 || min > max {
		response.ErrorValidation(c, "min e max devem ser inteiros não negativos com min <= max", nil)
		return
	}
	list, err := h.service.SearchByVacasRange(c.Request.Context(), min, max)
	if err != nil {
		response.ErrorInternal(c, "Erro ao buscar", err.Error())
		return
	}
	response.SuccessOK(c, list, "Busca realizada com sucesso")
}

func (h *FazendaHandler) Count(c *gin.Context) {
	n, err := h.service.Count(c.Request.Context())
	if err != nil {
		response.ErrorInternal(c, "Erro ao contar", err.Error())
		return
	}
	response.SuccessOK(c, gin.H{"count": n}, "Contagem realizada com sucesso")
}

func (h *FazendaHandler) Exists(c *gin.Context) {
	nome := c.Query("nome")
	if nome == "" {
		response.ErrorBadRequest(c, "parâmetro nome é obrigatório", nil)
		return
	}
	exists, err := h.service.ExistsByNome(c.Request.Context(), nome)
	if err != nil {
		response.ErrorInternal(c, "Erro ao verificar", err.Error())
		return
	}
	response.SuccessOK(c, gin.H{"exists": exists}, "Verificação realizada com sucesso")
}

// GetMinhasFazendas retorna as fazendas vinculadas ao usuário logado (minhas fazendas).
func (h *FazendaHandler) GetMinhasFazendas(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		response.ErrorUnauthorized(c, "Usuário não identificado")
		return
	}
	userID, ok := userIDVal.(int64)
	if !ok {
		response.ErrorInternal(c, "ID de usuário inválido", nil)
		return
	}
	fazendas, err := h.service.GetByUsuarioID(c.Request.Context(), userID)
	if err != nil {
		response.ErrorInternal(c, "Erro ao buscar fazendas", err.Error())
		return
	}
	response.SuccessOK(c, fazendas, "Fazendas listadas com sucesso")
}
