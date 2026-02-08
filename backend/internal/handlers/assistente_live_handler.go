package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/ceialmilk/api/internal/repository"
	"github.com/ceialmilk/api/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/google/generative-ai-go/genai"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Em produção, restringir ao domínio do frontend
	},
}

type AssistenteLiveHandler struct {
	svc      *service.AssistenteLiveService
	userRepo *repository.UsuarioRepository
}

func NewAssistenteLiveHandler(svc *service.AssistenteLiveService, userRepo *repository.UsuarioRepository) *AssistenteLiveHandler {
	return &AssistenteLiveHandler{svc: svc, userRepo: userRepo}
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
	ws, err := upgrader.Upgrade(c.Writer, c.Request, nil)
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

	slog.Info("Sessão Assistente Live iniciada com sucesso", "user_id", userID)
	
	// Enviar mensagem de boas-vindas IMEDIATAMENTE após iniciar a sessão
	welcomeMsg := gin.H{"type": "text", "content": "Olá! Sou o assistente do CeialMilk. Como posso ajudar você hoje?"}
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
			var msg map[string]interface{}
			if err := json.Unmarshal(p, &msg); err != nil {
				slog.Error("Erro ao decodificar JSON do frontend", "error", err)
				continue
			}

			if text, ok := msg["text"].(string); ok {
				// Rodar em uma goroutine para não travar o loop de leitura do WebSocket
				go h.processTextInteraction(context.Background(), session, ws, text)
			}
		}
	}
}

func (h *AssistenteLiveHandler) processTextInteraction(ctx context.Context, session *service.Session, ws *websocket.Conn, text string) {
	resp, err := session.SendMessage(ctx, genai.Text(text))
	if err != nil {
		slog.Error("Erro ao enviar mensagem para Gemini", "error", err)
		return
	}

	h.handleGeminiResponse(ctx, session, ws, resp)
}

func (h *AssistenteLiveHandler) handleGeminiResponse(ctx context.Context, session *service.Session, ws *websocket.Conn, resp *genai.GenerateContentResponse) {
	for _, cand := range resp.Candidates {
		for _, part := range cand.Content.Parts {
			switch v := part.(type) {
			case genai.Text:
				// Enviar texto de volta para o frontend
				session.WriteWSJSON(ws, gin.H{"type": "text", "content": string(v)})
			
			case genai.FunctionCall:
				// Executar a função e enviar o resultado de volta para o Gemini
				result, err := h.svc.ExecuteFunction(ctx, v, session.UserID, session.FazendaAtiva)
				if err != nil {
					slog.Error("Erro ao executar função", "function", v.Name, "error", err)
					// Informar erro ao Gemini
					h.processFunctionResponse(ctx, session, ws, v.Name, map[string]interface{}{"error": err.Error()})
					continue
				}
				
				// Se for finalizar a conversa, avisar o frontend antes de enviar para o Gemini
				if m, ok := result.(map[string]any); ok && m["status"] == "encerrar" {
					session.WriteWSJSON(ws, gin.H{"type": "close", "content": m["mensagem"]})
				}

				h.processFunctionResponse(ctx, session, ws, v.Name, result)

			case genai.Blob:
				// Se o Gemini responder com áudio (Multimodal Live)
				if v.MIMEType == "audio/pcm" || v.MIMEType == "audio/wav" {
					session.WriteWSMessage(ws, websocket.BinaryMessage, v.Data)
				}
			}
		}
	}
}

func (h *AssistenteLiveHandler) processFunctionResponse(ctx context.Context, session *service.Session, ws *websocket.Conn, name string, result interface{}) {
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
		slog.Error("Erro ao enviar resposta de função para Gemini", "error", err)
		return
	}
	
	h.handleGeminiResponse(ctx, session, ws, resp)
}
