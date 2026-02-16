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

type AnimalHandler struct {
	service           *service.AnimalService
	fazendaSvc        *service.FazendaService
	reclassificacaoSvc *service.ReclassificacaoCategoriaService
}

func NewAnimalHandler(service *service.AnimalService, fazendaSvc *service.FazendaService, reclassificacaoSvc *service.ReclassificacaoCategoriaService) *AnimalHandler {
	return &AnimalHandler{service: service, fazendaSvc: fazendaSvc, reclassificacaoSvc: reclassificacaoSvc}
}

type CreateAnimalRequest struct {
	FazendaID         int64   `json:"fazenda_id" binding:"required"`
	Identificacao     string  `json:"identificacao" binding:"required"`
	Raca              *string `json:"raca"`
	DataNascimento    *string `json:"data_nascimento"` // ISO date YYYY-MM-DD
	Sexo              *string `json:"sexo"`            // M ou F
	StatusSaude       *string `json:"status_saude"`
	Categoria         *string `json:"categoria"`
	StatusReprodutivo *string `json:"status_reprodutivo"`
	MaeID             *int64  `json:"mae_id"`
	PaiInfo           *string `json:"pai_info"`
	LoteID            *int64  `json:"lote_id"`
	PesoNascimento    *float64 `json:"peso_nascimento"`
	DataEntrada       *string  `json:"data_entrada"`   // ISO date YYYY-MM-DD
	DataSaida         *string  `json:"data_saida"`     // ISO date YYYY-MM-DD
	MotivoSaida       *string  `json:"motivo_saida"`
}

type UpdateAnimalRequest struct {
	FazendaID         int64   `json:"fazenda_id" binding:"required"`
	Identificacao     string  `json:"identificacao" binding:"required"`
	Raca              *string `json:"raca"`
	DataNascimento    *string `json:"data_nascimento"` // ISO date YYYY-MM-DD
	Sexo              *string `json:"sexo"`            // M ou F
	StatusSaude       *string `json:"status_saude"`
	Categoria         *string `json:"categoria"`
	StatusReprodutivo *string `json:"status_reprodutivo"`
	MaeID             *int64  `json:"mae_id"`
	PaiInfo           *string `json:"pai_info"`
	LoteID            *int64  `json:"lote_id"`
	PesoNascimento    *float64 `json:"peso_nascimento"`
	DataEntrada       *string  `json:"data_entrada"`   // ISO date YYYY-MM-DD
	DataSaida         *string  `json:"data_saida"`     // ISO date YYYY-MM-DD
	MotivoSaida       *string  `json:"motivo_saida"`
}

func (h *AnimalHandler) Create(c *gin.Context) {
	var req CreateAnimalRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorValidation(c, "Dados inválidos", err.Error())
		return
	}

	// Validar acesso à fazenda
	if !ValidateFazendaAccess(c, h.fazendaSvc, req.FazendaID) {
		return
	}

	animal := &models.Animal{
		FazendaID:         req.FazendaID,
		Identificacao:     req.Identificacao,
		Raca:              req.Raca,
		Sexo:              req.Sexo,
		StatusSaude:       req.StatusSaude,
		Categoria:         req.Categoria,
		StatusReprodutivo: req.StatusReprodutivo,
		MaeID:             req.MaeID,
		PaiInfo:           req.PaiInfo,
		LoteID:            req.LoteID,
		PesoNascimento:    req.PesoNascimento,
		MotivoSaida:       req.MotivoSaida,
	}

	if dataNascimento, err := parseDate(req.DataNascimento); err != nil {
		response.ErrorValidation(c, "Data de nascimento inválida", err.Error())
		return
	} else if dataNascimento != nil {
		animal.DataNascimento = dataNascimento
	}
	if dataEntrada, err := parseDate(req.DataEntrada); err != nil {
		response.ErrorValidation(c, "Data de entrada inválida", err.Error())
		return
	} else if dataEntrada != nil {
		animal.DataEntrada = dataEntrada
	}
	if dataSaida, err := parseDate(req.DataSaida); err != nil {
		response.ErrorValidation(c, "Data de saída inválida", err.Error())
		return
	} else if dataSaida != nil {
		animal.DataSaida = dataSaida
	}

	if err := h.service.Create(c.Request.Context(), animal); err != nil {
		response.ErrorInternal(c, "Erro ao criar animal", err.Error())
		return
	}

	response.SuccessCreated(c, animal, "Animal criado com sucesso")
}

func (h *AnimalHandler) GetByID(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		response.ErrorBadRequest(c, "ID inválido", nil)
		return
	}

	animal, err := h.service.GetByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, service.ErrAnimalNotFound) {
			response.ErrorNotFound(c, "Animal não encontrado")
			return
		}
		response.ErrorInternal(c, "Erro ao buscar animal", err.Error())
		return
	}

	// Validar acesso à fazenda do animal
	if !ValidateFazendaAccess(c, h.fazendaSvc, animal.FazendaID) {
		return
	}

	response.SuccessOK(c, animal, "Animal encontrado")
}

func (h *AnimalHandler) GetAll(c *gin.Context) {
	animais, err := h.service.GetAll(c.Request.Context())
	if err != nil {
		response.ErrorInternal(c, "Erro ao buscar animais", err.Error())
		return
	}

	response.SuccessOK(c, animais, "Animais listados com sucesso")
}

func (h *AnimalHandler) GetByFazendaID(c *gin.Context) {
	fazendaIDStr := c.Param("id")
	fazendaID, err := strconv.ParseInt(fazendaIDStr, 10, 64)
	if err != nil {
		response.ErrorBadRequest(c, "ID da fazenda inválido", nil)
		return
	}

	// Validar acesso à fazenda
	if !ValidateFazendaAccess(c, h.fazendaSvc, fazendaID) {
		return
	}

	animais, err := h.service.GetByFazendaID(c.Request.Context(), fazendaID)
	if err != nil {
		if errors.Is(err, service.ErrFazendaNotFound) {
			response.ErrorNotFound(c, "Fazenda não encontrada")
			return
		}
		response.ErrorInternal(c, "Erro ao buscar animais", err.Error())
		return
	}

	response.SuccessOK(c, animais, "Animais da fazenda listados com sucesso")
}

func (h *AnimalHandler) Update(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		response.ErrorBadRequest(c, "ID inválido", nil)
		return
	}

	// Buscar animal para validar acesso à fazenda atual
	animalExistente, err := h.service.GetByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, service.ErrAnimalNotFound) {
			response.ErrorNotFound(c, "Animal não encontrado")
			return
		}
		response.ErrorInternal(c, "Erro ao buscar animal", err.Error())
		return
	}

	if !ValidateFazendaAccess(c, h.fazendaSvc, animalExistente.FazendaID) {
		return
	}

	var req UpdateAnimalRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorValidation(c, "Dados inválidos", err.Error())
		return
	}

	// Se estiver mudando de fazenda, validar acesso à nova fazenda
	if req.FazendaID != animalExistente.FazendaID {
		if !ValidateFazendaAccess(c, h.fazendaSvc, req.FazendaID) {
			return
		}
	}

	// Montar animal: usar valores de req; preservar campos de gestão pecuária
	// que o frontend não envia (evita apagar reclassificação automática pós-parto)
	animal := &models.Animal{
		ID:                id,
		FazendaID:         req.FazendaID,
		Identificacao:     req.Identificacao,
		Raca:              req.Raca,
		Sexo:              req.Sexo,
		StatusSaude:       req.StatusSaude,
		Categoria:         req.Categoria,
		StatusReprodutivo: req.StatusReprodutivo,
		MaeID:             req.MaeID,
		PaiInfo:           req.PaiInfo,
		LoteID:            req.LoteID,
		PesoNascimento:    req.PesoNascimento,
		MotivoSaida:       req.MotivoSaida,
	}
	// Preservar campos que o formulário atual não envia (evita apagar reclassificação)
	if req.StatusReprodutivo == nil {
		animal.StatusReprodutivo = animalExistente.StatusReprodutivo
	}
	if req.MaeID == nil {
		animal.MaeID = animalExistente.MaeID
	}
	if req.PaiInfo == nil {
		animal.PaiInfo = animalExistente.PaiInfo
	}
	if req.LoteID == nil {
		animal.LoteID = animalExistente.LoteID
	}
	if req.PesoNascimento == nil {
		animal.PesoNascimento = animalExistente.PesoNascimento
	}
	if req.DataEntrada == nil || *req.DataEntrada == "" {
		animal.DataEntrada = animalExistente.DataEntrada
	} else if t, err := parseDate(req.DataEntrada); err == nil && t != nil {
		animal.DataEntrada = t
	}
	if req.DataSaida == nil || *req.DataSaida == "" {
		animal.DataSaida = animalExistente.DataSaida
	} else if t, err := parseDate(req.DataSaida); err == nil && t != nil {
		animal.DataSaida = t
	}
	if req.MotivoSaida == nil {
		animal.MotivoSaida = animalExistente.MotivoSaida
	}

	if dataNascimento, err := parseDate(req.DataNascimento); err != nil {
		response.ErrorValidation(c, "Data de nascimento inválida", err.Error())
		return
	} else if dataNascimento != nil {
		animal.DataNascimento = dataNascimento
	}

	if err := h.service.Update(c.Request.Context(), animal); err != nil {
		if errors.Is(err, service.ErrAnimalNotFound) {
			response.ErrorNotFound(c, "Animal não encontrado")
			return
		}
		response.ErrorInternal(c, "Erro ao atualizar animal", err.Error())
		return
	}

	response.SuccessOK(c, animal, "Animal atualizado com sucesso")
}

func (h *AnimalHandler) Delete(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		response.ErrorBadRequest(c, "ID inválido", nil)
		return
	}

	// Buscar animal para validar acesso à fazenda
	animal, err := h.service.GetByID(c.Request.Context(), id)
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

	if err := h.service.Delete(c.Request.Context(), id); err != nil {
		if errors.Is(err, service.ErrAnimalNotFound) {
			response.ErrorNotFound(c, "Animal não encontrado")
			return
		}
		response.ErrorInternal(c, "Erro ao deletar animal", err.Error())
		return
	}

	response.SuccessOK(c, nil, "Animal deletado com sucesso")
}

func (h *AnimalHandler) SearchByIdentificacao(c *gin.Context) {
	identificacao := c.Query("identificacao")
	if identificacao == "" {
		response.ErrorBadRequest(c, "parâmetro identificacao é obrigatório", nil)
		return
	}
	list, err := h.service.SearchByIdentificacao(c.Request.Context(), identificacao)
	if err != nil {
		response.ErrorInternal(c, "Erro ao buscar", err.Error())
		return
	}
	response.SuccessOK(c, list, "Busca realizada com sucesso")
}

func (h *AnimalHandler) GetByStatusSaude(c *gin.Context) {
	statusSaude := c.Query("status_saude")
	if statusSaude == "" {
		response.ErrorBadRequest(c, "parâmetro status_saude é obrigatório", nil)
		return
	}
	list, err := h.service.GetByStatusSaude(c.Request.Context(), statusSaude)
	if err != nil {
		response.ErrorInternal(c, "Erro ao buscar", err.Error())
		return
	}
	response.SuccessOK(c, list, "Busca realizada com sucesso")
}

func (h *AnimalHandler) GetBySexo(c *gin.Context) {
	sexo := c.Query("sexo")
	if sexo == "" {
		response.ErrorBadRequest(c, "parâmetro sexo é obrigatório", nil)
		return
	}
	list, err := h.service.GetBySexo(c.Request.Context(), sexo)
	if err != nil {
		response.ErrorValidation(c, err.Error(), nil)
		return
	}
	response.SuccessOK(c, list, "Busca realizada com sucesso")
}

func (h *AnimalHandler) Count(c *gin.Context) {
	n, err := h.service.Count(c.Request.Context())
	if err != nil {
		response.ErrorInternal(c, "Erro ao contar", err.Error())
		return
	}
	response.SuccessOK(c, gin.H{"count": n}, "Contagem realizada com sucesso")
}

func (h *AnimalHandler) CountByFazenda(c *gin.Context) {
	fazendaIDStr := c.Param("id")
	fazendaID, err := strconv.ParseInt(fazendaIDStr, 10, 64)
	if err != nil {
		response.ErrorBadRequest(c, "ID da fazenda inválido", nil)
		return
	}

	// Validar acesso à fazenda
	if !ValidateFazendaAccess(c, h.fazendaSvc, fazendaID) {
		return
	}

	n, err := h.service.CountByFazenda(c.Request.Context(), fazendaID)
	if err != nil {
		response.ErrorInternal(c, "Erro ao contar", err.Error())
		return
	}
	response.SuccessOK(c, gin.H{"count": n}, "Contagem realizada com sucesso")
}

func (h *AnimalHandler) GetByLoteID(c *gin.Context) {
	loteIDStr := c.Query("lote_id")
	loteID, err := strconv.ParseInt(loteIDStr, 10, 64)
	if err != nil || loteID <= 0 {
		response.ErrorBadRequest(c, "lote_id obrigatorio e deve ser maior que zero", nil)
		return
	}
	list, err := h.service.GetByLoteID(c.Request.Context(), loteID)
	if err != nil {
		response.ErrorInternal(c, "Erro ao buscar animais do lote", err.Error())
		return
	}
	response.SuccessOK(c, list, "Animais do lote listados com sucesso")
}

func (h *AnimalHandler) GetByCategoria(c *gin.Context) {
	fazendaIDStr := c.Query("fazenda_id")
	categoria := c.Query("categoria")
	fazendaID, err := strconv.ParseInt(fazendaIDStr, 10, 64)
	if err != nil || fazendaID <= 0 {
		response.ErrorBadRequest(c, "fazenda_id obrigatorio", nil)
		return
	}
	if !ValidateFazendaAccess(c, h.fazendaSvc, fazendaID) {
		return
	}
	list, err := h.service.GetByCategoria(c.Request.Context(), fazendaID, categoria)
	if err != nil {
		response.ErrorValidation(c, err.Error(), nil)
		return
	}
	response.SuccessOK(c, list, "Animais listados com sucesso")
}

func (h *AnimalHandler) GetByStatusReprodutivo(c *gin.Context) {
	fazendaIDStr := c.Query("fazenda_id")
	status := c.Query("status_reprodutivo")
	fazendaID, err := strconv.ParseInt(fazendaIDStr, 10, 64)
	if err != nil || fazendaID <= 0 {
		response.ErrorBadRequest(c, "fazenda_id obrigatorio", nil)
		return
	}
	if !ValidateFazendaAccess(c, h.fazendaSvc, fazendaID) {
		return
	}
	list, err := h.service.GetByStatusReprodutivo(c.Request.Context(), fazendaID, status)
	if err != nil {
		response.ErrorValidation(c, err.Error(), nil)
		return
	}
	response.SuccessOK(c, list, "Animais listados com sucesso")
}

// RunReclassificacaoPorIdade executa a reclassificação por idade (bezerra → novilha).
// Query: meses (opcional) — idade mínima em meses; padrão 12.
func (h *AnimalHandler) RunReclassificacaoPorIdade(c *gin.Context) {
	meses := 0
	if s := c.Query("meses"); s != "" {
		if n, err := strconv.Atoi(s); err == nil && n > 0 {
			meses = n
		}
	}
	res, err := h.reclassificacaoSvc.RunReclassificacaoPorIdade(c.Request.Context(), meses)
	if err != nil {
		response.ErrorInternal(c, "Erro ao reclassificar categorias", err.Error())
		return
	}
	response.SuccessOK(c, res, "Reclassificação por idade concluída")
}

// parseDate converte string ISO YYYY-MM-DD para *time.Time
func parseDate(s *string) (*time.Time, error) {
	if s == nil || *s == "" {
		return nil, nil
	}
	t, err := time.Parse("2006-01-02", *s)
	if err != nil {
		return nil, err
	}
	return &t, nil
}
