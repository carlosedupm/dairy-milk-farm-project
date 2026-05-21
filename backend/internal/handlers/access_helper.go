package handlers

import (
	"errors"
	"strconv"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/response"
	"github.com/ceialmilk/api/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
)

// GetActorUserID devolve o ID do utilizador autenticado (JWT). ok=false se ausente ou inválido.
func GetActorUserID(c *gin.Context) (int64, bool) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		return 0, false
	}
	userID, ok := userIDVal.(int64)
	return userID, ok
}

// ValidateFazendaAccess verifica se a fazenda informada pertence ao usuário logado.
// Retorna true se o acesso for válido, false caso contrário (já enviando a resposta de erro).
func ValidateFazendaAccess(c *gin.Context, fazendaSvc *service.FazendaService, fazendaID int64) bool {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		response.ErrorUnauthorized(c, "Usuário não identificado")
		return false
	}
	userID, ok := userIDVal.(int64)
	if !ok {
		response.ErrorInternal(c, "ID de usuário inválido", nil)
		return false
	}

	// Buscar fazendas do usuário
	fazendas, err := fazendaSvc.GetByUsuarioID(c.Request.Context(), userID)
	if err != nil {
		response.ErrorInternal(c, "Erro ao validar acesso à fazenda", err.Error())
		return false
	}

	for _, f := range fazendas {
		if f.ID == fazendaID {
			return true
		}
	}

	response.ErrorForbidden(c, "Você não tem acesso a esta fazenda")
	return false
}

// ValidateFazendaAccessOrGestao permite ADMIN/DEVELOPER/GESTAO a qualquer fazenda existente;
// PROPRIETARIO, GERENTE e demais seguem apenas o vínculo em usuarios_fazendas.
func ValidateFazendaAccessOrGestao(c *gin.Context, fazendaSvc *service.FazendaService, fazendaID int64) bool {
	perfilVal, ok := c.Get("perfil")
	if !ok {
		response.ErrorUnauthorized(c, "Usuário não identificado")
		return false
	}
	p, _ := perfilVal.(string)
	if models.PodeAcessarFazendaSemVinculoGestao(p) {
		_, err := fazendaSvc.GetByID(c.Request.Context(), fazendaID)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				response.ErrorNotFound(c, "Fazenda não encontrada")
				return false
			}
			response.ErrorInternal(c, "Erro ao validar fazenda", err.Error())
			return false
		}
		return true
	}
	return ValidateFazendaAccess(c, fazendaSvc, fazendaID)
}

// ResolveFazendaIDsForList retorna IDs de fazenda para listagens: todas do usuário ou uma
// via query fazenda_id (validada). ok=false se a resposta HTTP de erro já foi enviada.
func ResolveFazendaIDsForList(c *gin.Context, fazendaSvc *service.FazendaService) ([]int64, bool) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		response.ErrorUnauthorized(c, "Usuário não identificado")
		return nil, false
	}
	userID, ok := userIDVal.(int64)
	if !ok {
		response.ErrorInternal(c, "ID de usuário inválido", nil)
		return nil, false
	}

	fazendas, err := fazendaSvc.GetByUsuarioID(c.Request.Context(), userID)
	if err != nil {
		response.ErrorInternal(c, "Erro ao listar fazendas do usuário", err.Error())
		return nil, false
	}

	fazendaIDs := make([]int64, 0, len(fazendas))
	for _, fz := range fazendas {
		fazendaIDs = append(fazendaIDs, fz.ID)
	}

	if s := c.Query("fazenda_id"); s != "" {
		fid, err := strconv.ParseInt(s, 10, 64)
		if err != nil || fid <= 0 {
			response.ErrorBadRequest(c, "fazenda_id inválido", nil)
			return nil, false
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
			return nil, false
		}
		return []int64{fid}, true
	}

	return fazendaIDs, true
}
