package handlers

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"time"

	"github.com/ceialmilk/api/internal/auth"
	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/response"
	"github.com/ceialmilk/api/internal/service"
	"github.com/gin-gonic/gin"
)

type IntegracaoHandler struct {
	integracaoSvc   *service.IntegracaoService
	animalSvc       *service.AnimalService
	toqueSvc        *service.DiagnosticoGestacaoService
	coberturaSvc    *service.CoberturaService
}

func NewIntegracaoHandler(
	integracaoSvc *service.IntegracaoService,
	animalSvc *service.AnimalService,
	toqueSvc *service.DiagnosticoGestacaoService,
	coberturaSvc *service.CoberturaService,
) *IntegracaoHandler {
	return &IntegracaoHandler{
		integracaoSvc: integracaoSvc,
		animalSvc:     animalSvc,
		toqueSvc:      toqueSvc,
		coberturaSvc:  coberturaSvc,
	}
}

func (h *IntegracaoHandler) Me(c *gin.Context) {
	clientID, _ := auth.GetIntegrationClientID(c)
	cliente, err := h.integracaoSvc.GetByID(c.Request.Context(), clientID)
	if err != nil {
		response.ErrorInternal(c, "Erro ao obter cliente", err.Error())
		return
	}
	resp := gin.H{
		"id":          cliente.ID,
		"nome":        cliente.Nome,
		"scopes":      cliente.Scopes,
		"fazenda_ids": cliente.FazendaIDs,
		"ativo":       cliente.Ativo,
	}
	response.SuccessOK(c, resp, "OK")
}

func (h *IntegracaoHandler) SearchAnimais(c *gin.Context) {
	identificacao := c.Query("identificacao")
	fazendaID, _ := strconv.ParseInt(c.Query("fazenda_id"), 10, 64)
	if identificacao == "" || fazendaID <= 0 {
		response.ErrorBadRequest(c, "identificacao e fazenda_id sao obrigatorios", nil)
		return
	}
	if !ValidateFazendaIntegracao(c, fazendaID) {
		return
	}
	list, err := h.animalSvc.SearchByIdentificacao(c.Request.Context(), identificacao)
	if err != nil {
		response.ErrorInternal(c, "Erro ao buscar", err.Error())
		return
	}
	filtered := make([]*models.Animal, 0)
	for _, a := range list {
		if a.FazendaID == fazendaID {
			filtered = append(filtered, a)
		}
	}
	response.SuccessOK(c, filtered, "OK")
}

func (h *IntegracaoHandler) GetAnimal(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	animal, err := h.animalSvc.GetByID(c.Request.Context(), id)
	if err != nil {
		response.ErrorNotFound(c, "Animal nao encontrado")
		return
	}
	if !ValidateFazendaIntegracao(c, animal.FazendaID) {
		return
	}
	response.SuccessOK(c, animal, "OK")
}

func (h *IntegracaoHandler) ListCoberturas(c *gin.Context) {
	animalID, _ := strconv.ParseInt(c.Query("animal_id"), 10, 64)
	if animalID <= 0 {
		response.ErrorBadRequest(c, "animal_id obrigatorio", nil)
		return
	}
	animal, err := h.animalSvc.GetByID(c.Request.Context(), animalID)
	if err != nil {
		response.ErrorNotFound(c, "Animal nao encontrado")
		return
	}
	if !ValidateFazendaIntegracao(c, animal.FazendaID) {
		return
	}
	list, err := h.coberturaSvc.GetByAnimalID(c.Request.Context(), animalID)
	if err != nil {
		response.ErrorInternal(c, "Erro ao listar coberturas", err.Error())
		return
	}
	response.SuccessOK(c, list, "OK")
}

func (h *IntegracaoHandler) CreateToque(c *gin.Context) {
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		response.ErrorBadRequest(c, "body invalido", nil)
		return
	}
	c.Request.Body = io.NopCloser(bytes.NewReader(body))

	clientID, _ := auth.GetIntegrationClientID(c)
	idemKey := c.GetHeader("Idempotency-Key")
	reqHash := service.HashRequestBody(body)
	if cached, status, conflict, err := h.integracaoSvc.CheckIdempotency(c.Request.Context(), clientID, idemKey, reqHash); err != nil {
		response.ErrorInternal(c, "Erro de idempotencia", err.Error())
		return
	} else if conflict {
		response.Error(c, http.StatusConflict, response.CodeConflict, "Idempotency-Key ja usada com payload diferente", nil)
		return
	} else if cached != nil {
		var payload interface{}
		_ = json.Unmarshal(cached, &payload)
		response.Success(c, status, payload, "Resposta idempotente")
		return
	}

	var req struct {
		AnimalID              int64   `json:"animal_id" binding:"required"`
		Data                  string  `json:"data" binding:"required"`
		Resultado             string  `json:"resultado" binding:"required"`
		FazendaID             int64   `json:"fazenda_id" binding:"required"`
		CoberturaID           *int64  `json:"cobertura_id"`
		DiasGestacaoEstimados *int    `json:"dias_gestacao_estimados"`
		Metodo                *string `json:"metodo"`
		Veterinario           *string `json:"veterinario"`
		Observacoes           *string `json:"observacoes"`
	}
	if err := json.Unmarshal(body, &req); err != nil {
		response.ErrorValidation(c, "Dados invalidos", err.Error())
		return
	}
	if !ValidateFazendaIntegracao(c, req.FazendaID) {
		return
	}
	t, err := time.Parse(time.RFC3339, req.Data)
	if err != nil {
		response.ErrorValidation(c, "data invalida", err.Error())
		return
	}
	d := &models.DiagnosticoGestacao{
		AnimalID: req.AnimalID, Data: t, Resultado: req.Resultado, FazendaID: req.FazendaID,
		CoberturaID: req.CoberturaID, DiasGestacaoEstimados: req.DiasGestacaoEstimados,
		Metodo: req.Metodo, Veterinario: req.Veterinario, Observacoes: req.Observacoes,
	}
	if actorID, ok := GetActorUserID(c); ok {
		d.CreatedBy = &actorID
	}
	if err := h.toqueSvc.Create(c.Request.Context(), d); err != nil {
		mapToqueError(c, err)
		return
	}
	wrap := response.SuccessResponse{Data: d, Message: "Toque registrado", Timestamp: time.Now().UTC().Format(time.RFC3339)}
	_ = h.integracaoSvc.SaveIdempotency(c.Request.Context(), clientID, idemKey, reqHash, http.StatusCreated, wrap)
	response.SuccessCreated(c, d, "Toque registrado")
}

func (h *IntegracaoHandler) CreateToqueLote(c *gin.Context) {
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		response.ErrorBadRequest(c, "body invalido", nil)
		return
	}
	clientID, _ := auth.GetIntegrationClientID(c)
	idemKey := c.GetHeader("Idempotency-Key")
	if idemKey == "" {
		var bodyMap struct {
			IdempotencyKey *string `json:"idempotency_key"`
		}
		_ = json.Unmarshal(body, &bodyMap)
		if bodyMap.IdempotencyKey != nil {
			idemKey = *bodyMap.IdempotencyKey
		}
	}
	reqHash := service.HashRequestBody(body)
	if cached, status, conflict, err := h.integracaoSvc.CheckIdempotency(c.Request.Context(), clientID, idemKey, reqHash); err != nil {
		response.ErrorInternal(c, "Erro de idempotencia", err.Error())
		return
	} else if conflict {
		response.Error(c, http.StatusConflict, response.CodeConflict, "Idempotency-Key ja usada com payload diferente", nil)
		return
	} else if cached != nil {
		var payload interface{}
		_ = json.Unmarshal(cached, &payload)
		response.Success(c, status, payload, "Resposta idempotente")
		return
	}

	var req struct {
		FazendaID      int64                  `json:"fazenda_id" binding:"required"`
		IdempotencyKey *string                `json:"idempotency_key"`
		Itens          []models.ToqueLoteItem `json:"itens" binding:"required"`
	}
	if err := json.Unmarshal(body, &req); err != nil {
		response.ErrorValidation(c, "Dados invalidos", err.Error())
		return
	}
	if !ValidateFazendaIntegracao(c, req.FazendaID) {
		return
	}
	actorID, _ := GetActorUserID(c)
	loteSvc := service.NewIntegracaoToqueLoteService(h.animalSvc, h.toqueSvc, auth.GetIntegrationFazendaIDs(c), actorID)
	result, err := loteSvc.Process(c.Request.Context(), req.FazendaID, req.Itens)
	if err != nil {
		response.ErrorForbidden(c, err.Error())
		return
	}
	wrap := response.SuccessResponse{Data: result, Message: "Lote processado", Timestamp: time.Now().UTC().Format(time.RFC3339)}
	_ = h.integracaoSvc.SaveIdempotency(c.Request.Context(), clientID, idemKey, reqHash, http.StatusOK, wrap)
	response.SuccessOK(c, result, "Lote processado")
}

func mapToqueError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, service.ErrToquePositivoSemCobertura), errors.Is(err, service.ErrToquePositivoGestacaoAtiva):
		response.ErrorValidation(c, err.Error(), nil)
	default:
		response.ErrorInternal(c, "Erro ao registrar toque", err.Error())
	}
}
