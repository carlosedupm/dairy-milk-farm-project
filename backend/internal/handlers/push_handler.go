package handlers

import (
	"errors"

	"github.com/ceialmilk/api/internal/response"
	"github.com/ceialmilk/api/internal/service"
	"github.com/gin-gonic/gin"
)

type PushHandler struct {
	pushSvc *service.PushNotificationService
}

func NewPushHandler(pushSvc *service.PushNotificationService) *PushHandler {
	return &PushHandler{pushSvc: pushSvc}
}

func (h *PushHandler) GetVapidPublicKey(c *gin.Context) {
	key, err := h.pushSvc.GetVapidPublicKey()
	if err != nil {
		response.ErrorServiceUnavailable(c, "Notificações push indisponíveis", nil)
		return
	}
	response.SuccessOK(c, gin.H{"public_key": key}, "")
}

type pushSubscriptionRequest struct {
	Endpoint string `json:"endpoint" binding:"required"`
	Keys     struct {
		P256dh string `json:"p256dh" binding:"required"`
		Auth   string `json:"auth" binding:"required"`
	} `json:"keys" binding:"required"`
}

func (h *PushHandler) UpsertSubscription(c *gin.Context) {
	userID, ok := GetActorUserID(c)
	if !ok {
		response.ErrorUnauthorized(c, "Usuário não identificado")
		return
	}
	var req pushSubscriptionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorValidation(c, "Subscription inválida", err.Error())
		return
	}
	ua := c.GetHeader("User-Agent")
	var uaPtr *string
	if ua != "" {
		uaPtr = &ua
	}
	if err := h.pushSvc.UpsertSubscription(c.Request.Context(), userID, service.PushSubscriptionInput{
		Endpoint:  req.Endpoint,
		P256dh:    req.Keys.P256dh,
		Auth:      req.Keys.Auth,
		UserAgent: uaPtr,
	}); err != nil {
		response.ErrorInternal(c, "Erro ao registrar subscription", err.Error())
		return
	}
	response.SuccessOK(c, gin.H{"registered": true}, "Subscription registrada")
}

type deletePushSubscriptionRequest struct {
	Endpoint string `json:"endpoint" binding:"required"`
}

func (h *PushHandler) DeleteSubscription(c *gin.Context) {
	userID, ok := GetActorUserID(c)
	if !ok {
		response.ErrorUnauthorized(c, "Usuário não identificado")
		return
	}
	var req deletePushSubscriptionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorValidation(c, "Dados inválidos", err.Error())
		return
	}
	if err := h.pushSvc.DeleteSubscription(c.Request.Context(), userID, req.Endpoint); err != nil {
		response.ErrorInternal(c, "Erro ao remover subscription", err.Error())
		return
	}
	response.SuccessOK(c, gin.H{"deleted": true}, "Subscription removida")
}

type fazendaAtivaRequest struct {
	FazendaID int64 `json:"fazenda_id" binding:"required"`
}

func (h *PushHandler) UpdateFazendaAtiva(c *gin.Context) {
	userID, ok := GetActorUserID(c)
	if !ok {
		response.ErrorUnauthorized(c, "Usuário não identificado")
		return
	}
	var req fazendaAtivaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorValidation(c, "Dados inválidos", err.Error())
		return
	}
	if req.FazendaID <= 0 {
		response.ErrorValidation(c, "fazenda_id inválido", nil)
		return
	}
	if err := h.pushSvc.UpdateFazendaAtiva(c.Request.Context(), userID, req.FazendaID); err != nil {
		if errors.Is(err, service.ErrFazendaAtivaSemVinculo) {
			response.ErrorForbidden(c, "Fazenda não vinculada ao utilizador")
			return
		}
		response.ErrorInternal(c, "Erro ao atualizar fazenda ativa", err.Error())
		return
	}
	response.SuccessOK(c, gin.H{"fazenda_id": req.FazendaID}, "Fazenda ativa atualizada")
}
