package handlers

import (
	"github.com/ceialmilk/api/internal/response"
	"github.com/ceialmilk/api/internal/service"
	"github.com/gin-gonic/gin"
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
