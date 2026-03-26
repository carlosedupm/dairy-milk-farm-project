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

type FolgasHandler struct {
	svc *service.FolgasService
}

func NewFolgasHandler(svc *service.FolgasService) *FolgasHandler {
	return &FolgasHandler{svc: svc}
}

func parseDateQuery(c *gin.Context, key string) (time.Time, error) {
	s := c.Query(key)
	if s == "" {
		return time.Time{}, errors.New("data obrigatória")
	}
	return time.Parse("2006-01-02", s)
}

func parseDateBody(s string) (time.Time, error) {
	if s == "" {
		return time.Time{}, errors.New("data obrigatória")
	}
	return time.Parse("2006-01-02", s)
}

// GetConfig GET /api/v1/fazendas/:id/folgas/config
func (h *FolgasHandler) GetConfig(c *gin.Context) {
	fazendaID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || fazendaID <= 0 {
		response.ErrorBadRequest(c, "fazenda_id inválido", nil)
		return
	}
	if !ValidateFazendaAccessOrGestao(c, h.svc.FazendaService(), fazendaID) {
		return
	}
	perfil, _ := c.Get("perfil")
	p, _ := perfil.(string)
	uid, _ := c.Get("user_id")
	userID, _ := uid.(int64)
	cfg, err := h.svc.GetConfig(c.Request.Context(), fazendaID, p, userID)
	if err != nil {
		if errors.Is(err, service.ErrFolgasConfigNotFound) {
			response.ErrorNotFound(c, "Configuração de folgas não encontrada. Defina a escala (gestão).")
			return
		}
		response.ErrorInternal(c, "Erro ao buscar configuração", err.Error())
		return
	}
	response.SuccessOK(c, cfg, "Configuração de folgas")
}

// PutConfig PUT /api/v1/fazendas/:id/folgas/config
func (h *FolgasHandler) PutConfig(c *gin.Context) {
	fazendaID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || fazendaID <= 0 {
		response.ErrorBadRequest(c, "fazenda_id inválido", nil)
		return
	}
	if !ValidateFazendaAccessOrGestao(c, h.svc.FazendaService(), fazendaID) {
		return
	}
	perfil, _ := c.Get("perfil")
	p, _ := perfil.(string)
	if !models.PodeGerenciarFolgas(p) {
		response.ErrorForbidden(c, "Apenas gestão ou administrador pode alterar a configuração de folgas.")
		return
	}
	uid, _ := c.Get("user_id")
	userID, _ := uid.(int64)

	var req struct {
		DataAnchor   string `json:"data_anchor" binding:"required"`
		UsuarioSlot0 int64  `json:"usuario_slot_0" binding:"required"`
		UsuarioSlot1 int64  `json:"usuario_slot_1" binding:"required"`
		UsuarioSlot2 int64  `json:"usuario_slot_2" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorValidation(c, "Dados inválidos", err.Error())
		return
	}
	da, err := parseDateBody(req.DataAnchor)
	if err != nil {
		response.ErrorValidation(c, "data_anchor inválida", err.Error())
		return
	}
	if err := h.svc.PutConfig(c.Request.Context(), fazendaID, da, req.UsuarioSlot0, req.UsuarioSlot1, req.UsuarioSlot2, userID, p); err != nil {
		if errors.Is(err, service.ErrFolgasSemPermissao) {
			response.ErrorForbidden(c, err.Error())
			return
		}
		if errors.Is(err, service.ErrFolgasSlotsInvalidos) {
			response.ErrorValidation(c, err.Error(), nil)
			return
		}
		if errors.Is(err, service.ErrFolgasPerfilNaoPermitido) {
			response.ErrorValidation(c, err.Error(), map[string]string{"hint": "Selecione usuários com perfil FUNCIONARIO e GERENTE (ou GESTAO)."})
			return
		}
		response.ErrorInternal(c, "Erro ao salvar configuração", err.Error())
		return
	}
	cfg, _ := h.svc.GetConfig(c.Request.Context(), fazendaID, p, userID)
	response.SuccessOK(c, cfg, "Configuração salva com sucesso")
}

// GetEscala GET /api/v1/fazendas/:id/folgas/escala
func (h *FolgasHandler) GetEscala(c *gin.Context) {
	fazendaID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || fazendaID <= 0 {
		response.ErrorBadRequest(c, "fazenda_id inválido", nil)
		return
	}
	if !ValidateFazendaAccessOrGestao(c, h.svc.FazendaService(), fazendaID) {
		return
	}
	inicio, err := parseDateQuery(c, "inicio")
	if err != nil {
		response.ErrorBadRequest(c, "Parâmetro inicio (YYYY-MM-DD) obrigatório", nil)
		return
	}
	fim, err := parseDateQuery(c, "fim")
	if err != nil {
		response.ErrorBadRequest(c, "Parâmetro fim (YYYY-MM-DD) obrigatório", nil)
		return
	}
	perfil, _ := c.Get("perfil")
	p, _ := perfil.(string)
	uid, _ := c.Get("user_id")
	userID, _ := uid.(int64)
	payload, err := h.svc.ListEscala(c.Request.Context(), fazendaID, inicio, fim, p, userID)
	if err != nil {
		if errors.Is(err, service.ErrFolgasSemPermissao) {
			response.ErrorForbidden(c, err.Error())
			return
		}
		response.ErrorInternal(c, "Erro ao listar escala", err.Error())
		return
	}
	response.SuccessOK(c, payload, "Escala listada")
}

// GetResumoEquidade GET /api/v1/fazendas/:id/folgas/resumo-equidade?inicio=&fim=
func (h *FolgasHandler) GetResumoEquidade(c *gin.Context) {
	fazendaID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || fazendaID <= 0 {
		response.ErrorBadRequest(c, "fazenda_id inválido", nil)
		return
	}
	if !ValidateFazendaAccessOrGestao(c, h.svc.FazendaService(), fazendaID) {
		return
	}
	perfil, _ := c.Get("perfil")
	p, _ := perfil.(string)
	if !models.PodeGerenciarFolgas(p) {
		response.ErrorForbidden(c, "Apenas gestão ou administrador pode ver o resumo de equidade.")
		return
	}
	inicio, err := parseDateQuery(c, "inicio")
	if err != nil {
		response.ErrorBadRequest(c, "Parâmetro inicio (YYYY-MM-DD) obrigatório", nil)
		return
	}
	fim, err := parseDateQuery(c, "fim")
	if err != nil {
		response.ErrorBadRequest(c, "Parâmetro fim (YYYY-MM-DD) obrigatório", nil)
		return
	}
	uid, _ := c.Get("user_id")
	userID, _ := uid.(int64)
	list, err := h.svc.ResumoEquidade(c.Request.Context(), fazendaID, inicio, fim, p, userID)
	if err != nil {
		if errors.Is(err, service.ErrFolgasSemPermissao) {
			response.ErrorForbidden(c, err.Error())
			return
		}
		if errors.Is(err, service.ErrFolgasConfigNotFound) {
			response.ErrorBadRequest(c, "Configure a escala antes de consultar equidade.", nil)
			return
		}
		response.ErrorInternal(c, "Erro ao calcular resumo de equidade", err.Error())
		return
	}
	response.SuccessOK(c, list, "Resumo de equidade")
}

// PostGerar POST /api/v1/fazendas/:id/folgas/gerar
func (h *FolgasHandler) PostGerar(c *gin.Context) {
	fazendaID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || fazendaID <= 0 {
		response.ErrorBadRequest(c, "fazenda_id inválido", nil)
		return
	}
	if !ValidateFazendaAccessOrGestao(c, h.svc.FazendaService(), fazendaID) {
		return
	}
	perfil, _ := c.Get("perfil")
	p, _ := perfil.(string)
	if !models.PodeGerenciarFolgas(p) {
		response.ErrorForbidden(c, "Apenas gestão ou administrador pode gerar a escala.")
		return
	}
	uid, _ := c.Get("user_id")
	userID, _ := uid.(int64)

	var req struct {
		Inicio string `json:"inicio" binding:"required"`
		Fim    string `json:"fim" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorValidation(c, "Dados inválidos", err.Error())
		return
	}
	inicio, err := parseDateBody(req.Inicio)
	if err != nil {
		response.ErrorValidation(c, "inicio inválido", err.Error())
		return
	}
	fim, err := parseDateBody(req.Fim)
	if err != nil {
		response.ErrorValidation(c, "fim inválido", err.Error())
		return
	}
	if err := h.svc.Gerar(c.Request.Context(), fazendaID, inicio, fim, userID, p); err != nil {
		if errors.Is(err, service.ErrFolgasConfigNotFound) {
			response.ErrorBadRequest(c, "Configure a escala antes de gerar.", nil)
			return
		}
		if errors.Is(err, service.ErrFolgasSemPermissao) {
			response.ErrorForbidden(c, err.Error())
			return
		}
		response.ErrorInternal(c, "Erro ao gerar escala", err.Error())
		return
	}
	response.SuccessOK(c, nil, "Escala gerada com sucesso")
}

// PostAlteracoes POST /api/v1/fazendas/:id/folgas/alteracoes
func (h *FolgasHandler) PostAlteracoes(c *gin.Context) {
	fazendaID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || fazendaID <= 0 {
		response.ErrorBadRequest(c, "fazenda_id inválido", nil)
		return
	}
	if !ValidateFazendaAccessOrGestao(c, h.svc.FazendaService(), fazendaID) {
		return
	}
	perfil, _ := c.Get("perfil")
	p, _ := perfil.(string)
	if !models.PodeGerenciarFolgas(p) {
		response.ErrorForbidden(c, "Apenas gestão ou administrador pode alterar folgas.")
		return
	}
	uid, _ := c.Get("user_id")
	userID, _ := uid.(int64)

	var req struct {
		Data              string `json:"data" binding:"required"`
		UsuarioID         int64  `json:"usuario_id" binding:"required"`
		Motivo            string `json:"motivo" binding:"required"`
		Modo              string `json:"modo"`
		ExcecaoDiaMotivo  string `json:"excecao_dia_motivo"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorValidation(c, "Dados inválidos", err.Error())
		return
	}
	d, err := parseDateBody(req.Data)
	if err != nil {
		response.ErrorValidation(c, "data inválida", err.Error())
		return
	}
	modo := service.AlterarDiaModo(req.Modo)
	if modo == "" {
		modo = service.AlterarDiaSubstituir
	}
	if err := h.svc.AlterarDia(c.Request.Context(), fazendaID, d, req.UsuarioID, req.Motivo, modo, req.ExcecaoDiaMotivo, userID, p); err != nil {
		if errors.Is(err, service.ErrFolgasConflitoFolgaDupla) {
			response.ErrorValidation(c, err.Error(), map[string]string{"hint": "Use modo adicionar com excecao_dia_motivo ou ajuste o dia."})
			return
		}
		if errors.Is(err, service.ErrFolgasPerfilNaoPermitido) {
			response.ErrorValidation(c, err.Error(), map[string]string{"hint": "Selecione um usuário com perfil FUNCIONARIO e/ou GERENTE (ou GESTAO)."})
			return
		}
		if errors.Is(err, service.ErrFolgasUsuarioJaFolgaDia) {
			if modo == service.AlterarDiaAdicionar {
				response.ErrorValidation(
					c,
					"Já existe folga registrada para este usuário nesta data. Para trocar a folga principal, use modo 'Substituir o dia inteiro'. Para adicionar segunda folga, selecione outro usuário.",
					map[string]string{"hint": "Se o objetivo for trocar, selecione 'Substituir o dia inteiro'."},
				)
				return
			}
			response.ErrorValidation(
				c,
				"Já existe folga registrada para este usuário nesta data. Para trocar a folga principal, selecione outro usuário no modo 'Substituir o dia inteiro'.",
				map[string]string{"hint": "Selecione um usuário diferente da folga já registrada para esta data."},
			)
			return
		}
		response.ErrorInternal(c, "Erro ao alterar dia", err.Error())
		return
	}
	response.SuccessOK(c, nil, "Alteração registrada")
}

// PostJustificativa POST /api/v1/fazendas/:id/folgas/justificativas
func (h *FolgasHandler) PostJustificativa(c *gin.Context) {
	fazendaID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || fazendaID <= 0 {
		response.ErrorBadRequest(c, "fazenda_id inválido", nil)
		return
	}
	if !ValidateFazendaAccessOrGestao(c, h.svc.FazendaService(), fazendaID) {
		return
	}
	perfil, _ := c.Get("perfil")
	p, _ := perfil.(string)
	uid, _ := c.Get("user_id")
	userID, _ := uid.(int64)

	var req struct {
		Data   string `json:"data" binding:"required"`
		Motivo string `json:"motivo" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorValidation(c, "Dados inválidos", err.Error())
		return
	}
	d, err := parseDateBody(req.Data)
	if err != nil {
		response.ErrorValidation(c, "data inválida", err.Error())
		return
	}
	if err := h.svc.AddJustificativa(c.Request.Context(), fazendaID, d, userID, req.Motivo, p); err != nil {
		if errors.Is(err, service.ErrFolgasSemPermissao) {
			response.ErrorForbidden(c, "Apenas o perfil FUNCIONARIO pode registrar justificativa aqui.")
			return
		}
		if errors.Is(err, service.ErrFolgasNaoEFolga) {
			response.ErrorBadRequest(c, "Você não está de folga nesta data.", nil)
			return
		}
		response.ErrorInternal(c, "Erro ao registrar justificativa", err.Error())
		return
	}
	response.SuccessCreated(c, nil, "Justificativa registrada")
}

// GetAlteracoes GET /api/v1/fazendas/:id/folgas/alteracoes
func (h *FolgasHandler) GetAlteracoes(c *gin.Context) {
	fazendaID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || fazendaID <= 0 {
		response.ErrorBadRequest(c, "fazenda_id inválido", nil)
		return
	}
	if !ValidateFazendaAccessOrGestao(c, h.svc.FazendaService(), fazendaID) {
		return
	}
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	perfil, _ := c.Get("perfil")
	p, _ := perfil.(string)
	uid, _ := c.Get("user_id")
	userID, _ := uid.(int64)
	list, err := h.svc.ListAlteracoes(c.Request.Context(), fazendaID, limit, p, userID)
	if err != nil {
		response.ErrorInternal(c, "Erro ao listar alterações", err.Error())
		return
	}
	response.SuccessOK(c, list, "Histórico de alterações")
}

// GetAlertas GET /api/v1/fazendas/:id/folgas/alertas
func (h *FolgasHandler) GetAlertas(c *gin.Context) {
	fazendaID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || fazendaID <= 0 {
		response.ErrorBadRequest(c, "fazenda_id inválido", nil)
		return
	}
	if !ValidateFazendaAccessOrGestao(c, h.svc.FazendaService(), fazendaID) {
		return
	}
	inicio, err := parseDateQuery(c, "inicio")
	if err != nil {
		response.ErrorBadRequest(c, "Parâmetro inicio obrigatório", nil)
		return
	}
	fim, err := parseDateQuery(c, "fim")
	if err != nil {
		response.ErrorBadRequest(c, "Parâmetro fim obrigatório", nil)
		return
	}
	perfil, _ := c.Get("perfil")
	p, _ := perfil.(string)
	uid, _ := c.Get("user_id")
	userID, _ := uid.(int64)
	list, err := h.svc.ListAlertas(c.Request.Context(), fazendaID, inicio, fim, p, userID)
	if err != nil {
		response.ErrorInternal(c, "Erro ao listar alertas", err.Error())
		return
	}
	response.SuccessOK(c, list, "Alertas calculados")
}
