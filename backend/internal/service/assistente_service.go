package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/observability"
)

const (
	intentCadastrarFazenda = "cadastrar_fazenda"
	intentListarFazendas   = "listar_fazendas"
	intentEditarFazenda    = "editar_fazenda"
	intentExcluirFazenda   = "excluir_fazenda"
)

// InterpretRequest contém o texto digitado ou transcrito da voz.
type InterpretRequest struct {
	Texto string `json:"texto"`
}

// InterpretResponse é a resposta do endpoint interpretar (intent + payload + resumo para confirmação).
type InterpretResponse struct {
	Intent  string                 `json:"intent"`
	Payload map[string]interface{} `json:"payload"`
	Resumo  string                 `json:"resumo"`
}

// ExecutarRequest contém intent e payload já confirmados pelo usuário.
type ExecutarRequest struct {
	Intent  string                 `json:"intent"`
	Payload map[string]interface{} `json:"payload"`
}

type AssistenteService struct {
	geminiAPIKey string
	fazendaSvc   *FazendaService
}

func NewAssistenteService(geminiAPIKey string, fazendaSvc *FazendaService) *AssistenteService {
	return &AssistenteService{
		geminiAPIKey: geminiAPIKey,
		fazendaSvc:   fazendaSvc,
	}
}

// Interpretar envia o texto ao LLM (Gemini) e retorna intent, payload e resumo para confirmação.
func (s *AssistenteService) Interpretar(ctx context.Context, texto string) (*InterpretResponse, error) {
	texto = strings.TrimSpace(texto)
	if texto == "" {
		return nil, fmt.Errorf("texto é obrigatório")
	}

	prompt := fmt.Sprintf(`Você é um assistente do sistema CeialMilk (gestão de fazendas leiteiras).

A partir da frase do usuário abaixo, extraia a INTENÇÃO e os DADOS necessários.

Intenções possíveis:
- cadastrar_fazenda: quando o usuário quer registrar uma nova fazenda
- listar_fazendas: quando o usuário quer ver a lista de fazendas (ex: "listar fazendas", "quais minhas fazendas")
- editar_fazenda: quando o usuário quer alterar dados de uma fazenda existente (identifique por id ou nome)
- excluir_fazenda: quando o usuário quer excluir uma fazenda (identifique por id ou nome)

Para cadastrar_fazenda, extraia: nome, quantidadeVacas (number, 0 se não mencionado), fundacao (string YYYY ou YYYY-MM-DD), localizacao (opcional).

Para listar_fazendas, payload pode ser {} e resumo algo como "Listar fazendas cadastradas".

Para editar_fazenda, extraia: id (number) OU nome (string = nome ATUAL da fazenda para identificar/buscar); depois os campos a alterar: nomeNovo (string = novo nome quando o usuário quiser RENOMEAR, ex: "editar fazenda X para se chamar Y" -> nome:"X", nomeNovo:"Y"), quantidadeVacas (number), fundacao (string), localizacao (string). Use sempre nomeNovo quando o usuário pedir para mudar o nome; use nome apenas para identificar a fazenda quando não houver id.

Para excluir_fazenda, extraia: id (number) OU nome (string) para identificar a fazenda a excluir. Resumo: "Excluir a fazenda X." (deixe claro que é exclusão).

Retorne APENAS um JSON válido, sem markdown, sem explicações. Exemplos de formato:
- cadastrar: {"intent":"cadastrar_fazenda","payload":{"nome":"...","quantidadeVacas":0,"fundacao":"...","localizacao":"..."},"resumo":"Criar fazenda X com Y vacas, fundada em Z."}
- listar: {"intent":"listar_fazendas","payload":{},"resumo":"Listar fazendas cadastradas."}
- editar (só quantidade): {"intent":"editar_fazenda","payload":{"nome":"Sítio X","quantidadeVacas":30},"resumo":"Alterar fazenda Sítio X para 30 vacas."}
- editar (renomear): {"intent":"editar_fazenda","payload":{"nome":"Sítio X","nomeNovo":"Sítio Novo"},"resumo":"Renomear fazenda Sítio X para Sítio Novo."}
- editar (por id): {"intent":"editar_fazenda","payload":{"id":1,"nome":"Nome Novo"} ou {"id":1,"quantidadeVacas":10},"resumo":"Alterar fazenda (id 1)."}
- excluir: {"intent":"excluir_fazenda","payload":{"nome":"Sítio X"} ou {"id":1},"resumo":"Excluir a fazenda Sítio X."}

Se não for possível identificar a intenção ou dados suficientes: {"intent":"desconhecido","payload":{},"resumo":"Não foi possível entender o pedido."}

Frase do usuário:
%s`, texto)

	payload := map[string]interface{}{
		"contents": []map[string]interface{}{
			{
				"parts": []map[string]interface{}{
					{"text": prompt},
				},
			},
		},
	}
	jsonData, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("erro ao serializar payload: %w", err)
	}

	model := "gemini-2.0-flash"
	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1/models/%s:generateContent?key=%s", model, s.geminiAPIKey)
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("erro ao criar request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("erro ao chamar Gemini: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		if resp.StatusCode == http.StatusForbidden {
			msg := strings.ToLower(string(bodyBytes))
			if strings.Contains(msg, "leaked") || strings.Contains(msg, "reported") {
				return nil, fmt.Errorf("chave da API Gemini inválida ou vazada. Atualize GEMINI_API_KEY")
			}
		}
		if resp.StatusCode == http.StatusTooManyRequests {
			return nil, fmt.Errorf("quota da API Gemini excedida. Tente novamente mais tarde")
		}
		return nil, fmt.Errorf("erro na API Gemini: status %d", resp.StatusCode)
	}

	var geminiResp struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&geminiResp); err != nil {
		return nil, fmt.Errorf("erro ao decodificar resposta Gemini: %w", err)
	}
	if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
		return nil, fmt.Errorf("resposta vazia da API Gemini")
	}

	text := strings.TrimSpace(geminiResp.Candidates[0].Content.Parts[0].Text)
	text = cleanJSONResponse(text)

	var out InterpretResponse
	if err := json.Unmarshal([]byte(text), &out); err != nil {
		observability.CaptureError(err, map[string]string{"action": "assistente_interpret"}, nil)
		return nil, fmt.Errorf("não foi possível interpretar a resposta. Tente reformular o pedido")
	}

	if out.Intent == "" {
		out.Intent = "desconhecido"
	}
	if out.Payload == nil {
		out.Payload = make(map[string]interface{})
	}
	if out.Resumo == "" {
		out.Resumo = "Não foi possível entender o pedido."
	}

	return &out, nil
}

// Executar executa a ação conforme intent e payload (já confirmados pelo usuário).
func (s *AssistenteService) Executar(ctx context.Context, intent string, payload map[string]interface{}, userID int64) (interface{}, error) {
	switch intent {
	case intentCadastrarFazenda:
		return s.executarCadastrarFazenda(ctx, payload)
	case intentListarFazendas:
		return s.executarListarFazendas(ctx)
	case intentEditarFazenda:
		return s.executarEditarFazenda(ctx, payload)
	case intentExcluirFazenda:
		return s.executarExcluirFazenda(ctx, payload)
	default:
		return nil, fmt.Errorf("intent não suportado: %s", intent)
	}
}

func (s *AssistenteService) executarCadastrarFazenda(ctx context.Context, payload map[string]interface{}) (*models.Fazenda, error) {
	nome, _ := payload["nome"].(string)
	nome = strings.TrimSpace(nome)
	if nome == "" {
		return nil, fmt.Errorf("nome da fazenda é obrigatório")
	}

	quantidadeVacas := 0
	switch v := payload["quantidadeVacas"].(type) {
	case float64:
		quantidadeVacas = int(v)
	case int:
		quantidadeVacas = v
	}
	if quantidadeVacas < 0 {
		quantidadeVacas = 0
	}

	var localizacao *string
	if v, ok := payload["localizacao"].(string); ok && strings.TrimSpace(v) != "" {
		s := strings.TrimSpace(v)
		localizacao = &s
	}

	var fundacao *time.Time
	if v, ok := payload["fundacao"].(string); ok && strings.TrimSpace(v) != "" {
		t, err := parseFundacaoAssistente(strings.TrimSpace(v))
		if err != nil {
			slog.Warn("Data de fundação inválida no assistente", "value", v, "error", err)
		} else if t != nil {
			fundacao = t
		}
	}

	fazenda := &models.Fazenda{
		Nome:            nome,
		QuantidadeVacas: quantidadeVacas,
		Localizacao:     localizacao,
		Fundacao:        fundacao,
	}
	if err := s.fazendaSvc.Create(ctx, fazenda); err != nil {
		observability.CaptureError(err, map[string]string{"action": "assistente_executar_cadastrar_fazenda"}, nil)
		return nil, fmt.Errorf("erro ao criar fazenda: %w", err)
	}
	slog.Info("Fazenda criada via assistente", "fazenda_id", fazenda.ID, "nome", fazenda.Nome)
	return fazenda, nil
}

func (s *AssistenteService) executarListarFazendas(ctx context.Context) ([]*models.Fazenda, error) {
	list, err := s.fazendaSvc.GetAll(ctx)
	if err != nil {
		observability.CaptureError(err, map[string]string{"action": "assistente_executar_listar_fazendas"}, nil)
		return nil, fmt.Errorf("erro ao listar fazendas: %w", err)
	}
	slog.Info("Fazendas listadas via assistente", "count", len(list))
	return list, nil
}

// resolveFazendaByPayload retorna a fazenda identificada por id ou nome no payload.
func (s *AssistenteService) resolveFazendaByPayload(ctx context.Context, payload map[string]interface{}) (*models.Fazenda, error) {
	if idNum, ok := payload["id"].(float64); ok && idNum > 0 {
		id := int64(idNum)
		f, err := s.fazendaSvc.GetByID(ctx, id)
		if err != nil {
			return nil, fmt.Errorf("fazenda com ID %d não encontrada", id)
		}
		return f, nil
	}
	if nome, ok := payload["nome"].(string); ok && strings.TrimSpace(nome) != "" {
		list, err := s.fazendaSvc.SearchByNome(ctx, strings.TrimSpace(nome))
		if err != nil {
			return nil, fmt.Errorf("erro ao buscar fazenda por nome: %w", err)
		}
		if len(list) == 0 {
			return nil, fmt.Errorf("nenhuma fazenda encontrada com o nome \"%s\"", nome)
		}
		if len(list) > 1 {
			return nil, fmt.Errorf("mais de uma fazenda com nome parecido; use o ID para identificar")
		}
		return list[0], nil
	}
	return nil, fmt.Errorf("informe o id ou o nome da fazenda")
}

func (s *AssistenteService) executarEditarFazenda(ctx context.Context, payload map[string]interface{}) (*models.Fazenda, error) {
	fazenda, err := s.resolveFazendaByPayload(ctx, payload)
	if err != nil {
		return nil, err
	}
	if fazenda.ID <= 0 {
		return nil, fmt.Errorf("fazenda resolvida sem ID válido")
	}

	slog.Info("Assistente editar: fazenda resolvida", "id", fazenda.ID, "nome_atual", fazenda.Nome, "payload", payload)

	// Aplicar alterações do payload (campos opcionais)
	// Nome novo: use nomeNovo quando o usuário pedir para renomear; senão use nome apenas se identificou por id (payload tem id e nome = novo nome).
	if v, ok := payload["nomeNovo"].(string); ok && strings.TrimSpace(v) != "" {
		fazenda.Nome = strings.TrimSpace(v)
	} else if _, byID := payload["id"].(float64); byID {
		if v, ok := payload["nome"].(string); ok && strings.TrimSpace(v) != "" {
			fazenda.Nome = strings.TrimSpace(v)
		}
	}
	if v, ok := payload["quantidadeVacas"]; ok {
		switch n := v.(type) {
		case float64:
			fazenda.QuantidadeVacas = int(n)
		case int:
			fazenda.QuantidadeVacas = n
		}
	}
	if fazenda.QuantidadeVacas < 0 {
		fazenda.QuantidadeVacas = 0
	}
	if v, ok := payload["localizacao"].(string); ok {
		s := strings.TrimSpace(v)
		if s == "" {
			fazenda.Localizacao = nil
		} else {
			fazenda.Localizacao = &s
		}
	}
	if v, ok := payload["fundacao"].(string); ok && strings.TrimSpace(v) != "" {
		t, err := parseFundacaoAssistente(strings.TrimSpace(v))
		if err != nil {
			slog.Warn("Data de fundação inválida no assistente editar", "value", v, "error", err)
		} else if t != nil {
			fazenda.Fundacao = t
		}
	}

	if err := s.fazendaSvc.Update(ctx, fazenda); err != nil {
		observability.CaptureError(err, map[string]string{"action": "assistente_executar_editar_fazenda"}, nil)
		return nil, fmt.Errorf("erro ao atualizar fazenda: %w", err)
	}
	slog.Info("Fazenda editada via assistente", "fazenda_id", fazenda.ID, "nome", fazenda.Nome)
	return fazenda, nil
}

func (s *AssistenteService) executarExcluirFazenda(ctx context.Context, payload map[string]interface{}) (interface{}, error) {
	fazenda, err := s.resolveFazendaByPayload(ctx, payload)
	if err != nil {
		return nil, err
	}
	id := fazenda.ID
	nome := fazenda.Nome
	if err := s.fazendaSvc.Delete(ctx, id); err != nil {
		observability.CaptureError(err, map[string]string{"action": "assistente_executar_excluir_fazenda"}, nil)
		return nil, fmt.Errorf("erro ao excluir fazenda: %w", err)
	}
	slog.Info("Fazenda excluída via assistente", "fazenda_id", id, "nome", nome)
	return map[string]interface{}{"message": "Fazenda excluída com sucesso", "id": id}, nil
}

// parseFundacaoAssistente aceita "1998" ou "1998-01-01" e retorna *time.Time.
func parseFundacaoAssistente(s string) (*time.Time, error) {
	if s == "" {
		return nil, nil
	}
	// Apenas ano
	if regexp.MustCompile(`^\d{4}$`).MatchString(s) {
		t, err := time.Parse("2006", s)
		if err != nil {
			return nil, err
		}
		return &t, nil
	}
	// Data completa
	t, err := time.Parse("2006-01-02", s)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func cleanJSONResponse(text string) string {
	text = strings.TrimSpace(text)
	if strings.HasPrefix(text, "```json") {
		text = strings.TrimPrefix(text, "```json")
	}
	if strings.HasPrefix(text, "```") {
		text = strings.TrimPrefix(text, "```")
	}
	if strings.HasSuffix(text, "```") {
		text = strings.TrimSuffix(text, "```")
	}
	return strings.TrimSpace(text)
}
