package handlers

import (
	"context"
	"errors"
	"strconv"
	"strings"
	"time"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/repository"
	"github.com/ceialmilk/api/internal/response"
	"github.com/ceialmilk/api/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
)

type AnimalHandler struct {
	service              *service.AnimalService
	baixaSvc             *service.AnimalBaixaService
	fazendaSvc           *service.FazendaService
	producaoSvc          *service.ProducaoService
	reclassificacaoSvc   *service.ReclassificacaoCategoriaService
	restricaoLeiteSvc    *service.RestricaoLeiteService
	gestacaoSvc          *service.GestacaoService
	cicloSvc             *service.AnimalCicloService
	saudeSvc             *service.AnimalSaudeService
	usuarioRepo          *repository.UsuarioRepository
}

func NewAnimalHandler(
	service *service.AnimalService,
	baixaSvc *service.AnimalBaixaService,
	fazendaSvc *service.FazendaService,
	producaoSvc *service.ProducaoService,
	reclassificacaoSvc *service.ReclassificacaoCategoriaService,
	restricaoLeiteSvc *service.RestricaoLeiteService,
	gestacaoSvc *service.GestacaoService,
	cicloSvc *service.AnimalCicloService,
	saudeSvc *service.AnimalSaudeService,
	usuarioRepo *repository.UsuarioRepository,
) *AnimalHandler {
	return &AnimalHandler{
		service:            service,
		baixaSvc:           baixaSvc,
		fazendaSvc:         fazendaSvc,
		producaoSvc:        producaoSvc,
		reclassificacaoSvc: reclassificacaoSvc,
		restricaoLeiteSvc:  restricaoLeiteSvc,
		gestacaoSvc:        gestacaoSvc,
		cicloSvc:           cicloSvc,
		saudeSvc:           saudeSvc,
		usuarioRepo:        usuarioRepo,
	}
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
	ObservacaoSaida   *string  `json:"observacao_saida"`
	OrigemAquisicao   *string  `json:"origem_aquisicao"` // NASCIDO ou COMPRADO
}

type RegistrarBaixaRequest struct {
	DataSaida       string  `json:"data_saida" binding:"required"`
	MotivoSaida     string  `json:"motivo_saida" binding:"required"`
	ObservacaoSaida *string `json:"observacao_saida"`
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
	ObservacaoSaida   *string  `json:"observacao_saida"`
	OrigemAquisicao   *string  `json:"origem_aquisicao"` // NASCIDO ou COMPRADO
}

func parseNoRebanhoQuery(v string) bool {
	if v == "" || v == "true" || v == "1" {
		return true
	}
	return false
}

func (h *AnimalHandler) mapBaixaError(c *gin.Context, err error) bool {
	if err == nil {
		return false
	}
	switch {
	case errors.Is(err, service.ErrAnimalNotFound):
		response.ErrorNotFound(c, "Animal não encontrado")
	case errors.Is(err, service.ErrAnimalJaBaixado):
		response.ErrorConflict(c, "Animal já possui baixa registrada", nil)
	case errors.Is(err, service.ErrAnimalSemBaixa):
		response.ErrorBadRequest(c, "Animal não possui baixa para reverter", nil)
	case errors.Is(err, service.ErrMotivoBaixaPerfil):
		response.ErrorForbidden(c, "Perfil não autorizado para este motivo de baixa")
	default:
		response.ErrorValidation(c, err.Error(), nil)
	}
	return true
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

	origem := models.OrigemNascido
	if req.OrigemAquisicao != nil && *req.OrigemAquisicao != "" {
		if !models.IsValidOrigemAquisicao(*req.OrigemAquisicao) {
			response.ErrorValidation(c, "origem_aquisicao inválida", "deve ser NASCIDO ou COMPRADO")
			return
		}
		origem = *req.OrigemAquisicao
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
		ObservacaoSaida:   req.ObservacaoSaida,
		OrigemAquisicao:   &origem,
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

	if actorID, ok := GetActorUserID(c); ok {
		SetCreatedBy(&animal.CreatedBy, actorID)
	}

	if err := h.service.Create(c.Request.Context(), animal); err != nil {
		if RespondIfIntegridadeCiclo(c, err) {
			return
		}
		if errors.Is(err, service.ErrAnimalIdentificacaoDuplicada) {
			response.ErrorConflict(c, "Já existe um animal com essa identificação", nil)
			return
		}
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

	fazendas, err := h.fazendaSvc.GetByUsuarioID(c.Request.Context(), userID)
	if err != nil {
		response.ErrorInternal(c, "Erro ao listar fazendas do usuário", err.Error())
		return
	}
	fazendaIDs := make([]int64, 0, len(fazendas))
	for _, fz := range fazendas {
		fazendaIDs = append(fazendaIDs, fz.ID)
	}

	if s := c.Query("fazenda_id"); s != "" {
		fid, err := strconv.ParseInt(s, 10, 64)
		if err != nil || fid <= 0 {
			response.ErrorBadRequest(c, "fazenda_id inválido", nil)
			return
		}
		allowed := false
		for _, id := range fazendaIDs {
			if id == fid {
				allowed = true
				break
			}
		}
		if !allowed {
			response.ErrorForbidden(c, "Você não tem acesso a esta fazenda")
			return
		}
		fazendaIDs = []int64{fid}
	}

	limit := parseQueryIntPositiveDef(c.DefaultQuery("limit", "25"), 25)
	offset := parseQueryIntNonNeg(c.DefaultQuery("offset", "0"), 0)
	if limit > 100 {
		limit = 100
	}

	q := service.AnimalListQuery{
		Limit:             limit,
		Offset:            offset,
		Identificacao:     c.Query("identificacao"),
		Categoria:         c.Query("categoria"),
		Sexo:              c.Query("sexo"),
		StatusSaude:       c.Query("status_saude"),
		StatusReprodutivo: c.Query("status_reprodutivo"),
		NoRebanho:         parseNoRebanhoQuery(c.Query("no_rebanho")),
		RebanhoFiltro:     c.Query("rebanho"),
	}
	if q.RebanhoFiltro == "" && c.Query("no_rebanho") == "false" {
		q.RebanhoFiltro = "todos"
	}
	if ls := c.Query("lote_id"); ls != "" {
		lid, err := strconv.ParseInt(ls, 10, 64)
		if err != nil || lid <= 0 {
			response.ErrorBadRequest(c, "lote_id inválido", nil)
			return
		}
		q.LoteID = lid
	}

	animais, total, err := h.service.ListAnimaisPaginatedForFazendas(c.Request.Context(), fazendaIDs, q)
	if err != nil {
		response.ErrorValidation(c, err.Error(), nil)
		return
	}

	response.SuccessOK(c, gin.H{"animais": animais, "total": total}, "Animais listados com sucesso")
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

	if c.Query("limit") == "" {
		var animais []*models.Animal
		var err error
		if parseNoRebanhoQuery(c.Query("no_rebanho")) {
			animais, err = h.service.GetByFazendaIDNoRebanho(c.Request.Context(), fazendaID)
		} else {
			animais, err = h.service.GetByFazendaID(c.Request.Context(), fazendaID)
		}
		if err != nil {
			if errors.Is(err, service.ErrFazendaNotFound) {
				response.ErrorNotFound(c, "Fazenda não encontrada")
				return
			}
			response.ErrorInternal(c, "Erro ao buscar animais", err.Error())
			return
		}

		response.SuccessOK(c, animais, "Animais da fazenda listados com sucesso")
		return
	}

	limit := parseQueryIntPositiveDef(c.Query("limit"), 25)
	offset := parseQueryIntNonNeg(c.DefaultQuery("offset", "0"), 0)
	if limit > 100 {
		limit = 100
	}

	q := service.AnimalListQuery{
		Limit:             limit,
		Offset:            offset,
		Identificacao:     c.Query("identificacao"),
		Categoria:         c.Query("categoria"),
		Sexo:              c.Query("sexo"),
		StatusSaude:       c.Query("status_saude"),
		StatusReprodutivo: c.Query("status_reprodutivo"),
		RebanhoFiltro:     c.Query("rebanho"),
	}
	if q.RebanhoFiltro == "" && c.Query("no_rebanho") == "false" {
		q.RebanhoFiltro = "todos"
	}
	if ls := c.Query("lote_id"); ls != "" {
		lid, err := strconv.ParseInt(ls, 10, 64)
		if err != nil || lid <= 0 {
			response.ErrorBadRequest(c, "lote_id inválido", nil)
			return
		}
		q.LoteID = lid
	}

	animais, total, err := h.service.ListAnimaisPaginatedForFazendas(c.Request.Context(), []int64{fazendaID}, q)
	if err != nil {
		response.ErrorValidation(c, err.Error(), nil)
		return
	}

	response.SuccessOK(c, gin.H{"animais": animais, "total": total}, "Animais da fazenda listados com sucesso")
}

func (h *AnimalHandler) GetEmLactacaoByFazendaID(c *gin.Context) {
	fazendaIDStr := c.Param("id")
	fazendaID, err := strconv.ParseInt(fazendaIDStr, 10, 64)
	if err != nil {
		response.ErrorBadRequest(c, "ID da fazenda inválido", nil)
		return
	}
	if !ValidateFazendaAccess(c, h.fazendaSvc, fazendaID) {
		return
	}
	animais, err := h.service.ListEmLactacaoByFazendaID(c.Request.Context(), fazendaID)
	if err != nil {
		if errors.Is(err, service.ErrFazendaNotFound) {
			response.ErrorNotFound(c, "Fazenda não encontrada")
			return
		}
		response.ErrorInternal(c, "Erro ao buscar animais em lactação", err.Error())
		return
	}
	response.SuccessOK(c, animais, "Animais em lactação listados com sucesso")
}

func (h *AnimalHandler) GetParaCoberturaByFazendaID(c *gin.Context) {
	h.listAnimaisElegiveisByFazendaID(c, h.service.ListParaCoberturaByFazendaID, "Erro ao buscar animais elegíveis para cobertura", "Animais elegíveis para cobertura listados com sucesso")
}

func (h *AnimalHandler) GetParaToqueByFazendaID(c *gin.Context) {
	h.listAnimaisElegiveisByFazendaID(c, h.service.ListParaToqueByFazendaID, "Erro ao buscar animais elegíveis para toque", "Animais elegíveis para toque listados com sucesso")
}

func (h *AnimalHandler) GetParaPartoByFazendaID(c *gin.Context) {
	h.listAnimaisElegiveisByFazendaID(c, h.service.ListParaPartoByFazendaID, "Erro ao buscar animais elegíveis para parto", "Animais elegíveis para parto listados com sucesso")
}

func (h *AnimalHandler) GetParaAberturaLactacaoByFazendaID(c *gin.Context) {
	h.listAnimaisElegiveisByFazendaID(c, h.service.ListParaAberturaLactacaoByFazendaID, "Erro ao buscar animais elegíveis para abertura de lactação", "Animais elegíveis para abertura de lactação listados com sucesso")
}

type listAnimaisByFazendaFunc func(ctx context.Context, fazendaID int64) ([]*models.Animal, error)

func (h *AnimalHandler) listAnimaisElegiveisByFazendaID(c *gin.Context, listFn listAnimaisByFazendaFunc, errMsg, successMsg string) {
	fazendaIDStr := c.Param("id")
	fazendaID, err := strconv.ParseInt(fazendaIDStr, 10, 64)
	if err != nil {
		response.ErrorBadRequest(c, "ID da fazenda inválido", nil)
		return
	}
	if !ValidateFazendaAccess(c, h.fazendaSvc, fazendaID) {
		return
	}
	animais, err := listFn(c.Request.Context(), fazendaID)
	if err != nil {
		if errors.Is(err, service.ErrFazendaNotFound) {
			response.ErrorNotFound(c, "Fazenda não encontrada")
			return
		}
		response.ErrorInternal(c, errMsg, err.Error())
		return
	}
	response.SuccessOK(c, animais, successMsg)
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
	origem := animalExistente.OrigemAquisicao
	if req.OrigemAquisicao != nil && *req.OrigemAquisicao != "" {
		if !models.IsValidOrigemAquisicao(*req.OrigemAquisicao) {
			response.ErrorValidation(c, "origem_aquisicao inválida", "deve ser NASCIDO ou COMPRADO")
			return
		}
		origem = req.OrigemAquisicao
	}

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
		OrigemAquisicao:   origem,
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
	if req.ObservacaoSaida == nil {
		animal.ObservacaoSaida = animalExistente.ObservacaoSaida
	}

	if dataNascimento, err := parseDate(req.DataNascimento); err != nil {
		response.ErrorValidation(c, "Data de nascimento inválida", err.Error())
		return
	} else if dataNascimento != nil {
		animal.DataNascimento = dataNascimento
	} else if req.DataNascimento != nil && *req.DataNascimento == "" {
		animal.DataNascimento = nil // Frontend enviou string vazia para limpar
	} else {
		animal.DataNascimento = animalExistente.DataNascimento // Preservar quando não enviado
	}

	if err := h.service.Update(c.Request.Context(), animal); err != nil {
		if RespondIfIntegridadeCiclo(c, err) {
			return
		}
		if RespondIfAnimalForaRebanho(c, err) {
			return
		}
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
		if RespondIfAnimalForaRebanho(c, err) {
			return
		}
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

	fazendas, err := h.fazendaSvc.GetByUsuarioID(c.Request.Context(), userID)
	if err != nil {
		response.ErrorInternal(c, "Erro ao validar acesso à fazenda", err.Error())
		return
	}
	fazendaIDs := make([]int64, 0, len(fazendas))
	for _, f := range fazendas {
		fazendaIDs = append(fazendaIDs, f.ID)
	}

	if s := c.Query("fazenda_id"); s != "" {
		fid, err := strconv.ParseInt(s, 10, 64)
		if err != nil || fid <= 0 {
			response.ErrorBadRequest(c, "fazenda_id inválido", nil)
			return
		}
		allowed := false
		for _, id := range fazendaIDs {
			if id == fid {
				allowed = true
				break
			}
		}
		if !allowed {
			response.ErrorForbidden(c, "Você não tem acesso a esta fazenda")
			return
		}
		fazendaIDs = []int64{fid}
	}

	noRebanho := parseNoRebanhoQuery(c.Query("no_rebanho"))
	limit := parseQueryIntPositiveDef(c.DefaultQuery("limit", "20"), 20)
	offset := parseQueryIntNonNeg(c.DefaultQuery("offset", "0"), 0)
	if limit > 100 {
		limit = 100
	}

	list, total, err := h.service.SearchByIdentificacaoPaginatedForFazendas(c.Request.Context(), identificacao, fazendaIDs, noRebanho, limit, offset)
	if err != nil {
		response.ErrorInternal(c, "Erro ao buscar", err.Error())
		return
	}

	response.SuccessOK(c, gin.H{
		"animais": list,
		"total":   total,
		"limit":   limit,
		"offset":  offset,
	}, "Busca realizada com sucesso")
}

func (h *AnimalHandler) GetContextoByID(c *gin.Context) {
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

	if !ValidateFazendaAccess(c, h.fazendaSvc, animal.FazendaID) {
		return
	}

	resumo, err := h.producaoSvc.GetResumoByAnimal(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, service.ErrAnimalNotFound) {
			response.ErrorNotFound(c, "Animal não encontrado")
			return
		}
		response.ErrorInternal(c, "Erro ao buscar contexto do animal", err.Error())
		return
	}

	payload := gin.H{
		"animal":          animal,
		"resumo_producao": resumo,
		"fora_do_rebanho": animal.IsForaDoRebanho(),
	}
	if sr := service.SaidaResumo(animal); sr != nil {
		if animal.BaixaRegistradoPor != nil && *animal.BaixaRegistradoPor > 0 && h.usuarioRepo != nil {
			if names, err := h.usuarioRepo.GetNamesByIDs(c.Request.Context(), []int64{*animal.BaixaRegistradoPor}); err != nil {
				response.ErrorInternal(c, "Erro ao buscar autor da baixa", err.Error())
				return
			} else if nome := names[*animal.BaixaRegistradoPor]; nome != "" {
				sr["registrado_por"] = nome
			}
		}
		payload["saida_resumo"] = sr
	}
	if h.restricaoLeiteSvc != nil {
		rl, err := h.restricaoLeiteSvc.GetAtivaByAnimalID(c.Request.Context(), id)
		if err != nil {
			response.ErrorInternal(c, "Erro ao buscar restrição de leite", err.Error())
			return
		}
		if rl != nil {
			payload["restricao_leite_ativa"] = rl
		}
	}

	if h.gestacaoSvc != nil {
		gestResumo, err := h.gestacaoSvc.BuildResumoContexto(c.Request.Context(), id)
		if err != nil {
			response.ErrorInternal(c, "Erro ao buscar gestação do animal", err.Error())
			return
		}
		payload["gestacao_resumo"] = gestResumo
	}

	if h.saudeSvc != nil {
		tratamentos, err := h.saudeSvc.BuildTratamentosAtivosContexto(c.Request.Context(), id)
		if err != nil {
			response.ErrorInternal(c, "Erro ao buscar tratamentos ativos do animal", err.Error())
			return
		}
		payload["tratamentos_ativos"] = tratamentos
	}

	if h.cicloSvc != nil {
		lact, err := h.cicloSvc.GetLactacaoAtiva(c.Request.Context(), id)
		if err != nil {
			response.ErrorInternal(c, "Erro ao buscar lactação do animal", err.Error())
			return
		}
		if lact != nil {
			payload["lactacao_ativa"] = lact
		}
		acoes, err := h.cicloSvc.BuildProximasAcoes(c.Request.Context(), animal)
		if err != nil {
			response.ErrorInternal(c, "Erro ao sugerir próximas ações", err.Error())
			return
		}
		payload["proximas_acoes"] = acoes
	}

	if h.usuarioRepo != nil && animal.CreatedBy != nil && *animal.CreatedBy > 0 {
		if u, err := h.usuarioRepo.GetByID(c.Request.Context(), *animal.CreatedBy); err == nil {
			payload["registrado_por_cadastro"] = u.Nome
		} else if err != pgx.ErrNoRows {
			response.ErrorInternal(c, "Erro ao buscar autor do cadastro", err.Error())
			return
		}
	}

	response.SuccessOK(c, payload, "Contexto do animal carregado com sucesso")
}

// GetTimelineByID GET /api/v1/animais/:id/timeline
func (h *AnimalHandler) GetTimelineByID(c *gin.Context) {
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

	if !ValidateFazendaAccess(c, h.fazendaSvc, animal.FazendaID) {
		return
	}

	if h.cicloSvc == nil {
		response.ErrorInternal(c, "Serviço de ciclo indisponível", nil)
		return
	}

	limit := parseQueryIntPositiveDef(c.DefaultQuery("limit", "20"), 20)
	offset := parseQueryIntNonNeg(c.DefaultQuery("offset", "0"), 0)
	if limit > 100 {
		limit = 100
	}

	tipoParam := c.DefaultQuery("tipo", string(repository.TimelineFilterTodos))
	filter, ok := repository.ParseTimelineFilterTipo(tipoParam)
	if !ok {
		response.ErrorBadRequest(c, "Parâmetro tipo inválido", gin.H{
			"tipo": "Use todos, ciclo, saude ou alertas",
		})
		return
	}

	timeline, total, err := h.cicloSvc.ListTimelinePaginated(c.Request.Context(), id, filter, limit, offset)
	if err != nil {
		response.ErrorInternal(c, "Erro ao buscar histórico do animal", err.Error())
		return
	}

	response.SuccessOK(c, gin.H{
		"timeline": timeline,
		"total":    total,
	}, "Timeline do animal carregada com sucesso")
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

func (h *AnimalHandler) RegistrarBaixa(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		response.ErrorBadRequest(c, "ID inválido", nil)
		return
	}
	var req RegistrarBaixaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorValidation(c, "Dados inválidos", err.Error())
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
	if !ValidateFazendaAccess(c, h.fazendaSvc, animal.FazendaID) {
		return
	}
	dataSaida, err := service.ValidateBaixaRequest(req.DataSaida, req.MotivoSaida)
	if err != nil {
		response.ErrorValidation(c, err.Error(), nil)
		return
	}
	actorID, ok := GetActorUserID(c)
	if !ok {
		response.ErrorUnauthorized(c, "Usuário não identificado")
		return
	}
	perfil, _ := c.Get("perfil")
	perfilStr, _ := perfil.(string)
	updated, err := h.baixaSvc.RegistrarBaixa(c.Request.Context(), id, dataSaida, req.MotivoSaida, req.ObservacaoSaida, perfilStr, actorID)
	if h.mapBaixaError(c, err) {
		return
	}
	response.SuccessOK(c, updated, "Baixa registrada com sucesso")
}

func (h *AnimalHandler) ReverterBaixa(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
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
	if !ValidateFazendaAccess(c, h.fazendaSvc, animal.FazendaID) {
		return
	}
	actorID, ok := GetActorUserID(c)
	if !ok {
		response.ErrorUnauthorized(c, "Usuário não identificado")
		return
	}
	updated, err := h.baixaSvc.ReverterBaixa(c.Request.Context(), id, actorID)
	if h.mapBaixaError(c, err) {
		return
	}
	response.SuccessOK(c, updated, "Baixa revertida com sucesso")
}

func parseQueryIntPositiveDef(s string, def int) int {
	s = strings.TrimSpace(s)
	if s == "" {
		return def
	}
	n, err := strconv.Atoi(s)
	if err != nil || n <= 0 {
		return def
	}
	return n
}

func parseQueryIntNonNeg(s string, def int) int {
	s = strings.TrimSpace(s)
	if s == "" {
		return def
	}
	n, err := strconv.Atoi(s)
	if err != nil || n < 0 {
		return def
	}
	return n
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
