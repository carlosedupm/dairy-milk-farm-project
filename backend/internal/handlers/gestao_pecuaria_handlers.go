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

// CoberturaHandler
type CoberturaHandler struct {
	svc        *service.CoberturaService
	fazendaSvc *service.FazendaService
}

func NewCoberturaHandler(svc *service.CoberturaService, fazendaSvc *service.FazendaService) *CoberturaHandler {
	return &CoberturaHandler{svc: svc, fazendaSvc: fazendaSvc}
}
func (h *CoberturaHandler) GetByFazendaID(c *gin.Context) {
	fazendaID, _ := strconv.ParseInt(c.Query("fazenda_id"), 10, 64)
	if fazendaID <= 0 {
		response.ErrorBadRequest(c, "fazenda_id obrigatorio", nil)
		return
	}
	if !ValidateFazendaAccess(c, h.fazendaSvc, fazendaID) {
		return
	}
	list, err := h.svc.GetByFazendaID(c.Request.Context(), fazendaID)
	if err != nil {
		response.ErrorInternal(c, "Erro ao listar coberturas", err.Error())
		return
	}
	response.SuccessOK(c, list, "OK")
}
func (h *CoberturaHandler) Create(c *gin.Context) {
	var req struct {
		AnimalID      int64   `json:"animal_id" binding:"required"`
		Tipo          string  `json:"tipo" binding:"required"`
		Data          string  `json:"data" binding:"required"`
		FazendaID     int64   `json:"fazenda_id" binding:"required"`
		CioID         *int64  `json:"cio_id"`
		TouroAnimalID *int64  `json:"touro_animal_id"`
		TouroInfo     *string `json:"touro_info"`
		SemenPartida  *string `json:"semen_partida"`
		Tecnico       *string `json:"tecnico"`
		ProtocoloID   *int64  `json:"protocolo_id"`
		Observacoes   *string `json:"observacoes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorValidation(c, "Dados invalidos", err.Error())
		return
	}
	if !ValidateFazendaAccess(c, h.fazendaSvc, req.FazendaID) {
		return
	}
	t, err := time.Parse(time.RFC3339, req.Data)
	if err != nil {
		response.ErrorValidation(c, "data invalida", err.Error())
		return
	}
	cobertura := &models.Cobertura{AnimalID: req.AnimalID, Tipo: req.Tipo, Data: t, FazendaID: req.FazendaID, CioID: req.CioID, TouroAnimalID: req.TouroAnimalID, TouroInfo: req.TouroInfo, SemenPartida: req.SemenPartida, Tecnico: req.Tecnico, ProtocoloID: req.ProtocoloID, Observacoes: req.Observacoes}
	if actorID, ok := GetActorUserID(c); ok {
		cobertura.CreatedBy = &actorID
	}
	if err := h.svc.Create(c.Request.Context(), cobertura); err != nil {
		response.ErrorInternal(c, "Erro ao registrar cobertura", err.Error())
		return
	}
	response.SuccessCreated(c, cobertura, "Cobertura registrada")
}
func (h *CoberturaHandler) GetByID(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	cobertura, err := h.svc.GetByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, service.ErrCoberturaNotFound) {
			response.ErrorNotFound(c, "Cobertura nao encontrada")
			return
		}
		response.ErrorInternal(c, "Erro ao buscar cobertura", err.Error())
		return
	}
	if !ValidateFazendaAccess(c, h.fazendaSvc, cobertura.FazendaID) {
		return
	}
	response.SuccessOK(c, cobertura, "OK")
}

func (h *CoberturaHandler) Update(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		response.ErrorBadRequest(c, "ID invalido", nil)
		return
	}
	var req struct {
		AnimalID      int64   `json:"animal_id" binding:"required"`
		Tipo          string  `json:"tipo" binding:"required"`
		Data          string  `json:"data" binding:"required"`
		FazendaID     int64   `json:"fazenda_id" binding:"required"`
		CioID         *int64  `json:"cio_id"`
		TouroAnimalID *int64  `json:"touro_animal_id"`
		TouroInfo     *string `json:"touro_info"`
		SemenPartida  *string `json:"semen_partida"`
		Tecnico       *string `json:"tecnico"`
		ProtocoloID   *int64  `json:"protocolo_id"`
		Observacoes   *string `json:"observacoes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorValidation(c, "Dados invalidos", err.Error())
		return
	}
	if !ValidateFazendaAccess(c, h.fazendaSvc, req.FazendaID) {
		return
	}
	existing, err := h.svc.GetByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, service.ErrCoberturaNotFound) {
			response.ErrorNotFound(c, "Cobertura nao encontrada")
			return
		}
		response.ErrorInternal(c, "Erro ao buscar cobertura", err.Error())
		return
	}
	if !ValidateFazendaAccess(c, h.fazendaSvc, existing.FazendaID) {
		return
	}
	t, err := time.Parse(time.RFC3339, req.Data)
	if err != nil {
		response.ErrorValidation(c, "data invalida", err.Error())
		return
	}
	cobertura := &models.Cobertura{
		ID: id, AnimalID: req.AnimalID, Tipo: req.Tipo, Data: t, FazendaID: req.FazendaID,
		CioID: req.CioID, TouroAnimalID: req.TouroAnimalID, TouroInfo: req.TouroInfo,
		SemenPartida: req.SemenPartida, Tecnico: req.Tecnico, ProtocoloID: req.ProtocoloID, Observacoes: req.Observacoes,
	}
	if err := h.svc.Update(c.Request.Context(), cobertura); err != nil {
		if errors.Is(err, service.ErrCoberturaNotFound) {
			response.ErrorNotFound(c, "Cobertura nao encontrada")
			return
		}
		if errors.Is(err, service.ErrAnimalNotFound) {
			response.ErrorNotFound(c, "Animal nao encontrado")
			return
		}
		response.ErrorInternal(c, "Erro ao atualizar cobertura", err.Error())
		return
	}
	updated, err := h.svc.GetByID(c.Request.Context(), id)
	if err != nil {
		response.ErrorInternal(c, "Erro ao buscar cobertura", err.Error())
		return
	}
	response.SuccessOK(c, updated, "Cobertura atualizada")
}

func (h *CoberturaHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		response.ErrorBadRequest(c, "ID invalido", nil)
		return
	}
	cobertura, err := h.svc.GetByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, service.ErrCoberturaNotFound) {
			response.ErrorNotFound(c, "Cobertura nao encontrada")
			return
		}
		response.ErrorInternal(c, "Erro ao buscar cobertura", err.Error())
		return
	}
	if !ValidateFazendaAccess(c, h.fazendaSvc, cobertura.FazendaID) {
		return
	}
	if err := h.svc.Delete(c.Request.Context(), id); err != nil {
		if errors.Is(err, service.ErrCoberturaNotFound) {
			response.ErrorNotFound(c, "Cobertura nao encontrada")
			return
		}
		if errors.Is(err, service.ErrCoberturaTemVinculos) {
			response.ErrorConflict(c, "Cobertura possui gestacao ou diagnostico vinculado", nil)
			return
		}
		response.ErrorInternal(c, "Erro ao excluir cobertura", err.Error())
		return
	}
	response.SuccessOK(c, nil, "Cobertura excluida")
}

// DiagnosticoGestacaoHandler (toques)
type DiagnosticoGestacaoHandler struct {
	svc        *service.DiagnosticoGestacaoService
	fazendaSvc *service.FazendaService
	animalSvc  *service.AnimalService
}

func NewDiagnosticoGestacaoHandler(svc *service.DiagnosticoGestacaoService, fazendaSvc *service.FazendaService, animalSvc *service.AnimalService) *DiagnosticoGestacaoHandler {
	return &DiagnosticoGestacaoHandler{svc: svc, fazendaSvc: fazendaSvc, animalSvc: animalSvc}
}
func (h *DiagnosticoGestacaoHandler) GetByFazendaID(c *gin.Context) {
	fazendaID, _ := strconv.ParseInt(c.Query("fazenda_id"), 10, 64)
	if fazendaID <= 0 {
		response.ErrorBadRequest(c, "fazenda_id obrigatorio", nil)
		return
	}
	if !ValidateFazendaAccess(c, h.fazendaSvc, fazendaID) {
		return
	}
	dataDe, err := parseFlexibleDateTime(c.Query("data_de"), false)
	if err != nil {
		response.ErrorValidation(c, "data_de invalida", err.Error())
		return
	}
	dataAte, err := parseFlexibleDateTime(c.Query("data_ate"), true)
	if err != nil {
		response.ErrorValidation(c, "data_ate invalida", err.Error())
		return
	}
	list, err := h.svc.GetByFazendaIDFiltered(c.Request.Context(), fazendaID, dataDe, dataAte)
	if err != nil {
		response.ErrorInternal(c, "Erro ao listar diagnosticos", err.Error())
		return
	}
	response.SuccessOK(c, list, "OK")
}
func (h *DiagnosticoGestacaoHandler) Create(c *gin.Context) {
	var req struct {
		AnimalID                int64   `json:"animal_id" binding:"required"`
		Data                    string  `json:"data" binding:"required"`
		Resultado               string  `json:"resultado"`
		ClassificacaoOperacional *string `json:"classificacao_operacional"`
		FazendaID               int64   `json:"fazenda_id" binding:"required"`
		CoberturaID             *int64  `json:"cobertura_id"`
		DiasGestacaoEstimados   *int    `json:"dias_gestacao_estimados"`
		Metodo                  *string `json:"metodo"`
		Veterinario             *string `json:"veterinario"`
		Observacoes             *string `json:"observacoes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorValidation(c, "Dados invalidos", err.Error())
		return
	}
	if !ValidateFazendaAccess(c, h.fazendaSvc, req.FazendaID) {
		return
	}
	t, err := time.Parse(time.RFC3339, req.Data)
	if err != nil {
		response.ErrorValidation(c, "data invalida", err.Error())
		return
	}
	d := &models.DiagnosticoGestacao{
		AnimalID: req.AnimalID, Data: t, Resultado: req.Resultado, FazendaID: req.FazendaID,
		ClassificacaoOperacional: req.ClassificacaoOperacional,
		CoberturaID: req.CoberturaID, DiasGestacaoEstimados: req.DiasGestacaoEstimados,
		Metodo: req.Metodo, Veterinario: req.Veterinario, Observacoes: req.Observacoes,
	}
	if actorID, ok := GetActorUserID(c); ok {
		d.CreatedBy = &actorID
	}
	if err := h.svc.Create(c.Request.Context(), d); err != nil {
		mapToqueError(c, err)
		return
	}
	response.SuccessCreated(c, d, "Diagnostico registrado")
}

func (h *DiagnosticoGestacaoHandler) CreateLote(c *gin.Context) {
	var req struct {
		FazendaID int64                  `json:"fazenda_id" binding:"required"`
		Itens     []models.ToqueLoteItem `json:"itens" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorValidation(c, "Dados invalidos", err.Error())
		return
	}
	if !ValidateFazendaAccess(c, h.fazendaSvc, req.FazendaID) {
		return
	}
	actorID, _ := GetActorUserID(c)
	loteSvc := service.NewIntegracaoToqueLoteService(h.animalSvc, h.svc, []int64{req.FazendaID}, actorID)
	result, err := loteSvc.Process(c.Request.Context(), req.FazendaID, req.Itens)
	if err != nil {
		response.ErrorForbidden(c, err.Error())
		return
	}
	response.SuccessOK(c, result, "Lote processado")
}

// GestacaoHandler
type GestacaoHandler struct {
	svc        *service.GestacaoService
	fazendaSvc *service.FazendaService
}

func NewGestacaoHandler(svc *service.GestacaoService, fazendaSvc *service.FazendaService) *GestacaoHandler {
	return &GestacaoHandler{svc: svc, fazendaSvc: fazendaSvc}
}
func (h *GestacaoHandler) GetByFazendaID(c *gin.Context) {
	fazendaID, _ := strconv.ParseInt(c.Query("fazenda_id"), 10, 64)
	if fazendaID <= 0 {
		response.ErrorBadRequest(c, "fazenda_id obrigatorio", nil)
		return
	}
	if !ValidateFazendaAccess(c, h.fazendaSvc, fazendaID) {
		return
	}
	list, err := h.svc.GetByFazendaID(c.Request.Context(), fazendaID)
	if err != nil {
		response.ErrorInternal(c, "Erro ao listar gestacoes", err.Error())
		return
	}
	response.SuccessOK(c, list, "OK")
}

// PartoHandler
type PartoHandler struct {
	svc        *service.PartoService
	fazendaSvc *service.FazendaService
}

func NewPartoHandler(svc *service.PartoService, fazendaSvc *service.FazendaService) *PartoHandler {
	return &PartoHandler{svc: svc, fazendaSvc: fazendaSvc}
}
func (h *PartoHandler) GetByFazendaID(c *gin.Context) {
	fazendaID, _ := strconv.ParseInt(c.Query("fazenda_id"), 10, 64)
	if fazendaID <= 0 {
		response.ErrorBadRequest(c, "fazenda_id obrigatorio", nil)
		return
	}
	if !ValidateFazendaAccess(c, h.fazendaSvc, fazendaID) {
		return
	}
	list, err := h.svc.GetByFazendaID(c.Request.Context(), fazendaID)
	if err != nil {
		response.ErrorInternal(c, "Erro ao listar partos", err.Error())
		return
	}
	response.SuccessOK(c, list, "OK")
}
func (h *PartoHandler) GetByID(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	parto, err := h.svc.GetByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, service.ErrPartoNotFound) {
			response.ErrorNotFound(c, "Parto nao encontrado")
			return
		}
		response.ErrorInternal(c, "Erro ao buscar parto", err.Error())
		return
	}
	if !ValidateFazendaAccess(c, h.fazendaSvc, parto.FazendaID) {
		return
	}
	response.SuccessOK(c, parto, "OK")
}
func (h *PartoHandler) Create(c *gin.Context) {
	var req struct {
		AnimalID     int64   `json:"animal_id" binding:"required"`
		Data         string  `json:"data" binding:"required"`
		FazendaID    int64   `json:"fazenda_id" binding:"required"`
		GestacaoID   *int64  `json:"gestacao_id"`
		Tipo         *string `json:"tipo"`
		NumeroCrias  *int    `json:"numero_crias"`
		Complicacoes *string `json:"complicacoes"`
		Observacoes  *string `json:"observacoes"`
		Crias        []struct {
			Sexo                string   `json:"sexo" binding:"required"`
			Condicao            string   `json:"condicao" binding:"required"`
			Peso                *float64 `json:"peso"`
			Observacoes         *string  `json:"observacoes"`
			AnimalIdentificacao *string  `json:"animal_identificacao"`
			AnimalRaca          *string  `json:"animal_raca"`
		} `json:"crias"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorValidation(c, "Dados invalidos", err.Error())
		return
	}
	if !ValidateFazendaAccess(c, h.fazendaSvc, req.FazendaID) {
		return
	}
	t, err := time.Parse(time.RFC3339, req.Data)
	if err != nil {
		response.ErrorValidation(c, "data invalida", err.Error())
		return
	}
	p := &models.Parto{AnimalID: req.AnimalID, Data: t, FazendaID: req.FazendaID, GestacaoID: req.GestacaoID, Tipo: req.Tipo, Complicacoes: req.Complicacoes, Observacoes: req.Observacoes, NumeroCrias: 1}
	if actorID, ok := GetActorUserID(c); ok {
		p.CreatedBy = &actorID
	}
	if req.NumeroCrias != nil && *req.NumeroCrias > 0 {
		p.NumeroCrias = *req.NumeroCrias
	}
	if len(req.Crias) > 0 {
		if len(req.Crias) != p.NumeroCrias {
			response.ErrorBadRequest(c, "crias deve ter exatamente numero_crias elementos", nil)
			return
		}
		crias := make([]*models.Cria, len(req.Crias))
		for i := range req.Crias {
			row := req.Crias[i]
			crias[i] = &models.Cria{
				Sexo: row.Sexo, Condicao: row.Condicao, Peso: row.Peso, Observacoes: row.Observacoes,
				AnimalIdentificacao: row.AnimalIdentificacao, AnimalRaca: row.AnimalRaca,
			}
		}
		if err := h.svc.CreateWithCrias(c.Request.Context(), p, crias); err != nil {
			if errors.Is(err, service.ErrPartoCriasCountMismatch) {
				response.ErrorBadRequest(c, err.Error(), nil)
				return
			}
			if errors.Is(err, service.ErrAnimalIdentificacaoDuplicada) {
				response.ErrorConflict(c, "Ja existe um animal com essa identificacao", nil)
				return
			}
			response.ErrorInternal(c, "Erro ao registrar parto", err.Error())
			return
		}
	} else {
		if err := h.svc.Create(c.Request.Context(), p); err != nil {
			response.ErrorInternal(c, "Erro ao registrar parto", err.Error())
			return
		}
	}
	response.SuccessCreated(c, p, "Parto registrado")
}
func (h *PartoHandler) Update(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	var req struct {
		AnimalID     int64   `json:"animal_id" binding:"required"`
		Data         string  `json:"data" binding:"required"`
		FazendaID    int64   `json:"fazenda_id" binding:"required"`
		GestacaoID   *int64  `json:"gestacao_id"`
		Tipo         *string `json:"tipo"`
		NumeroCrias  *int    `json:"numero_crias"`
		Complicacoes *string `json:"complicacoes"`
		Observacoes  *string `json:"observacoes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorValidation(c, "Dados invalidos", err.Error())
		return
	}
	if !ValidateFazendaAccess(c, h.fazendaSvc, req.FazendaID) {
		return
	}
	parto, err := h.svc.GetByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, service.ErrPartoNotFound) {
			response.ErrorNotFound(c, "Parto nao encontrado")
			return
		}
		response.ErrorInternal(c, "Erro ao buscar parto", err.Error())
		return
	}
	if !ValidateFazendaAccess(c, h.fazendaSvc, parto.FazendaID) {
		return
	}
	t, err := time.Parse(time.RFC3339, req.Data)
	if err != nil {
		response.ErrorValidation(c, "data invalida", err.Error())
		return
	}
	parto.AnimalID = req.AnimalID
	parto.Data = t
	parto.FazendaID = req.FazendaID
	parto.GestacaoID = req.GestacaoID
	parto.Tipo = req.Tipo
	parto.Complicacoes = req.Complicacoes
	parto.Observacoes = req.Observacoes
	parto.NumeroCrias = 1
	if req.NumeroCrias != nil && *req.NumeroCrias > 0 {
		parto.NumeroCrias = *req.NumeroCrias
	}
	if err := h.svc.Update(c.Request.Context(), parto); err != nil {
		if errors.Is(err, service.ErrPartoNotFound) {
			response.ErrorNotFound(c, "Parto nao encontrado")
			return
		}
		response.ErrorInternal(c, "Erro ao atualizar parto", err.Error())
		return
	}
	response.SuccessOK(c, parto, "Parto atualizado")
}

func (h *PartoHandler) Delete(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	parto, err := h.svc.GetByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, service.ErrPartoNotFound) {
			response.ErrorNotFound(c, "Parto nao encontrado")
			return
		}
		response.ErrorInternal(c, "Erro ao buscar parto", err.Error())
		return
	}
	if !ValidateFazendaAccess(c, h.fazendaSvc, parto.FazendaID) {
		return
	}
	if err := h.svc.Delete(c.Request.Context(), id); err != nil {
		if errors.Is(err, service.ErrPartoNotFound) {
			response.ErrorNotFound(c, "Parto nao encontrado")
			return
		}
		response.ErrorInternal(c, "Erro ao excluir parto", err.Error())
		return
	}
	response.SuccessOK(c, nil, "Parto excluido")
}

// CriaHandler
type CriaHandler struct{ svc *service.CriaService }

func NewCriaHandler(svc *service.CriaService) *CriaHandler { return &CriaHandler{svc: svc} }
func (h *CriaHandler) GetByPartoID(c *gin.Context) {
	partoID, _ := strconv.ParseInt(c.Query("parto_id"), 10, 64)
	if partoID <= 0 {
		response.ErrorBadRequest(c, "parto_id obrigatorio", nil)
		return
	}
	list, err := h.svc.GetByPartoID(c.Request.Context(), partoID)
	if err != nil {
		response.ErrorInternal(c, "Erro ao listar crias", err.Error())
		return
	}
	response.SuccessOK(c, list, "OK")
}
func (h *CriaHandler) Create(c *gin.Context) {
	var req struct {
		PartoID             int64    `json:"parto_id" binding:"required"`
		Sexo                string   `json:"sexo" binding:"required"`
		Condicao            string   `json:"condicao" binding:"required"`
		Peso                *float64 `json:"peso"`
		Observacoes         *string  `json:"observacoes"`
		AnimalIdentificacao *string  `json:"animal_identificacao"`
		AnimalRaca          *string  `json:"animal_raca"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorValidation(c, "Dados invalidos", err.Error())
		return
	}
	cria := &models.Cria{
		PartoID:             req.PartoID,
		Sexo:                req.Sexo,
		Condicao:            req.Condicao,
		Peso:                req.Peso,
		Observacoes:         req.Observacoes,
		AnimalIdentificacao: req.AnimalIdentificacao,
		AnimalRaca:          req.AnimalRaca,
	}
	if err := h.svc.Create(c.Request.Context(), cria); err != nil {
		if errors.Is(err, service.ErrAnimalIdentificacaoDuplicada) {
			response.ErrorConflict(c, "Ja existe um animal com essa identificacao", nil)
			return
		}
		response.ErrorInternal(c, "Erro ao registrar cria", err.Error())
		return
	}
	response.SuccessCreated(c, cria, "Cria registrada")
}

// SecagemHandler
type SecagemHandler struct {
	svc        *service.SecagemService
	fazendaSvc *service.FazendaService
}

func NewSecagemHandler(svc *service.SecagemService, fazendaSvc *service.FazendaService) *SecagemHandler {
	return &SecagemHandler{svc: svc, fazendaSvc: fazendaSvc}
}
func (h *SecagemHandler) GetByFazendaID(c *gin.Context) {
	fazendaID, _ := strconv.ParseInt(c.Query("fazenda_id"), 10, 64)
	if fazendaID <= 0 {
		response.ErrorBadRequest(c, "fazenda_id obrigatorio", nil)
		return
	}
	if !ValidateFazendaAccess(c, h.fazendaSvc, fazendaID) {
		return
	}
	list, err := h.svc.GetByFazendaID(c.Request.Context(), fazendaID)
	if err != nil {
		response.ErrorInternal(c, "Erro ao listar secagens", err.Error())
		return
	}
	response.SuccessOK(c, list, "OK")
}
func (h *SecagemHandler) Create(c *gin.Context) {
	var req struct {
		AnimalID          int64   `json:"animal_id" binding:"required"`
		DataSecagem       string  `json:"data_secagem" binding:"required"`
		FazendaID         int64   `json:"fazenda_id" binding:"required"`
		GestacaoID        *int64  `json:"gestacao_id"`
		DataPrevistaParto *string `json:"data_prevista_parto"`
		Protocolo         *string `json:"protocolo"`
		Motivo            *string `json:"motivo"`
		Observacoes       *string `json:"observacoes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorValidation(c, "Dados invalidos", err.Error())
		return
	}
	if !ValidateFazendaAccess(c, h.fazendaSvc, req.FazendaID) {
		return
	}
	t, err := time.Parse("2006-01-02", req.DataSecagem)
	if err != nil {
		response.ErrorValidation(c, "data_secagem invalida", err.Error())
		return
	}
	sec := &models.Secagem{AnimalID: req.AnimalID, DataSecagem: t, FazendaID: req.FazendaID, GestacaoID: req.GestacaoID, Protocolo: req.Protocolo, Motivo: req.Motivo, Observacoes: req.Observacoes}
	if actorID, ok := GetActorUserID(c); ok {
		sec.CreatedBy = &actorID
	}
	if req.DataPrevistaParto != nil {
		t2, _ := time.Parse("2006-01-02", *req.DataPrevistaParto)
		sec.DataPrevistaParto = &t2
	}
	if err := h.svc.Create(c.Request.Context(), sec); err != nil {
		response.ErrorInternal(c, "Erro ao registrar secagem", err.Error())
		return
	}
	response.SuccessCreated(c, sec, "Secagem registrada")
}

// LactacaoHandler
type LactacaoHandler struct {
	svc        *service.LactacaoService
	fazendaSvc *service.FazendaService
}

func NewLactacaoHandler(svc *service.LactacaoService, fazendaSvc *service.FazendaService) *LactacaoHandler {
	return &LactacaoHandler{svc: svc, fazendaSvc: fazendaSvc}
}
func (h *LactacaoHandler) GetByFazendaID(c *gin.Context) {
	fazendaID, _ := strconv.ParseInt(c.Query("fazenda_id"), 10, 64)
	if fazendaID <= 0 {
		response.ErrorBadRequest(c, "fazenda_id obrigatorio", nil)
		return
	}
	if !ValidateFazendaAccess(c, h.fazendaSvc, fazendaID) {
		return
	}
	list, err := h.svc.GetByFazendaID(c.Request.Context(), fazendaID)
	if err != nil {
		response.ErrorInternal(c, "Erro ao listar lactacoes", err.Error())
		return
	}
	response.SuccessOK(c, list, "OK")
}
func (h *LactacaoHandler) Create(c *gin.Context) {
	var req struct {
		AnimalID       int64   `json:"animal_id" binding:"required"`
		NumeroLactacao int     `json:"numero_lactacao" binding:"required"`
		DataInicio     string  `json:"data_inicio" binding:"required"`
		FazendaID      int64   `json:"fazenda_id" binding:"required"`
		PartoID        *int64  `json:"parto_id"`
		Status         *string `json:"status"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorValidation(c, "Dados invalidos", err.Error())
		return
	}
	if !ValidateFazendaAccess(c, h.fazendaSvc, req.FazendaID) {
		return
	}
	t, err := time.Parse("2006-01-02", req.DataInicio)
	if err != nil {
		response.ErrorValidation(c, "data_inicio invalida", err.Error())
		return
	}
	l := &models.Lactacao{AnimalID: req.AnimalID, NumeroLactacao: req.NumeroLactacao, DataInicio: t, FazendaID: req.FazendaID, PartoID: req.PartoID, Status: req.Status}
	if err := h.svc.Create(c.Request.Context(), l); err != nil {
		response.ErrorInternal(c, "Erro ao registrar lactacao", err.Error())
		return
	}
	response.SuccessCreated(c, l, "Lactacao registrada")
}

// ProtocoloIATFHandler
type ProtocoloIATFHandler struct {
	svc        *service.ProtocoloIATFService
	fazendaSvc *service.FazendaService
}

func NewProtocoloIATFHandler(svc *service.ProtocoloIATFService, fazendaSvc *service.FazendaService) *ProtocoloIATFHandler {
	return &ProtocoloIATFHandler{svc: svc, fazendaSvc: fazendaSvc}
}
func (h *ProtocoloIATFHandler) GetByFazendaID(c *gin.Context) {
	fazendaID, _ := strconv.ParseInt(c.Query("fazenda_id"), 10, 64)
	if fazendaID <= 0 {
		response.ErrorBadRequest(c, "fazenda_id obrigatorio", nil)
		return
	}
	if !ValidateFazendaAccess(c, h.fazendaSvc, fazendaID) {
		return
	}
	list, err := h.svc.GetByFazendaID(c.Request.Context(), fazendaID)
	if err != nil {
		response.ErrorInternal(c, "Erro ao listar protocolos", err.Error())
		return
	}
	response.SuccessOK(c, list, "OK")
}
func (h *ProtocoloIATFHandler) Create(c *gin.Context) {
	var req struct {
		Nome          string  `json:"nome" binding:"required"`
		FazendaID     int64   `json:"fazenda_id" binding:"required"`
		Descricao     *string `json:"descricao"`
		DiasProtocolo *int    `json:"dias_protocolo"`
		Ativo         *bool   `json:"ativo"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorValidation(c, "Dados invalidos", err.Error())
		return
	}
	if !ValidateFazendaAccess(c, h.fazendaSvc, req.FazendaID) {
		return
	}
	p := &models.ProtocoloIATF{Nome: req.Nome, FazendaID: req.FazendaID, Descricao: req.Descricao, DiasProtocolo: req.DiasProtocolo, Ativo: true}
	if req.Ativo != nil {
		p.Ativo = *req.Ativo
	}
	if err := h.svc.Create(c.Request.Context(), p); err != nil {
		response.ErrorInternal(c, "Erro ao criar protocolo", err.Error())
		return
	}
	response.SuccessCreated(c, p, "Protocolo criado")
}
