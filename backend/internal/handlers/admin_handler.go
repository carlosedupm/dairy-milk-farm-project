package handlers

import (
	"errors"
	"strconv"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/response"
	"github.com/ceialmilk/api/internal/service"
	"github.com/gin-gonic/gin"
)

type AdminHandler struct {
	usuarioSvc *service.UsuarioService
	fazendaSvc *service.FazendaService
}

func NewAdminHandler(usuarioSvc *service.UsuarioService, fazendaSvc *service.FazendaService) *AdminHandler {
	return &AdminHandler{usuarioSvc: usuarioSvc, fazendaSvc: fazendaSvc}
}

type CreateUsuarioRequest struct {
	Nome   string `json:"nome" binding:"required"`
	Email  string `json:"email" binding:"required"`
	Senha  string `json:"senha" binding:"required"`
	Perfil string `json:"perfil"`
}

type UpdateUsuarioRequest struct {
	Nome    string `json:"nome" binding:"required"`
	Email   string `json:"email" binding:"required"`
	Senha   string `json:"senha"` // opcional; se vazia, não altera
	Perfil  string `json:"perfil"`
	Enabled *bool  `json:"enabled"`
}

func (h *AdminHandler) ListUsuarios(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	users, err := h.usuarioSvc.List(c.Request.Context(), limit, offset)
	if err != nil {
		response.ErrorInternal(c, "Erro ao listar usuários", err.Error())
		return
	}

	total, err := h.usuarioSvc.Count(c.Request.Context())
	if err != nil {
		response.ErrorInternal(c, "Erro ao contar usuários", err.Error())
		return
	}

	resp := gin.H{
		"usuarios": users,
		"total":    total,
	}
	response.SuccessOK(c, resp, "Usuários listados com sucesso")
}

func (h *AdminHandler) CreateUsuario(c *gin.Context) {
	var req CreateUsuarioRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorValidation(c, "Dados inválidos", err.Error())
		return
	}

	perfil := req.Perfil
	if perfil == "" {
		perfil = models.PerfilUser
	}
	if perfil != models.PerfilUser && perfil != models.PerfilAdmin {
		perfil = models.PerfilUser
	}

	u := &models.Usuario{
		Nome:   req.Nome,
		Email:  req.Email,
		Senha:  req.Senha,
		Perfil: perfil,
	}

	if err := h.usuarioSvc.Create(c.Request.Context(), u); err != nil {
		if errors.Is(err, service.ErrPerfilDeveloperViaAPI) {
			response.ErrorForbidden(c, "Perfil DEVELOPER não pode ser atribuído via API")
			return
		}
		if errors.Is(err, service.ErrEmailEmUso) {
			response.ErrorConflict(c, "Email já está em uso", nil)
			return
		}
		response.ErrorInternal(c, "Erro ao criar usuário", err.Error())
		return
	}

	u.Senha = ""
	response.SuccessCreated(c, u, "Usuário criado com sucesso")
}

func (h *AdminHandler) UpdateUsuario(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		response.ErrorBadRequest(c, "ID inválido", nil)
		return
	}

	var req UpdateUsuarioRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorValidation(c, "Dados inválidos", err.Error())
		return
	}

	perfil := req.Perfil
	if perfil == "" {
		perfil = models.PerfilUser
	}
	if perfil != models.PerfilUser && perfil != models.PerfilAdmin {
		perfil = models.PerfilUser
	}

	enabled := true
	if req.Enabled != nil {
		enabled = *req.Enabled
	}

	u := &models.Usuario{
		ID:      id,
		Nome:    req.Nome,
		Email:   req.Email,
		Senha:   req.Senha,
		Perfil:  perfil,
		Enabled: enabled,
	}

	if err := h.usuarioSvc.Update(c.Request.Context(), u); err != nil {
		if errors.Is(err, service.ErrUsuarioNotFound) {
			response.ErrorNotFound(c, "Usuário não encontrado")
			return
		}
		if errors.Is(err, service.ErrPerfilDeveloperViaAPI) {
			response.ErrorForbidden(c, "Perfil DEVELOPER não pode ser atribuído via API")
			return
		}
		if errors.Is(err, service.ErrEmailEmUso) {
			response.ErrorConflict(c, "Email já está em uso", nil)
			return
		}
		response.ErrorInternal(c, "Erro ao atualizar usuário", err.Error())
		return
	}

	u.Senha = ""
	response.SuccessOK(c, u, "Usuário atualizado com sucesso")
}

func (h *AdminHandler) ToggleEnabled(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		response.ErrorBadRequest(c, "ID inválido", nil)
		return
	}

	if err := h.usuarioSvc.ToggleEnabled(c.Request.Context(), id); err != nil {
		if errors.Is(err, service.ErrUsuarioNotFound) {
			response.ErrorNotFound(c, "Usuário não encontrado")
			return
		}
		response.ErrorInternal(c, "Erro ao alterar status do usuário", err.Error())
		return
	}

	u, _ := h.usuarioSvc.GetByID(c.Request.Context(), id)
	response.SuccessOK(c, u, "Status do usuário alterado com sucesso")
}

// GetUsuarioFazendas retorna as fazendas vinculadas ao usuário (admin).
func (h *AdminHandler) GetUsuarioFazendas(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		response.ErrorBadRequest(c, "ID inválido", nil)
		return
	}
	if _, err := h.usuarioSvc.GetByID(c.Request.Context(), id); err != nil {
		if errors.Is(err, service.ErrUsuarioNotFound) {
			response.ErrorNotFound(c, "Usuário não encontrado")
			return
		}
		response.ErrorInternal(c, "Erro ao buscar usuário", err.Error())
		return
	}
	fazendas, err := h.fazendaSvc.GetByUsuarioID(c.Request.Context(), id)
	if err != nil {
		response.ErrorInternal(c, "Erro ao buscar fazendas do usuário", err.Error())
		return
	}
	response.SuccessOK(c, fazendas, "Fazendas do usuário listadas com sucesso")
}

type SetUsuarioFazendasRequest struct {
	FazendaIDs []int64 `json:"fazenda_ids" binding:"required"`
}

// SetUsuarioFazendas atualiza as fazendas vinculadas ao usuário (admin).
func (h *AdminHandler) SetUsuarioFazendas(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		response.ErrorBadRequest(c, "ID inválido", nil)
		return
	}
	if _, err := h.usuarioSvc.GetByID(c.Request.Context(), id); err != nil {
		if errors.Is(err, service.ErrUsuarioNotFound) {
			response.ErrorNotFound(c, "Usuário não encontrado")
			return
		}
		response.ErrorInternal(c, "Erro ao buscar usuário", err.Error())
		return
	}
	var req SetUsuarioFazendasRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorValidation(c, "Dados inválidos", err.Error())
		return
	}
	if err := h.fazendaSvc.SetFazendasForUsuario(c.Request.Context(), id, req.FazendaIDs); err != nil {
		if errors.Is(err, service.ErrFazendaNotFound) {
			response.ErrorNotFound(c, "Uma ou mais fazendas não encontradas")
			return
		}
		response.ErrorInternal(c, "Erro ao atualizar fazendas do usuário", err.Error())
		return
	}
	fazendas, _ := h.fazendaSvc.GetByUsuarioID(c.Request.Context(), id)
	response.SuccessOK(c, fazendas, "Fazendas do usuário atualizadas com sucesso")
}
