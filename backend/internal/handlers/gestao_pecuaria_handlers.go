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
type CoberturaHandler struct{ svc *service.CoberturaService; fazendaSvc *service.FazendaService }
func NewCoberturaHandler(svc *service.CoberturaService, fazendaSvc *service.FazendaService) *CoberturaHandler {
	return &CoberturaHandler{svc: svc, fazendaSvc: fazendaSvc}
}
func (h *CoberturaHandler) GetByFazendaID(c *gin.Context) {
	fazendaID, _ := strconv.ParseInt(c.Query("fazenda_id"), 10, 64)
	if fazendaID <= 0 { response.ErrorBadRequest(c, "fazenda_id obrigatorio", nil); return }
	if !ValidateFazendaAccess(c, h.fazendaSvc, fazendaID) { return }
	list, err := h.svc.GetByFazendaID(c.Request.Context(), fazendaID)
	if err != nil { response.ErrorInternal(c, "Erro ao listar coberturas", err.Error()); return }
	response.SuccessOK(c, list, "OK")
}
func (h *CoberturaHandler) Create(c *gin.Context) {
	var req struct {
		AnimalID int64 `json:"animal_id" binding:"required"`
		Tipo string `json:"tipo" binding:"required"`
		Data string `json:"data" binding:"required"`
		FazendaID int64 `json:"fazenda_id" binding:"required"`
		CioID *int64 `json:"cio_id"`
		TouroInfo *string `json:"touro_info"`
		SemenPartida *string `json:"semen_partida"`
		Tecnico *string `json:"tecnico"`
		ProtocoloID *int64 `json:"protocolo_id"`
		Observacoes *string `json:"observacoes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil { response.ErrorValidation(c, "Dados invalidos", err.Error()); return }
	if !ValidateFazendaAccess(c, h.fazendaSvc, req.FazendaID) { return }
	t, err := time.Parse(time.RFC3339, req.Data)
	if err != nil { response.ErrorValidation(c, "data invalida", err.Error()); return }
	cobertura := &models.Cobertura{AnimalID: req.AnimalID, Tipo: req.Tipo, Data: t, FazendaID: req.FazendaID, CioID: req.CioID, TouroInfo: req.TouroInfo, SemenPartida: req.SemenPartida, Tecnico: req.Tecnico, ProtocoloID: req.ProtocoloID, Observacoes: req.Observacoes}
	if err := h.svc.Create(c.Request.Context(), cobertura); err != nil { response.ErrorInternal(c, "Erro ao registrar cobertura", err.Error()); return }
	response.SuccessCreated(c, cobertura, "Cobertura registrada")
}
func (h *CoberturaHandler) GetByID(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	cobertura, err := h.svc.GetByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, service.ErrCoberturaNotFound) { response.ErrorNotFound(c, "Cobertura nao encontrada"); return }
		response.ErrorInternal(c, "Erro ao buscar cobertura", err.Error()); return
	}
	if !ValidateFazendaAccess(c, h.fazendaSvc, cobertura.FazendaID) { return }
	response.SuccessOK(c, cobertura, "OK")
}

// DiagnosticoGestacaoHandler (toques)
type DiagnosticoGestacaoHandler struct{ svc *service.DiagnosticoGestacaoService; fazendaSvc *service.FazendaService }
func NewDiagnosticoGestacaoHandler(svc *service.DiagnosticoGestacaoService, fazendaSvc *service.FazendaService) *DiagnosticoGestacaoHandler {
	return &DiagnosticoGestacaoHandler{svc: svc, fazendaSvc: fazendaSvc}
}
func (h *DiagnosticoGestacaoHandler) GetByFazendaID(c *gin.Context) {
	fazendaID, _ := strconv.ParseInt(c.Query("fazenda_id"), 10, 64)
	if fazendaID <= 0 { response.ErrorBadRequest(c, "fazenda_id obrigatorio", nil); return }
	if !ValidateFazendaAccess(c, h.fazendaSvc, fazendaID) { return }
	list, err := h.svc.GetByFazendaID(c.Request.Context(), fazendaID)
	if err != nil { response.ErrorInternal(c, "Erro ao listar diagnosticos", err.Error()); return }
	response.SuccessOK(c, list, "OK")
}
func (h *DiagnosticoGestacaoHandler) Create(c *gin.Context) {
	var req struct {
		AnimalID int64 `json:"animal_id" binding:"required"`
		Data string `json:"data" binding:"required"`
		Resultado string `json:"resultado" binding:"required"`
		FazendaID int64 `json:"fazenda_id" binding:"required"`
		CoberturaID *int64 `json:"cobertura_id"`
		DiasGestacaoEstimados *int `json:"dias_gestacao_estimados"`
		Metodo *string `json:"metodo"`
		Veterinario *string `json:"veterinario"`
		Observacoes *string `json:"observacoes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil { response.ErrorValidation(c, "Dados invalidos", err.Error()); return }
	if !ValidateFazendaAccess(c, h.fazendaSvc, req.FazendaID) { return }
	t, err := time.Parse(time.RFC3339, req.Data)
	if err != nil { response.ErrorValidation(c, "data invalida", err.Error()); return }
	d := &models.DiagnosticoGestacao{AnimalID: req.AnimalID, Data: t, Resultado: req.Resultado, FazendaID: req.FazendaID, CoberturaID: req.CoberturaID, DiasGestacaoEstimados: req.DiasGestacaoEstimados, Metodo: req.Metodo, Veterinario: req.Veterinario, Observacoes: req.Observacoes}
	if err := h.svc.Create(c.Request.Context(), d); err != nil { response.ErrorInternal(c, "Erro ao registrar diagnostico", err.Error()); return }
	response.SuccessCreated(c, d, "Diagnostico registrado")
}

// GestacaoHandler
type GestacaoHandler struct{ svc *service.GestacaoService; fazendaSvc *service.FazendaService }
func NewGestacaoHandler(svc *service.GestacaoService, fazendaSvc *service.FazendaService) *GestacaoHandler {
	return &GestacaoHandler{svc: svc, fazendaSvc: fazendaSvc}
}
func (h *GestacaoHandler) GetByFazendaID(c *gin.Context) {
	fazendaID, _ := strconv.ParseInt(c.Query("fazenda_id"), 10, 64)
	if fazendaID <= 0 { response.ErrorBadRequest(c, "fazenda_id obrigatorio", nil); return }
	if !ValidateFazendaAccess(c, h.fazendaSvc, fazendaID) { return }
	list, err := h.svc.GetByFazendaID(c.Request.Context(), fazendaID)
	if err != nil { response.ErrorInternal(c, "Erro ao listar gestacoes", err.Error()); return }
	response.SuccessOK(c, list, "OK")
}

// PartoHandler
type PartoHandler struct{ svc *service.PartoService; fazendaSvc *service.FazendaService }
func NewPartoHandler(svc *service.PartoService, fazendaSvc *service.FazendaService) *PartoHandler {
	return &PartoHandler{svc: svc, fazendaSvc: fazendaSvc}
}
func (h *PartoHandler) GetByFazendaID(c *gin.Context) {
	fazendaID, _ := strconv.ParseInt(c.Query("fazenda_id"), 10, 64)
	if fazendaID <= 0 { response.ErrorBadRequest(c, "fazenda_id obrigatorio", nil); return }
	if !ValidateFazendaAccess(c, h.fazendaSvc, fazendaID) { return }
	list, err := h.svc.GetByFazendaID(c.Request.Context(), fazendaID)
	if err != nil { response.ErrorInternal(c, "Erro ao listar partos", err.Error()); return }
	response.SuccessOK(c, list, "OK")
}
func (h *PartoHandler) Create(c *gin.Context) {
	var req struct {
		AnimalID int64 `json:"animal_id" binding:"required"`
		Data string `json:"data" binding:"required"`
		FazendaID int64 `json:"fazenda_id" binding:"required"`
		GestacaoID *int64 `json:"gestacao_id"`
		Tipo *string `json:"tipo"`
		NumeroCrias *int `json:"numero_crias"`
		Complicacoes *string `json:"complicacoes"`
		Observacoes *string `json:"observacoes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil { response.ErrorValidation(c, "Dados invalidos", err.Error()); return }
	if !ValidateFazendaAccess(c, h.fazendaSvc, req.FazendaID) { return }
	t, err := time.Parse(time.RFC3339, req.Data)
	if err != nil { response.ErrorValidation(c, "data invalida", err.Error()); return }
	p := &models.Parto{AnimalID: req.AnimalID, Data: t, FazendaID: req.FazendaID, GestacaoID: req.GestacaoID, Tipo: req.Tipo, Complicacoes: req.Complicacoes, Observacoes: req.Observacoes, NumeroCrias: 1}
	if req.NumeroCrias != nil && *req.NumeroCrias > 0 { p.NumeroCrias = *req.NumeroCrias }
	if err := h.svc.Create(c.Request.Context(), p); err != nil { response.ErrorInternal(c, "Erro ao registrar parto", err.Error()); return }
	response.SuccessCreated(c, p, "Parto registrado")
}

// CriaHandler
type CriaHandler struct{ svc *service.CriaService }
func NewCriaHandler(svc *service.CriaService) *CriaHandler { return &CriaHandler{svc: svc} }
func (h *CriaHandler) GetByPartoID(c *gin.Context) {
	partoID, _ := strconv.ParseInt(c.Query("parto_id"), 10, 64)
	if partoID <= 0 { response.ErrorBadRequest(c, "parto_id obrigatorio", nil); return }
	list, err := h.svc.GetByPartoID(c.Request.Context(), partoID)
	if err != nil { response.ErrorInternal(c, "Erro ao listar crias", err.Error()); return }
	response.SuccessOK(c, list, "OK")
}
func (h *CriaHandler) Create(c *gin.Context) {
	var req struct {
		PartoID int64 `json:"parto_id" binding:"required"`
		Sexo string `json:"sexo" binding:"required"`
		Condicao string `json:"condicao" binding:"required"`
		Peso *float64 `json:"peso"`
		Observacoes *string `json:"observacoes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil { response.ErrorValidation(c, "Dados invalidos", err.Error()); return }
	cria := &models.Cria{PartoID: req.PartoID, Sexo: req.Sexo, Condicao: req.Condicao, Peso: req.Peso, Observacoes: req.Observacoes}
	if err := h.svc.Create(c.Request.Context(), cria); err != nil { response.ErrorInternal(c, "Erro ao registrar cria", err.Error()); return }
	response.SuccessCreated(c, cria, "Cria registrada")
}

// SecagemHandler
type SecagemHandler struct{ svc *service.SecagemService; fazendaSvc *service.FazendaService }
func NewSecagemHandler(svc *service.SecagemService, fazendaSvc *service.FazendaService) *SecagemHandler {
	return &SecagemHandler{svc: svc, fazendaSvc: fazendaSvc}
}
func (h *SecagemHandler) GetByFazendaID(c *gin.Context) {
	fazendaID, _ := strconv.ParseInt(c.Query("fazenda_id"), 10, 64)
	if fazendaID <= 0 { response.ErrorBadRequest(c, "fazenda_id obrigatorio", nil); return }
	if !ValidateFazendaAccess(c, h.fazendaSvc, fazendaID) { return }
	list, err := h.svc.GetByFazendaID(c.Request.Context(), fazendaID)
	if err != nil { response.ErrorInternal(c, "Erro ao listar secagens", err.Error()); return }
	response.SuccessOK(c, list, "OK")
}
func (h *SecagemHandler) Create(c *gin.Context) {
	var req struct {
		AnimalID int64 `json:"animal_id" binding:"required"`
		DataSecagem string `json:"data_secagem" binding:"required"`
		FazendaID int64 `json:"fazenda_id" binding:"required"`
		GestacaoID *int64 `json:"gestacao_id"`
		DataPrevistaParto *string `json:"data_prevista_parto"`
		Protocolo *string `json:"protocolo"`
		Motivo *string `json:"motivo"`
		Observacoes *string `json:"observacoes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil { response.ErrorValidation(c, "Dados invalidos", err.Error()); return }
	if !ValidateFazendaAccess(c, h.fazendaSvc, req.FazendaID) { return }
	t, err := time.Parse("2006-01-02", req.DataSecagem)
	if err != nil { response.ErrorValidation(c, "data_secagem invalida", err.Error()); return }
	sec := &models.Secagem{AnimalID: req.AnimalID, DataSecagem: t, FazendaID: req.FazendaID, GestacaoID: req.GestacaoID, Protocolo: req.Protocolo, Motivo: req.Motivo, Observacoes: req.Observacoes}
	if req.DataPrevistaParto != nil {
		t2, _ := time.Parse("2006-01-02", *req.DataPrevistaParto)
		sec.DataPrevistaParto = &t2
	}
	if err := h.svc.Create(c.Request.Context(), sec); err != nil { response.ErrorInternal(c, "Erro ao registrar secagem", err.Error()); return }
	response.SuccessCreated(c, sec, "Secagem registrada")
}

// LactacaoHandler
type LactacaoHandler struct{ svc *service.LactacaoService; fazendaSvc *service.FazendaService }
func NewLactacaoHandler(svc *service.LactacaoService, fazendaSvc *service.FazendaService) *LactacaoHandler {
	return &LactacaoHandler{svc: svc, fazendaSvc: fazendaSvc}
}
func (h *LactacaoHandler) GetByFazendaID(c *gin.Context) {
	fazendaID, _ := strconv.ParseInt(c.Query("fazenda_id"), 10, 64)
	if fazendaID <= 0 { response.ErrorBadRequest(c, "fazenda_id obrigatorio", nil); return }
	if !ValidateFazendaAccess(c, h.fazendaSvc, fazendaID) { return }
	list, err := h.svc.GetByFazendaID(c.Request.Context(), fazendaID)
	if err != nil { response.ErrorInternal(c, "Erro ao listar lactacoes", err.Error()); return }
	response.SuccessOK(c, list, "OK")
}
func (h *LactacaoHandler) Create(c *gin.Context) {
	var req struct {
		AnimalID int64 `json:"animal_id" binding:"required"`
		NumeroLactacao int `json:"numero_lactacao" binding:"required"`
		DataInicio string `json:"data_inicio" binding:"required"`
		FazendaID int64 `json:"fazenda_id" binding:"required"`
		PartoID *int64 `json:"parto_id"`
		Status *string `json:"status"`
	}
	if err := c.ShouldBindJSON(&req); err != nil { response.ErrorValidation(c, "Dados invalidos", err.Error()); return }
	if !ValidateFazendaAccess(c, h.fazendaSvc, req.FazendaID) { return }
	t, err := time.Parse("2006-01-02", req.DataInicio)
	if err != nil { response.ErrorValidation(c, "data_inicio invalida", err.Error()); return }
	l := &models.Lactacao{AnimalID: req.AnimalID, NumeroLactacao: req.NumeroLactacao, DataInicio: t, FazendaID: req.FazendaID, PartoID: req.PartoID, Status: req.Status}
	if err := h.svc.Create(c.Request.Context(), l); err != nil { response.ErrorInternal(c, "Erro ao registrar lactacao", err.Error()); return }
	response.SuccessCreated(c, l, "Lactacao registrada")
}

// ProtocoloIATFHandler
type ProtocoloIATFHandler struct{ svc *service.ProtocoloIATFService; fazendaSvc *service.FazendaService }
func NewProtocoloIATFHandler(svc *service.ProtocoloIATFService, fazendaSvc *service.FazendaService) *ProtocoloIATFHandler {
	return &ProtocoloIATFHandler{svc: svc, fazendaSvc: fazendaSvc}
}
func (h *ProtocoloIATFHandler) GetByFazendaID(c *gin.Context) {
	fazendaID, _ := strconv.ParseInt(c.Query("fazenda_id"), 10, 64)
	if fazendaID <= 0 { response.ErrorBadRequest(c, "fazenda_id obrigatorio", nil); return }
	if !ValidateFazendaAccess(c, h.fazendaSvc, fazendaID) { return }
	list, err := h.svc.GetByFazendaID(c.Request.Context(), fazendaID)
	if err != nil { response.ErrorInternal(c, "Erro ao listar protocolos", err.Error()); return }
	response.SuccessOK(c, list, "OK")
}
func (h *ProtocoloIATFHandler) Create(c *gin.Context) {
	var req struct {
		Nome string `json:"nome" binding:"required"`
		FazendaID int64 `json:"fazenda_id" binding:"required"`
		Descricao *string `json:"descricao"`
		DiasProtocolo *int `json:"dias_protocolo"`
		Ativo *bool `json:"ativo"`
	}
	if err := c.ShouldBindJSON(&req); err != nil { response.ErrorValidation(c, "Dados invalidos", err.Error()); return }
	if !ValidateFazendaAccess(c, h.fazendaSvc, req.FazendaID) { return }
	p := &models.ProtocoloIATF{Nome: req.Nome, FazendaID: req.FazendaID, Descricao: req.Descricao, DiasProtocolo: req.DiasProtocolo, Ativo: true}
	if req.Ativo != nil { p.Ativo = *req.Ativo }
	if err := h.svc.Create(c.Request.Context(), p); err != nil { response.ErrorInternal(c, "Erro ao criar protocolo", err.Error()); return }
	response.SuccessCreated(c, p, "Protocolo criado")
}
