package handlers

import (
	"errors"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/response"
	"github.com/ceialmilk/api/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
)

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
// demais perfis seguem o vínculo usuário–fazenda.
func ValidateFazendaAccessOrGestao(c *gin.Context, fazendaSvc *service.FazendaService, fazendaID int64) bool {
	perfilVal, ok := c.Get("perfil")
	if !ok {
		response.ErrorUnauthorized(c, "Usuário não identificado")
		return false
	}
	p, _ := perfilVal.(string)
	if models.PodeGerenciarFolgas(p) {
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
