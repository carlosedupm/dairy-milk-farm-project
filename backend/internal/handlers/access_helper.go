package handlers

import (
	"context"
	"errors"
	"net/http"
	"strconv"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/response"
	"github.com/ceialmilk/api/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
)

// SetCreatedBy preenche created_by no modelo; actorID deve vir do JWT/contexto interno, nunca do body JSON.
func SetCreatedBy(dst **int64, actorID int64) {
	if actorID > 0 {
		id := actorID
		*dst = &id
	}
}

// GetActorUserID devolve o ID do utilizador autenticado (JWT ou actor de integração M2M).
func GetActorUserID(c *gin.Context) (int64, bool) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		return 0, false
	}
	userID, ok := userIDVal.(int64)
	return userID, ok
}

// ValidateFazendaIntegracao verifica se fazenda_id está na lista do cliente de integração.
func ValidateFazendaIntegracao(c *gin.Context, fazendaID int64) bool {
	idsVal, ok := c.Get("integration_fazenda_ids")
	if !ok {
		response.ErrorForbidden(c, "Integracao sem fazendas configuradas")
		return false
	}
	ids, _ := idsVal.([]int64)
	for _, id := range ids {
		if id == fazendaID {
			return true
		}
	}
	response.ErrorForbidden(c, "Fazenda nao autorizada para esta integracao")
	return false
}

// fazendaAccessQuerier consultas mínimas para validação de acesso à fazenda (testável via stub).
type fazendaAccessQuerier interface {
	GetByID(ctx context.Context, id int64) (*models.Fazenda, error)
	GetByUsuarioID(ctx context.Context, usuarioID int64) ([]*models.Fazenda, error)
}

// ValidateFazendaAccess verifica se a fazenda informada pertence ao usuário logado.
// Retorna true se o acesso for válido, false caso contrário (já enviando a resposta de erro).
func ValidateFazendaAccess(c *gin.Context, fazendaSvc fazendaAccessQuerier, fazendaID int64) bool {
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
func ValidateFazendaAccessOrGestao(c *gin.Context, fazendaSvc fazendaAccessQuerier, fazendaID int64) bool {
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
func ResolveFazendaIDsForList(c *gin.Context, fazendaSvc fazendaAccessQuerier) ([]int64, bool) {
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

// RespondIfStatusSaudeDerivado mapeia ErrStatusSaudeDerivado para 400 STATUS_SAUDE_DERIVADO (BR-SAUDE-013).
func RespondIfStatusSaudeDerivado(c *gin.Context, err error) bool {
	if errors.Is(err, service.ErrStatusSaudeDerivado) {
		response.Error(
			c,
			http.StatusBadRequest,
			response.CodeStatusSaudeDerivado,
			err.Error(),
			nil,
		)
		return true
	}
	return false
}

// RespondIfAnimalForaRebanho mapeia ErrAnimalForaDoRebanho para 400 ANIMAL_FORA_REBANHO (BR-BAIXA-007/010).
func RespondIfAnimalForaRebanho(c *gin.Context, err error) bool {
	if errors.Is(err, service.ErrAnimalForaDoRebanho) {
		response.Error(
			c,
			http.StatusBadRequest,
			response.CodeAnimalForaRebanho,
			"Animal fora do rebanho: não é possível alterar ou excluir este registo do ciclo",
			nil,
		)
		return true
	}
	return false
}

// RespondIfDomainWriteError trata erros de integridade (INT/TMP), status derivado e animal fora do rebanho.
func RespondIfDomainWriteError(c *gin.Context, err error) bool {
	if RespondIfIntegridadeCiclo(c, err) {
		return true
	}
	if RespondIfStatusSaudeDerivado(c, err) {
		return true
	}
	return RespondIfAnimalForaRebanho(c, err)
}

// RespondIfIntegridadeCiclo mapeia violações preventivas (INT-xxx / TMP-xxx) para 400 com código de conformidade.
func RespondIfIntegridadeCiclo(c *gin.Context, err error) bool {
	if ie, ok := service.AsIntegridadeCiclo(err); ok {
		response.ErrorValidation(c, ie.Message, map[string]string{"conformidade": ie.IntCodigo})
		return true
	}
	if errors.Is(err, service.ErrPrenheSemGestacao) {
		response.ErrorValidation(c, err.Error(), map[string]string{"conformidade": "INT-005"})
		return true
	}
	if errors.Is(err, service.ErrProducaoSemLactacaoNaData) {
		response.ErrorValidation(c, err.Error(), map[string]string{"conformidade": "INT-002"})
		return true
	}
	return false
}
