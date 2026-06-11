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
	"github.com/jackc/pgx/v5"
)

type animalHormonioLactacaoService interface {
	ListByAnimalID(ctx context.Context, animalID int64) ([]*models.AnimalHormonioLactacaoAplicacao, error)
	GetByID(ctx context.Context, animalID, aplicacaoID int64) (*models.AnimalHormonioLactacaoAplicacao, error)
	Create(ctx context.Context, animalID int64, in service.SaveHormonioLactacaoInput) (*models.AnimalHormonioLactacaoAplicacao, error)
	Update(ctx context.Context, animalID, aplicacaoID int64, in service.SaveHormonioLactacaoInput) (*models.AnimalHormonioLactacaoAplicacao, error)
	Delete(ctx context.Context, animalID, aplicacaoID int64) error
	GetProtocolo(ctx context.Context, animalID int64) (*models.AnimalHormonioLactacaoProtocolo, error)
	EncerrarProtocolo(ctx context.Context, animalID int64, in service.EncerrarHormonioProtocoloInput) (*models.AnimalHormonioLactacaoProtocolo, error)
	ListPendentes(ctx context.Context, fazendaID int64) ([]*models.HormonioLactacaoPendente, error)
}

type AnimalHormonioLactacaoHandler struct {
	svc        animalHormonioLactacaoService
	animalSvc  *service.AnimalService
	fazendaSvc *service.FazendaService
}

func NewAnimalHormonioLactacaoHandler(
	svc animalHormonioLactacaoService,
	animalSvc *service.AnimalService,
	fazendaSvc *service.FazendaService,
) *AnimalHormonioLactacaoHandler {
	return &AnimalHormonioLactacaoHandler{
		svc:        svc,
		animalSvc:  animalSvc,
		fazendaSvc: fazendaSvc,
	}
}

type saveHormonioLactacaoRequest struct {
	Produto       string  `json:"produto" binding:"required"`
	DataAplicacao string  `json:"data_aplicacao" binding:"required"`
	Lote          *string `json:"lote"`
	Observacoes   *string `json:"observacoes"`
}

type encerrarHormonioProtocoloRequest struct {
	MotivoEncerramento string  `json:"motivo_encerramento" binding:"required"`
	Observacoes        *string `json:"observacoes"`
	DataEncerramento   *string `json:"data_encerramento"`
}

func (h *AnimalHormonioLactacaoHandler) List(c *gin.Context) {
	animalID, ok := h.resolveAnimalIDAndAccess(c)
	if !ok {
		return
	}
	list, err := h.svc.ListByAnimalID(c.Request.Context(), animalID)
	if err != nil {
		if h.respondCommonErrors(c, err) {
			return
		}
		response.ErrorInternal(c, "Erro ao listar aplicações de hormônio", err.Error())
		return
	}
	response.SuccessOK(c, list, "Aplicações listadas com sucesso")
}

func (h *AnimalHormonioLactacaoHandler) GetByID(c *gin.Context) {
	animalID, ok := h.resolveAnimalIDAndAccess(c)
	if !ok {
		return
	}
	aplicacaoID, ok := parseHormonioAplicacaoID(c)
	if !ok {
		return
	}
	row, err := h.svc.GetByID(c.Request.Context(), animalID, aplicacaoID)
	if err != nil {
		if h.respondCommonErrors(c, err) {
			return
		}
		response.ErrorInternal(c, "Erro ao buscar aplicação", err.Error())
		return
	}
	response.SuccessOK(c, row, "Aplicação carregada com sucesso")
}

func (h *AnimalHormonioLactacaoHandler) Create(c *gin.Context) {
	animalID, ok := h.resolveAnimalIDAndAccess(c)
	if !ok {
		return
	}
	var req saveHormonioLactacaoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorBadRequest(c, "Corpo da requisição inválido", nil)
		return
	}
	in, ok := parseSaveHormonioInput(c, req)
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
		response.ErrorInternal(c, "Erro ao registrar aplicação", err.Error())
		return
	}
	response.SuccessCreated(c, row, "Aplicação registrada com sucesso")
}

func (h *AnimalHormonioLactacaoHandler) Update(c *gin.Context) {
	animalID, ok := h.resolveAnimalIDAndAccess(c)
	if !ok {
		return
	}
	aplicacaoID, ok := parseHormonioAplicacaoID(c)
	if !ok {
		return
	}
	var req saveHormonioLactacaoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorBadRequest(c, "Corpo da requisição inválido", nil)
		return
	}
	in, ok := parseSaveHormonioInput(c, req)
	if !ok {
		return
	}
	row, err := h.svc.Update(c.Request.Context(), animalID, aplicacaoID, in)
	if err != nil {
		if h.respondCommonErrors(c, err) {
			return
		}
		response.ErrorInternal(c, "Erro ao atualizar aplicação", err.Error())
		return
	}
	response.SuccessOK(c, row, "Aplicação atualizada com sucesso")
}

func (h *AnimalHormonioLactacaoHandler) Delete(c *gin.Context) {
	animalID, ok := h.resolveAnimalIDAndAccess(c)
	if !ok {
		return
	}
	aplicacaoID, ok := parseHormonioAplicacaoID(c)
	if !ok {
		return
	}
	if err := h.svc.Delete(c.Request.Context(), animalID, aplicacaoID); err != nil {
		if h.respondCommonErrors(c, err) {
			return
		}
		response.ErrorInternal(c, "Erro ao excluir aplicação", err.Error())
		return
	}
	response.SuccessOK(c, nil, "Aplicação excluída com sucesso")
}

func (h *AnimalHormonioLactacaoHandler) GetProtocolo(c *gin.Context) {
	animalID, ok := h.resolveAnimalIDAndAccess(c)
	if !ok {
		return
	}
	protocolo, err := h.svc.GetProtocolo(c.Request.Context(), animalID)
	if err != nil {
		if h.respondCommonErrors(c, err) {
			return
		}
		response.ErrorInternal(c, "Erro ao buscar protocolo", err.Error())
		return
	}
	response.SuccessOK(c, protocolo, "Protocolo carregado com sucesso")
}

func (h *AnimalHormonioLactacaoHandler) EncerrarProtocolo(c *gin.Context) {
	animalID, ok := h.resolveAnimalIDAndAccess(c)
	if !ok {
		return
	}
	var req encerrarHormonioProtocoloRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorBadRequest(c, "Corpo da requisição inválido", nil)
		return
	}
	in := service.EncerrarHormonioProtocoloInput{
		MotivoEncerramento: req.MotivoEncerramento,
		Observacoes:        req.Observacoes,
	}
	if req.DataEncerramento != nil && *req.DataEncerramento != "" {
		t, err := time.Parse("2006-01-02", *req.DataEncerramento)
		if err != nil {
			response.ErrorBadRequest(c, "data_encerramento deve estar no formato YYYY-MM-DD", nil)
			return
		}
		in.DataEncerramento = &t
	}
	protocolo, err := h.svc.EncerrarProtocolo(c.Request.Context(), animalID, in)
	if err != nil {
		if h.respondCommonErrors(c, err) {
			return
		}
		response.ErrorInternal(c, "Erro ao encerrar protocolo", err.Error())
		return
	}
	response.SuccessOK(c, protocolo, "Protocolo encerrado com sucesso")
}

func (h *AnimalHormonioLactacaoHandler) ListPendentes(c *gin.Context) {
	fazendaID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || fazendaID <= 0 {
		response.ErrorBadRequest(c, "fazenda_id inválido", nil)
		return
	}
	if !ValidateFazendaAccess(c, h.fazendaSvc, fazendaID) {
		return
	}
	list, err := h.svc.ListPendentes(c.Request.Context(), fazendaID)
	if err != nil {
		if h.respondCommonErrors(c, err) {
			return
		}
		response.ErrorInternal(c, "Erro ao listar pendentes", err.Error())
		return
	}
	response.SuccessOK(c, list, "Pendentes listados com sucesso")
}

func (h *AnimalHormonioLactacaoHandler) resolveAnimalIDAndAccess(c *gin.Context) (int64, bool) {
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

func parseHormonioAplicacaoID(c *gin.Context) (int64, bool) {
	aplicacaoID, err := strconv.ParseInt(c.Param("aplicacaoId"), 10, 64)
	if err != nil || aplicacaoID <= 0 {
		response.ErrorBadRequest(c, "aplicacao_id inválido", nil)
		return 0, false
	}
	return aplicacaoID, true
}

func parseSaveHormonioInput(c *gin.Context, req saveHormonioLactacaoRequest) (service.SaveHormonioLactacaoInput, bool) {
	dataAplicacao, err := time.Parse("2006-01-02", req.DataAplicacao)
	if err != nil {
		response.ErrorBadRequest(c, "data_aplicacao deve estar no formato YYYY-MM-DD", nil)
		return service.SaveHormonioLactacaoInput{}, false
	}
	return service.SaveHormonioLactacaoInput{
		Produto:       req.Produto,
		DataAplicacao: dataAplicacao,
		Lote:          req.Lote,
		Observacoes:   req.Observacoes,
	}, true
}

func (h *AnimalHormonioLactacaoHandler) respondCommonErrors(c *gin.Context, err error) bool {
	if RespondIfDomainWriteError(c, err) {
		return true
	}
	switch {
	case errors.Is(err, service.ErrAnimalNotFound):
		response.ErrorNotFound(c, "Animal não encontrado")
	case errors.Is(err, service.ErrHormonioNotFound):
		response.Error(c, 404, "HORMONIO_NAO_ENCONTRADO", "Aplicação não encontrada", nil)
	case errors.Is(err, service.ErrHormonioProtocoloNotFound):
		response.Error(c, 404, "HORMONIO_NAO_ENCONTRADO", "Protocolo não encontrado", nil)
	case errors.Is(err, service.ErrHormonioSemToquePrenhe):
		response.Error(c, 400, "HORMONIO_SEM_TOQUE_PRENHE", err.Error(), nil)
	case errors.Is(err, service.ErrHormonioSemGestacaoAtiva):
		response.Error(c, 400, "SEM_GESTACAO_ATIVA", err.Error(), nil)
	case errors.Is(err, service.ErrHormonioSemLactacaoAtiva):
		response.Error(c, 400, "SEM_LACTACAO_ATIVA", err.Error(), nil)
	case errors.Is(err, service.ErrHormonioIntervaloMinimo):
		response.Error(c, 400, "HORMONIO_INTERVALO_MINIMO", err.Error(), nil)
	case errors.Is(err, service.ErrHormonioJanelaPreParto):
		response.Error(c, 400, "HORMONIO_JANELA_PRE_PARTO", err.Error(), nil)
	case errors.Is(err, service.ErrHormonioProtocoloEncerrado):
		response.Error(c, 400, "PROTOCOLO_ENCERRADO", err.Error(), nil)
	case errors.Is(err, service.ErrHormonioProdutoInvalido):
		response.Error(c, 400, "PRODUTO_INVALIDO", err.Error(), nil)
	case errors.Is(err, service.ErrHormonioMotivoInvalido):
		response.ErrorValidation(c, err.Error(), nil)
	case errors.Is(err, pgx.ErrNoRows):
		response.ErrorValidation(c,
			"Não foi possível concluir o registo. Verifique se o animal tem lactação ativa, gestação confirmada e toque prenhe na lactação atual.",
			nil,
		)
	default:
		return false
	}
	return true
}
