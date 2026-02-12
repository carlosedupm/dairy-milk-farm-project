package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strings"

	"github.com/ceialmilk/api/internal/repository"
	"github.com/ceialmilk/api/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/google/generative-ai-go/genai"
	"github.com/gorilla/websocket"
)

type AssistenteLiveHandler struct {
	svc           *service.AssistenteLiveService
	userRepo      *repository.UsuarioRepository
	allowedOrigin string // CORS_ORIGIN ou FRONTEND_ORIGIN; em dev (localhost) aceita qualquer origem
}

type liveClientMessage struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

func NewAssistenteLiveHandler(svc *service.AssistenteLiveService, userRepo *repository.UsuarioRepository, allowedOrigin string) *AssistenteLiveHandler {
	return &AssistenteLiveHandler{svc: svc, userRepo: userRepo, allowedOrigin: allowedOrigin}
}

func (h *AssistenteLiveHandler) upgrader() websocket.Upgrader {
	allowed := strings.TrimSpace(h.allowedOrigin)
	return websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			// Em desenvolvimento (localhost) aceita qualquer origem
			if allowed == "" || strings.Contains(allowed, "localhost") {
				return true
			}
			origin := r.Header.Get("Origin")
			return origin == allowed
		},
	}
}

// LiveSession gerencia a conexão WebSocket bidirecional.
func (h *AssistenteLiveHandler) LiveSession(c *gin.Context) {
	userID := c.GetInt64("user_id")
	perfilVal, _ := c.Get("perfil")
	perfil, _ := perfilVal.(string)

	// Carregar dados do usuário para contexto
	nomeUsuario := "Usuário"
	if user, err := h.userRepo.GetByID(c.Request.Context(), userID); err == nil && user != nil {
		if user.Nome != "" {
			nomeUsuario = user.Nome
		}
	}

	// Upgrade para WebSocket
	upg := h.upgrader()
	ws, err := upg.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		slog.Error("Erro ao fazer upgrade para WebSocket", "error", err)
		return
	}
	defer ws.Close()

	// Obter fazenda_id da query string
	var fazendaID int64
	if fid := c.Query("fazenda_id"); fid != "" {
		fmt.Sscanf(fid, "%d", &fazendaID)
	}

	// Iniciar sessão no Gemini
	slog.Info("Iniciando sessão Gemini Live para usuário", "user_id", userID, "fazenda_id", fazendaID)
	session, err := h.svc.StartSession(c.Request.Context(), userID, perfil, nomeUsuario, fazendaID)
	if err != nil {
		slog.Error("Erro ao iniciar sessão Gemini Live", "error", err)
		ws.WriteJSON(gin.H{"type": "error", "content": "Erro ao iniciar sessão com a IA: " + err.Error()})
		return
	}
	defer session.Close()

	slog.Info("Sessão Assistente Live iniciada com sucesso", "user_id", userID)

	// Enviar mensagem de boas-vindas como "greeting" (não será falada via TTS, apenas exibida).
	// Assim o microfone abre imediatamente e o usuário não precisa esperar a saudação terminar.
	welcomeMsg := gin.H{"type": "greeting", "content": "Olá! Sou o assistente do CeialMilk. Como posso ajudar você hoje?"}
	if err := session.WriteWSJSON(ws, welcomeMsg); err != nil {
		slog.Error("Erro ao enviar mensagem de boas-vindas", "error", err)
		return
	}
	slog.Info("Mensagem de boas-vindas enviada", "user_id", userID)

	// Loop de leitura do WebSocket (Frontend -> Backend -> Gemini)
	for {
		messageType, p, err := ws.ReadMessage()
		if err != nil {
			slog.Info("Conexão WebSocket fechada", "user_id", userID, "error", err)
			break
		}

		if messageType == websocket.BinaryMessage {
			// Áudio bruto recebido do frontend
			slog.Debug("Áudio recebido do frontend", "size", len(p))
		} else if messageType == websocket.TextMessage {
			// Texto recebido do frontend (fallback ou comandos)
			slog.Info("Texto recebido do frontend", "user_id", userID, "payload", string(p))
			var msg liveClientMessage
			if err := json.Unmarshal(p, &msg); err != nil {
				slog.Error("Erro ao decodificar JSON do frontend", "error", err)
				continue
			}

			msgType := strings.ToLower(strings.TrimSpace(msg.Type))
			switch msgType {
			case "interrupt":
				// Barge-in: usuário começou a falar; cancela resposta/turno atual imediatamente.
				session.InterruptTurn()
			case "", "text":
				text := strings.TrimSpace(msg.Text)
				if text == "" {
					continue
				}
				turnCtx, turnID := session.BeginTurn()
				// Rodar em goroutine para não travar o loop de leitura do WebSocket.
				go h.processTextInteraction(turnCtx, session, ws, text, turnID)
			default:
				slog.Debug("Mensagem WebSocket não suportada", "user_id", userID, "type", msgType)
			}
		}
	}
}

// friendlyErrorMessage mapeia erros do Gemini/rede para mensagens amigáveis ao usuário.
func friendlyErrorMessage(err error) string {
	if err == nil {
		return ""
	}
	s := strings.ToLower(err.Error())
	switch {
	case strings.Contains(s, "429") || strings.Contains(s, "quota") || strings.Contains(s, "resource exhausted"):
		return "Muitas conversas agora. Tente em alguns minutos."
	case strings.Contains(s, "503") || strings.Contains(s, "unavailable") || strings.Contains(s, "deadline"):
		return "Serviço temporariamente indisponível. Tente novamente em instantes."
	case strings.Contains(s, "network") || strings.Contains(s, "connection") || strings.Contains(s, "timeout"):
		return "Sem conexão. Tente de novo quando tiver internet."
	case strings.Contains(s, "api key") || strings.Contains(s, "invalid") || strings.Contains(s, "401"):
		return "Erro de configuração do assistente. Tente mais tarde."
	default:
		return "Algo deu errado. Tente de novo ou use o menu para fazer a ação."
	}
}

func isContextDoneError(err error) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
		return true
	}
	s := strings.ToLower(err.Error())
	return strings.Contains(s, "context canceled") || strings.Contains(s, "deadline exceeded")
}

func (h *AssistenteLiveHandler) processTextInteraction(ctx context.Context, session *service.Session, ws *websocket.Conn, text string, turnID uint64) {
	defer session.FinishTurn(turnID)
	if !session.IsTurnActive(turnID) || ctx.Err() != nil {
		return
	}

	resp, err := session.SendMessage(ctx, genai.Text(text))
	if err != nil {
		if isContextDoneError(err) || !session.IsTurnActive(turnID) {
			return
		}
		slog.Error("Erro ao enviar mensagem para Gemini", "error", err)
		msg := friendlyErrorMessage(err)
		_ = session.WriteWSJSONForTurn(ws, turnID, gin.H{"type": "error", "content": msg})
		return
	}

	h.handleGeminiResponse(ctx, session, ws, resp, turnID)
}

func (h *AssistenteLiveHandler) handleGeminiResponse(ctx context.Context, session *service.Session, ws *websocket.Conn, resp *genai.GenerateContentResponse, turnID uint64) {
	if !session.IsTurnActive(turnID) || ctx.Err() != nil {
		return
	}

	for _, cand := range resp.Candidates {
		for _, part := range cand.Content.Parts {
			if !session.IsTurnActive(turnID) || ctx.Err() != nil {
				return
			}

			switch v := part.(type) {
			case genai.Text:
				// Enviar texto de volta para o frontend
				_ = session.WriteWSJSONForTurn(ws, turnID, gin.H{"type": "text", "content": string(v)})

			case genai.FunctionCall:
				// Executar a função e enviar o resultado de volta para o Gemini
				result, err := h.svc.ExecuteFunction(ctx, v, session.UserID, session.FazendaAtiva)
				if err != nil {
					if isContextDoneError(err) || !session.IsTurnActive(turnID) {
						return
					}
					slog.Error("Erro ao executar função", "function", v.Name, "error", err)
					// Informar erro ao Gemini
					h.processFunctionResponse(ctx, session, ws, v.Name, map[string]interface{}{"error": err.Error()}, turnID)
					continue
				}

				// Guardar redirect_path da resposta (para usar ao fechar) e remover do resultado enviado ao Gemini
				if m, ok := result.(map[string]any); ok {
					if path, _ := m["redirect_path"].(string); path != "" {
						session.RedirectPath = path
						delete(m, "redirect_path")
					}
					// Se for finalizar a conversa, avisar o frontend antes de enviar para o Gemini
					if m["status"] == "encerrar" {
						closePayload := gin.H{"type": "close", "content": m["mensagem"]}
						if session.RedirectPath != "" {
							closePayload["redirect"] = session.RedirectPath
						}
						_ = session.WriteWSJSONForTurn(ws, turnID, closePayload)
					}
				}

				h.processFunctionResponse(ctx, session, ws, v.Name, result, turnID)

			case genai.Blob:
				// Se o Gemini responder com áudio (Multimodal Live)
				if v.MIMEType == "audio/pcm" || v.MIMEType == "audio/wav" {
					_ = session.WriteWSMessageForTurn(ws, turnID, websocket.BinaryMessage, v.Data)
				}
			}
		}
	}
}

func (h *AssistenteLiveHandler) processFunctionResponse(ctx context.Context, session *service.Session, ws *websocket.Conn, name string, result interface{}, turnID uint64) {
	if !session.IsTurnActive(turnID) || ctx.Err() != nil {
		return
	}

	// Garantir que o resultado seja do tipo map[string]any esperado pelo genai.FunctionResponse
	var responseMap map[string]any

	switch v := result.(type) {
	case map[string]any:
		responseMap = v
	default:
		// Se não for um mapa, envolver em um mapa "result"
		// Isso lida com arrays, structs ou tipos primitivos
		data, _ := json.Marshal(result)
		json.Unmarshal(data, &responseMap)
	}

	slog.Info("Assistente Live: enviando resposta de função para Gemini", "name", name)

	resp, err := session.SendMessage(ctx, genai.FunctionResponse{
		Name:     name,
		Response: responseMap,
	})
	if err != nil {
		if isContextDoneError(err) || !session.IsTurnActive(turnID) {
			return
		}
		slog.Error("Erro ao enviar resposta de função para Gemini", "error", err)
		msg := friendlyErrorMessage(err)
		_ = session.WriteWSJSONForTurn(ws, turnID, gin.H{"type": "error", "content": msg})
		return
	}

	h.handleGeminiResponse(ctx, session, ws, resp, turnID)
}
