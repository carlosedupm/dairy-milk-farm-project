package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"go/parser"
	"go/token"
	"io"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/observability"
	"github.com/ceialmilk/api/internal/repository"
)

const codeExampleMaxLines   = 150
const targetFileMaxLines    = 200

type DevStudioService struct {
	repo                 *repository.DevStudioRepository
	geminiAPIKey         string
	memoryBankPath       string
	githubService        *GitHubService
	githubContextBranch  string // branch de produção para contexto (ex.: main). Usado quando githubService != nil.
	linterService        *LinterService
}

type CodeGenerationResponse struct {
	RequestID   int64                  `json:"request_id"`
	Files       map[string]string      `json:"files"`
	Explanation string                 `json:"explanation"`
	Status      string                 `json:"status"`
}

// UsageStats contém métricas de uso do Dev Studio para exibição no frontend.
type UsageStats struct {
	UsedLastHour  int `json:"used_last_hour"`
	LimitPerHour  int `json:"limit_per_hour"`
	UsedToday     int `json:"used_today"`
}

func NewDevStudioService(repo *repository.DevStudioRepository, geminiAPIKey, memoryBankPath string, githubService *GitHubService, githubContextBranch string) *DevStudioService {
	if githubContextBranch == "" {
		githubContextBranch = "main"
	}
	return &DevStudioService{
		repo:                repo,
		geminiAPIKey:        geminiAPIKey,
		memoryBankPath:      memoryBankPath,
		githubService:       githubService,
		githubContextBranch: githubContextBranch,
		linterService:       NewLinterService(),
	}
}

func (s *DevStudioService) GenerateCode(ctx context.Context, prompt string, userID int64) (*CodeGenerationResponse, error) {
	slog.Info("Gerando código com IA",
		"user_id", userID,
		"prompt_length", len(prompt),
	)

	// 1. Carregar contexto do projeto (RAG dinâmico)
	files, err := s.loadProjectContext(ctx)
	if err != nil {
		observability.CaptureError(err, map[string]string{
			"action": "load_context",
		}, map[string]interface{}{
			"user_id":       userID,
			"prompt_length": len(prompt),
		})
		return nil, fmt.Errorf("erro ao carregar contexto: %w", err)
	}
	projectContext, included := s.selectRelevantContext(prompt, files)
	slog.Info("RAG dinâmico: arquivos incluídos no contexto",
		"user_id", userID,
		"files", included,
	)
	projectContext += s.loadCodeExamples(ctx)
	targetBlock, hasTargetFiles := s.loadTargetFilesForPrompt(ctx, prompt)
	projectContext += targetBlock

	// 2. Chamar Gemini API
	codeResponse, err := s.callGeminiAPI(ctx, prompt, projectContext, hasTargetFiles)
	if err != nil {
		observability.CaptureError(err, map[string]string{
			"action": "gemini_api",
		}, map[string]interface{}{
			"user_id":       userID,
			"prompt_length": len(prompt),
		})
		return nil, fmt.Errorf("erro ao chamar Gemini API: %w", err)
	}

	// 3. Salvar request no banco
	request := &models.DevStudioRequest{
		UserID:      userID,
		Prompt:      prompt,
		Status:      "pending",
		CodeChanges: make(map[string]interface{}),
	}

	// Converter files para formato JSONB
	request.CodeChanges["files"] = codeResponse.Files
	request.CodeChanges["explanation"] = codeResponse.Explanation

	if err := s.repo.CreateRequest(ctx, request); err != nil {
		return nil, fmt.Errorf("erro ao salvar request: %w", err)
	}

	// Registrar auditoria
	audit := &models.DevStudioAudit{
		RequestID: &request.ID,
		UserID:    userID,
		Action:    "chat",
		Details: map[string]interface{}{
			"prompt":       prompt,
			"files_count":  len(codeResponse.Files),
			"request_id":   request.ID,
		},
	}
	if err := s.repo.CreateAudit(ctx, audit); err != nil {
		slog.Warn("Erro ao criar auditoria", "error", err)
	}

	slog.Info("Código gerado com sucesso",
		"user_id", userID,
		"request_id", request.ID,
		"files_count", len(codeResponse.Files),
	)

	return &CodeGenerationResponse{
		RequestID:   request.ID,
		Files:       codeResponse.Files,
		Explanation: codeResponse.Explanation,
		Status:      "pending",
	}, nil
}

// loadProjectContext carrega os arquivos do memory-bank e retorna mapa nome -> conteúdo.
func (s *DevStudioService) loadProjectContext(ctx context.Context) (map[string]string, error) {
	names := []string{
		"systemPatterns.md",
		"techContext.md",
		"activeContext.md",
		"progress.md",
		"productContext.md",
		"projectbrief.md",
	}
	out := make(map[string]string)
	for _, name := range names {
		p := filepath.Join(s.memoryBankPath, name)
		content, err := os.ReadFile(p)
		if err != nil {
			slog.Warn("Erro ao carregar arquivo do memory-bank", "file", name, "error", err)
			continue
		}
		out[name] = string(content)
	}
	return out, nil
}

var stopwords = map[string]struct{}{
	"a": {}, "o": {}, "e": {}, "de": {}, "da": {}, "do": {}, "em": {}, "um": {}, "uma": {},
	"os": {}, "as": {}, "dos": {}, "das": {}, "no": {}, "na": {}, "ao": {}, "aos": {},
	"para": {}, "por": {}, "com": {}, "que": {}, "como": {}, "mais": {}, "mas": {}, "ou": {}, "se": {},
	"the": {}, "an": {}, "and": {}, "or": {}, "but": {}, "in": {}, "on": {}, "at": {}, "to": {},
	"for": {}, "of": {}, "with": {}, "by": {}, "is": {}, "are": {}, "was": {}, "were": {},
	"be": {}, "been": {}, "being": {}, "have": {}, "has": {}, "had": {}, "does": {}, "did": {},
	"will": {}, "would": {}, "could": {}, "should": {}, "may": {}, "might": {}, "must": {}, "can": {},
	"this": {}, "that": {}, "these": {}, "those": {}, "i": {}, "you": {}, "he": {}, "she": {}, "it": {}, "we": {}, "they": {},
}

func tokenize(text string) []string {
	text = strings.ToLower(text)
	re := regexp.MustCompile(`[a-z0-9áéíóúàèìòùâêîôûãõç]+`)
	raw := re.FindAllString(text, -1)
	var out []string
	for _, w := range raw {
		if len(w) < 2 {
			continue
		}
		if _, ok := stopwords[w]; ok {
			continue
		}
		out = append(out, w)
	}
	return out
}

func scoreDoc(tokens []string, content string) int {
	lower := strings.ToLower(content)
	var n int
	for _, t := range tokens {
		n += strings.Count(lower, t)
	}
	return n
}

// selectRelevantContext monta o contexto RAG: base fixa (systemPatterns, techContext) +
// até 2 docs variáveis (activeContext, progress, productContext, projectbrief) por relevância ao prompt.
// Se todos variáveis tiverem score 0, usa activeContext como fallback.
func (s *DevStudioService) selectRelevantContext(prompt string, files map[string]string) (string, []string) {
	base := []string{"systemPatterns.md", "techContext.md"}
	variable := []string{"activeContext.md", "progress.md", "productContext.md", "projectbrief.md"}
	tokens := tokenize(prompt)

	var included []string
	var b strings.Builder
	b.WriteString("# Contexto do Projeto CeialMilk\n\n")

	for _, name := range base {
		if c, ok := files[name]; ok {
			b.WriteString(fmt.Sprintf("\n## %s\n\n%s\n", name, c))
			included = append(included, name)
		}
	}

	type scored struct {
		name  string
		score int
	}
	var scoredVar []scored
	for _, name := range variable {
		c, ok := files[name]
		if !ok {
			continue
		}
		scoredVar = append(scoredVar, scored{name, scoreDoc(tokens, c)})
	}
	sort.Slice(scoredVar, func(i, j int) bool { return scoredVar[i].score > scoredVar[j].score })

	topN := 2
	added := 0
	for _, sv := range scoredVar {
		if added >= topN {
			break
		}
		if sv.score > 0 {
			c := files[sv.name]
			b.WriteString(fmt.Sprintf("\n## %s\n\n%s\n", sv.name, c))
			included = append(included, sv.name)
			added++
		}
	}
	if added == 0 {
		fallback := "activeContext.md"
		if c, ok := files[fallback]; ok {
			b.WriteString(fmt.Sprintf("\n## %s\n\n%s\n", fallback, c))
			included = append(included, fallback)
		}
	}

	return b.String(), included
}

// codeExampleFiles lista arquivos de referência (estrutura existente) para incluir no contexto da IA.
var codeExampleFiles = []string{
	"backend/internal/models/fazenda.go",
	"backend/internal/repository/fazenda_repository.go",
	"backend/internal/service/fazenda_service.go",
	"backend/internal/handlers/fazenda_handler.go",
	"backend/internal/response/response.go",
}

// loadCodeExamples carrega trechos dos arquivos de referência do projeto (handler, service, repository, model, response)
// e retorna um bloco "Código de exemplo" para anexar ao contexto. Limita a codeExampleMaxLines por arquivo.
// Se GitHub estiver configurado, usa sempre o estado da branch de produção (repositório); caso contrário, disco local.
func (s *DevStudioService) loadCodeExamples(ctx context.Context) string {
	var b strings.Builder
	b.WriteString("\n\n## Código de exemplo (estrutura existente do projeto)\n\n")
	b.WriteString("Use como referência para manter padrões (handler → service → repository, response.*, models).\n\n")

	for _, rel := range codeExampleFiles {
		var content string
		var err error
		if s.githubService != nil {
			content, err = s.githubService.GetFileContent(ctx, s.githubContextBranch, rel)
		} else {
			root := filepath.Dir(s.memoryBankPath)
			p := filepath.Join(root, filepath.FromSlash(rel))
			var raw []byte
			raw, err = os.ReadFile(p)
			content = string(raw)
		}
		if err != nil {
			slog.Warn("Dev Studio: erro ao carregar exemplo de código", "file", rel, "error", err)
			continue
		}
		lines := strings.Split(content, "\n")
		if len(lines) > codeExampleMaxLines {
			lines = lines[:codeExampleMaxLines]
			lines = append(lines, "// ... (truncado)")
		}
		trimmed := strings.TrimSpace(strings.Join(lines, "\n"))
		if trimmed == "" {
			continue
		}
		b.WriteString(fmt.Sprintf("### %s\n```go\n%s\n```\n\n", rel, trimmed))
	}

	if s.githubService != nil {
		slog.Info("Dev Studio: exemplos de código da branch de produção (GitHub)", "branch", s.githubContextBranch)
	}
	return b.String()
}

// targetFileRules mapeia keywords do prompt para arquivos cujo estado atual deve ser incluído no contexto (Cursor-like).
var targetFileRules = []struct {
	keywords []string
	files    []string
}{
	{[]string{"menu", "header", "navegação", "navegacao", "rota", "link", "dev-studio"}, []string{"frontend/src/components/layout/Header.tsx", "frontend/src/app/layout.tsx"}},
}

// loadTargetFilesForPrompt infere, a partir do prompt, arquivos que a tarefa pode alterar e retorna
// o bloco "Estado atual dos arquivos a editar" com o conteúdo atual. Retorna (bloco, true) se houve
// algum arquivo incluído; ( "", false ) caso contrário.
// Se GitHub estiver configurado, usa sempre o estado da branch de produção (repositório); caso contrário, disco local.
func (s *DevStudioService) loadTargetFilesForPrompt(ctx context.Context, prompt string) (string, bool) {
	lower := strings.ToLower(prompt)
	var toLoad []string
	for _, r := range targetFileRules {
		for _, kw := range r.keywords {
			if strings.Contains(lower, kw) {
				toLoad = append(toLoad, r.files...)
				break
			}
		}
	}
	if len(toLoad) == 0 {
		return "", false
	}
	seen := make(map[string]bool)
	var uniq []string
	for _, f := range toLoad {
		if !seen[f] {
			seen[f] = true
			uniq = append(uniq, f)
		}
	}

	var b strings.Builder
	b.WriteString("\n\n## Estado atual dos arquivos a editar (use como base; preserve o que não for pedido para alterar)\n\n")

	for _, rel := range uniq {
		var content string
		var err error
		if s.githubService != nil {
			content, err = s.githubService.GetFileContent(ctx, s.githubContextBranch, rel)
		} else {
			root := filepath.Dir(s.memoryBankPath)
			p := filepath.Join(root, filepath.FromSlash(rel))
			var raw []byte
			raw, err = os.ReadFile(p)
			content = string(raw)
		}
		if err != nil {
			slog.Warn("Dev Studio: erro ao carregar arquivo-alvo", "file", rel, "error", err)
			continue
		}
		lines := strings.Split(content, "\n")
		if len(lines) > targetFileMaxLines {
			lines = lines[:targetFileMaxLines]
			lines = append(lines, "// ... (truncado)")
		}
		trimmed := strings.TrimSpace(strings.Join(lines, "\n"))
		if trimmed == "" {
			continue
		}
		ext := filepath.Ext(rel)
		lang := "text"
		if ext == ".tsx" || ext == ".ts" {
			lang = "tsx"
			if ext == ".ts" && !strings.Contains(rel, ".tsx") {
				lang = "ts"
			}
		} else if ext == ".go" {
			lang = "go"
		}
		b.WriteString(fmt.Sprintf("### %s\n```%s\n%s\n```\n\n", rel, lang, trimmed))
	}

	out := b.String()
	if !strings.Contains(out, "```") {
		return "", false
	}
	slog.Info("Dev Studio: arquivos-alvo incluídos no contexto (Cursor-like)", "files", uniq, "from_github", s.githubService != nil, "branch", s.githubContextBranch)
	return out, true
}

func (s *DevStudioService) callGeminiAPI(ctx context.Context, prompt string, projectContext string, hasTargetFiles bool) (*CodeGenerationResponse, error) {
	ideRule := "Antes de gerar código, considere o contexto do projeto (docs, exemplos, estado atual dos arquivos). Trabalhe como um IDE: edite em cima do existente quando a tarefa envolver mudanças em arquivos já presentes no contexto; não descarte conteúdo existente sem motivo."
	baseRule := ""
	if hasTargetFiles {
		baseRule = "O bloco \"Estado atual dos arquivos a editar\" contém o código atual desses arquivos no projeto. Use-o como base: altere apenas o solicitado na tarefa e preserve todo o resto. Não remova nem reescreva código existente a menos que a tarefa peça explicitamente.\n\n"
	}
	instrucoes := baseRule + ideRule

	fullPrompt := fmt.Sprintf(`Você é um desenvolvedor experiente trabalhando no projeto CeialMilk.

CONTEXTO DO PROJETO:
%s

INSTRUÇÕES (comportamento tipo IDE):
%s

TAREFA SOLICITADA:
%s

Gere o código necessário seguindo os padrões documentados no contexto.
Retorne APENAS um JSON válido no seguinte formato:
{
  "files": {
    "path/to/file.go": "conteúdo completo do arquivo",
    "path/to/file.tsx": "conteúdo completo do arquivo"
  },
  "explanation": "explicação breve do que foi implementado"
}

IMPORTANTE: Retorne APENAS o JSON, sem markdown, sem código blocks, sem explicações adicionais.`, projectContext, instrucoes, prompt)

	payload := map[string]interface{}{
		"contents": []map[string]interface{}{
			{
				"parts": []map[string]interface{}{
					{
						"text": fullPrompt,
					},
				},
			},
		},
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("erro ao serializar payload: %w", err)
	}

	// Usar v1 (estável) em vez de v1beta para melhor compatibilidade
	// Modelos disponíveis: gemini-2.0-flash, gemini-2.5-flash, gemini-2.5-flash-lite
	// Para free tier, usar gemini-2.0-flash que tem melhor suporte
	model := "gemini-2.0-flash"
	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1/models/%s:generateContent?key=%s", model, s.geminiAPIKey)
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("erro ao criar request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{
		Timeout: 60 * time.Second,
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("erro ao fazer request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		
		// Tratamento específico para erro 403 (chave vazada)
		if resp.StatusCode == http.StatusForbidden {
			var geminiError struct {
				Error struct {
					Message string `json:"message"`
					Status  string `json:"status"`
					Code    int    `json:"code"`
				} `json:"error"`
			}
			if err := json.Unmarshal(bodyBytes, &geminiError); err == nil {
				messageLower := strings.ToLower(geminiError.Error.Message)
				if strings.Contains(messageLower, "leaked") || strings.Contains(messageLower, "reported") {
					return nil, fmt.Errorf("chave da API Gemini foi reportada como vazada. Gere uma nova chave em https://ai.google.dev/ e atualize GEMINI_API_KEY")
				}
			}
		}
		
		// Tratamento específico para erro 429 (quota excedida)
		if resp.StatusCode == http.StatusTooManyRequests {
			var geminiError struct {
				Error struct {
					Message string `json:"message"`
					Status  string `json:"status"`
				} `json:"error"`
			}
			if err := json.Unmarshal(bodyBytes, &geminiError); err == nil {
				return nil, fmt.Errorf("quota da API Gemini excedida: %s. Verifique sua conta no Google Cloud Console", geminiError.Error.Message)
			}
		}
		
		return nil, fmt.Errorf("erro na API Gemini: status %d, body: %s", resp.StatusCode, string(bodyBytes))
	}

	var geminiResponse struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&geminiResponse); err != nil {
		return nil, fmt.Errorf("erro ao decodificar resposta: %w", err)
	}

	if len(geminiResponse.Candidates) == 0 || len(geminiResponse.Candidates[0].Content.Parts) == 0 {
		return nil, fmt.Errorf("resposta vazia da API Gemini")
	}

	codeText := geminiResponse.Candidates[0].Content.Parts[0].Text

	// Limpar markdown code blocks se existirem
	codeText = strings.TrimSpace(codeText)
	if strings.HasPrefix(codeText, "```json") {
		codeText = strings.TrimPrefix(codeText, "```json")
	}
	if strings.HasPrefix(codeText, "```") {
		codeText = strings.TrimPrefix(codeText, "```")
	}
	if strings.HasSuffix(codeText, "```") {
		codeText = strings.TrimSuffix(codeText, "```")
	}
	codeText = strings.TrimSpace(codeText)

	// Parsear JSON
	var codeData struct {
		Files       map[string]string `json:"files"`
		Explanation string            `json:"explanation"`
	}

	if err := json.Unmarshal([]byte(codeText), &codeData); err != nil {
		return nil, fmt.Errorf("erro ao parsear JSON da resposta: %w, texto recebido: %s", err, codeText)
	}

	return &CodeGenerationResponse{
		Files:       codeData.Files,
		Explanation: codeData.Explanation,
		Status:      "pending",
	}, nil
}

// RefineCode regenera o código a partir do feedback do usuário (ex.: divergência da estrutura do projeto).
// Atualiza o request existente com o novo código e reseta status para "pending"; limpa PR se houver.
func (s *DevStudioService) RefineCode(ctx context.Context, requestID int64, userID int64, feedback string) (*CodeGenerationResponse, error) {
	request, err := s.repo.GetByID(ctx, requestID)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar request: %w", err)
	}
	if request.UserID != userID {
		return nil, fmt.Errorf("request não pertence ao usuário")
	}

	// Extrair código atual
	filesInterface, ok := request.CodeChanges["files"]
	if !ok {
		return nil, fmt.Errorf("código não encontrado no request")
	}
	filesMap, ok := filesInterface.(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("formato de files inválido")
	}
	files := make(map[string]string)
	for path, c := range filesMap {
		v, ok := c.(string)
		if !ok {
			continue
		}
		files[path] = v
	}

	// Montar descrição do código atual (paths + trechos)
	var b strings.Builder
	for path, content := range files {
		b.WriteString(fmt.Sprintf("\n--- %s ---\n%s\n", path, content))
	}
	currentCode := b.String()

	// RAG: contexto por prompt + feedback
	mb, err := s.loadProjectContext(ctx)
	if err != nil {
		observability.CaptureError(err, map[string]string{"action": "load_context_refine"}, map[string]interface{}{"request_id": requestID})
		return nil, fmt.Errorf("erro ao carregar contexto: %w", err)
	}
	combined := request.Prompt + " " + feedback
	projectContext, included := s.selectRelevantContext(combined, mb)
	slog.Info("RAG dinâmico (refine): arquivos incluídos", "request_id", requestID, "files", included)
	projectContext += s.loadCodeExamples(ctx)
	targetBlock, hasTargetFiles := s.loadTargetFilesForPrompt(ctx, combined)
	projectContext += targetBlock

	refinePrompt := fmt.Sprintf(`REFINAMENTO DE CÓDIGO

O usuário pediu originalmente:
"""
%s
"""

Foi gerado o seguinte código (que o usuário considera divergente da estrutura do projeto):
%s

FEEDBACK DO USUÁRIO (o que corrigir):
"""
%s
"""

Gere o código CORRIGIDO seguindo rigorosamente os padrões do projeto (handlers, services, response, etc.).
Mantenha a mesma funcionalidade solicitada, mas ajuste estrutura, nomenclatura e padrões conforme o feedback.
Retorne APENAS um JSON válido:
{
  "files": {
    "path/to/file.go": "conteúdo completo do arquivo",
    ...
  },
  "explanation": "explicação breve das correções aplicadas"
}

IMPORTANTE: Retorne APENAS o JSON, sem markdown, sem blocos de código, sem texto extra.`, request.Prompt, currentCode, feedback)

	codeResponse, err := s.callGeminiAPI(ctx, refinePrompt, projectContext, hasTargetFiles)
	if err != nil {
		observability.CaptureError(err, map[string]string{"action": "gemini_refine"}, map[string]interface{}{"request_id": requestID, "user_id": userID})
		return nil, fmt.Errorf("erro ao refinar código: %w", err)
	}

	// Atualizar request: novo código, status pending, limpar PR
	request.CodeChanges["files"] = codeResponse.Files
	request.CodeChanges["explanation"] = codeResponse.Explanation
	request.Status = "pending"
	request.PRNumber = nil
	request.PRURL = nil
	request.BranchName = nil
	request.Error = nil

	if err := s.repo.Update(ctx, request); err != nil {
		return nil, fmt.Errorf("erro ao atualizar request: %w", err)
	}

	audit := &models.DevStudioAudit{
		RequestID: &requestID,
		UserID:    userID,
		Action:    "refine",
		Details: map[string]interface{}{
			"request_id":   requestID,
			"feedback_len": len(feedback),
			"files_count":  len(codeResponse.Files),
		},
	}
	if err := s.repo.CreateAudit(ctx, audit); err != nil {
		slog.Warn("Erro ao criar auditoria (refine)", "error", err)
	}

	slog.Info("Código refinado com sucesso", "request_id", requestID, "user_id", userID)
	return &CodeGenerationResponse{
		RequestID:   request.ID,
		Files:       codeResponse.Files,
		Explanation: codeResponse.Explanation,
		Status:      "pending",
	}, nil
}

// ValidationResult contém resultados da validação incluindo linter
type ValidationResult struct {
	SyntaxValid   bool                      `json:"syntax_valid"`
	LinterResults map[string]*LinterResult  `json:"linter_results"`
	HasErrors     bool                      `json:"has_errors"`
	HasWarnings   bool                      `json:"has_warnings"`
}

// ValidateCode valida código sintaticamente e com linter, retornando ValidationResult
func (s *DevStudioService) ValidateCode(ctx context.Context, requestID int64) (*ValidationResult, error) {
	request, err := s.repo.GetByID(ctx, requestID)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar request: %w", err)
	}

	// Extrair files do code_changes
	filesInterface, ok := request.CodeChanges["files"]
	if !ok {
		return nil, fmt.Errorf("código não encontrado no request")
	}

	filesMap, ok := filesInterface.(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("formato de files inválido")
	}

	// Converter para map[string]string
	files := make(map[string]string)
	for path, contentInterface := range filesMap {
		content, ok := contentInterface.(string)
		if !ok {
			return nil, fmt.Errorf("conteúdo do arquivo %s inválido", path)
		}
		files[path] = content
	}

	result := &ValidationResult{
		SyntaxValid:   true,
		LinterResults: make(map[string]*LinterResult),
		HasErrors:     false,
		HasWarnings:   false,
	}

	// Validar sintaxe e executar linter para cada arquivo
	for path, content := range files {
		ext := filepath.Ext(path)
		syntaxValid := true

		// Validação sintática básica
		switch ext {
		case ".go":
			if err := s.validateSyntaxGo(content); err != nil {
				result.SyntaxValid = false
				syntaxValid = false
				result.LinterResults[path] = &LinterResult{
					File:    path,
					Errors:  []string{fmt.Sprintf("Erro de sintaxe: %v", err)},
					Success: false,
				}
				result.HasErrors = true
				continue
			}
		case ".ts", ".tsx", ".js", ".jsx":
			// Validação básica de TypeScript/JavaScript
			if len(content) == 0 {
				result.SyntaxValid = false
				syntaxValid = false
				result.LinterResults[path] = &LinterResult{
					File:    path,
					Errors:  []string{"Arquivo está vazio"},
					Success: false,
				}
				result.HasErrors = true
				continue
			}
		}

		// Se sintaxe válida, executar linter
		if syntaxValid {
			linterResult, err := s.linterService.RunLinter(ctx, path, content)
			if err != nil {
				slog.Warn("Erro ao executar linter", "path", path, "error", err)
				// Continuar mesmo se linter falhar
				linterResult = &LinterResult{
					File:    path,
					Errors:  []string{fmt.Sprintf("Erro ao executar linter: %v", err)},
					Success: false,
				}
			}

			result.LinterResults[path] = linterResult

			if len(linterResult.Errors) > 0 {
				result.HasErrors = true
			}
			if len(linterResult.Warnings) > 0 {
				result.HasWarnings = true
			}
		}
	}

	// Atualizar status apenas se não houver erros
	if result.SyntaxValid && !result.HasErrors {
		request.Status = "validated"
		if err := s.repo.Update(ctx, request); err != nil {
			return nil, fmt.Errorf("erro ao atualizar request: %w", err)
		}
	}

	// Registrar auditoria
	audit := &models.DevStudioAudit{
		RequestID: &requestID,
		UserID:    request.UserID,
		Action:    "validate",
		Details: map[string]interface{}{
			"request_id":     requestID,
			"files_count":     len(files),
			"syntax_valid":    result.SyntaxValid,
			"has_errors":      result.HasErrors,
			"has_warnings":    result.HasWarnings,
		},
	}
	if err := s.repo.CreateAudit(ctx, audit); err != nil {
		slog.Warn("Erro ao criar auditoria", "error", err)
	}

	return result, nil
}

func (s *DevStudioService) validateSyntaxGo(code string) error {
	fset := token.NewFileSet()
	_, err := parser.ParseFile(fset, "", code, parser.ParseComments)
	if err != nil {
		return fmt.Errorf("erro de sintaxe Go: %w", err)
	}
	return nil
}

func (s *DevStudioService) GetHistory(ctx context.Context, userID int64) ([]*models.DevStudioRequest, error) {
	return s.repo.GetByUserID(ctx, userID)
}

// GetUsage retorna métricas de uso do Dev Studio (última hora e hoje).
func (s *DevStudioService) GetUsage(ctx context.Context, userID int64) (*UsageStats, error) {
	now := time.Now()
	oneHourAgo := now.Add(-1 * time.Hour)
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

	usedLastHour, err := s.repo.CountByUserSince(ctx, userID, oneHourAgo)
	if err != nil {
		return nil, fmt.Errorf("erro ao contar uso da última hora: %w", err)
	}
	usedToday, err := s.repo.CountByUserSince(ctx, userID, startOfDay)
	if err != nil {
		return nil, fmt.Errorf("erro ao contar uso de hoje: %w", err)
	}

	return &UsageStats{
		UsedLastHour: usedLastHour,
		LimitPerHour: 5,
		UsedToday:    usedToday,
	}, nil
}

func (s *DevStudioService) GetStatus(ctx context.Context, requestID int64) (*models.DevStudioRequest, error) {
	return s.repo.GetByID(ctx, requestID)
}

// FileDiff representa a diferença entre código atual e código gerado
type FileDiff struct {
	Path    string `json:"path"`
	OldCode string `json:"old_code"` // código atual do repositório
	NewCode string `json:"new_code"`  // código gerado
	IsNew   bool   `json:"is_new"`   // true se arquivo não existe ainda
}

// GetFileDiffs retorna diffs entre código gerado e código atual do repositório
func (s *DevStudioService) GetFileDiffs(ctx context.Context, requestID int64) ([]FileDiff, error) {
	// 1. Buscar request
	request, err := s.repo.GetByID(ctx, requestID)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar request: %w", err)
	}

	// 2. Extrair files do code_changes
	filesInterface, ok := request.CodeChanges["files"]
	if !ok {
		return nil, fmt.Errorf("código não encontrado no request")
	}

	filesMap, ok := filesInterface.(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("formato de files inválido")
	}

	// Converter para map[string]string
	files := make(map[string]string)
	for path, contentInterface := range filesMap {
		content, ok := contentInterface.(string)
		if !ok {
			return nil, fmt.Errorf("conteúdo do arquivo %s inválido", path)
		}
		files[path] = content
	}

	// 3. Para cada arquivo, buscar conteúdo atual do GitHub (se configurado)
	diffs := make([]FileDiff, 0, len(files))
	for path, newCode := range files {
		diff := FileDiff{
			Path:    path,
			NewCode: newCode,
			IsNew:   true,
		}

		// Tentar buscar arquivo atual do GitHub
		if s.githubService != nil {
			oldCode, err := s.githubService.GetFileContent(ctx, s.githubContextBranch, path)
			if err == nil {
				// Arquivo existe no repositório
				diff.OldCode = oldCode
				diff.IsNew = false
			} else {
				// Arquivo não existe (é novo) ou erro ao buscar
				// Se for erro de "não encontrado", manter IsNew = true
				// Se for outro erro, logar mas continuar
				if !strings.Contains(err.Error(), "404") && !strings.Contains(err.Error(), "não encontrado") {
					slog.Warn("Erro ao buscar arquivo do GitHub para diff", "path", path, "error", err)
				}
			}
		}

		diffs = append(diffs, diff)
	}

	return diffs, nil
}

func (s *DevStudioService) Implement(ctx context.Context, requestID int64) error {
	// 1. Buscar request por ID
	request, err := s.repo.GetByID(ctx, requestID)
	if err != nil {
		return fmt.Errorf("erro ao buscar request: %w", err)
	}

	// 2. Validar que status é "validated"
	if request.Status != "validated" {
		return fmt.Errorf("código deve estar validado antes de criar PR. Status atual: %s", request.Status)
	}

	// 3. Verificar se GitHub Service está configurado
	if s.githubService == nil {
		return fmt.Errorf("GitHub não configurado. Configure GITHUB_TOKEN e GITHUB_REPO")
	}

	// 4. Extrair code_changes (files)
	filesInterface, ok := request.CodeChanges["files"]
	if !ok {
		return fmt.Errorf("código não encontrado no request")
	}

	filesMap, ok := filesInterface.(map[string]interface{})
	if !ok {
		return fmt.Errorf("formato de files inválido")
	}

	// Converter para map[string]string
	files := make(map[string]string)
	for path, contentInterface := range filesMap {
		content, ok := contentInterface.(string)
		if !ok {
			return fmt.Errorf("conteúdo do arquivo %s inválido", path)
		}
		files[path] = content
	}

	// 5. Gerar nome de branch único
	branchName := fmt.Sprintf("dev-studio/request-%d-%d", requestID, time.Now().Unix())

	// 6. Gerar título e body do PR
	explanation := ""
	if exp, ok := request.CodeChanges["explanation"].(string); ok {
		explanation = exp
	}

	prTitle := fmt.Sprintf("Dev Studio: %s", request.Prompt)
	if len(prTitle) > 100 {
		prTitle = prTitle[:97] + "..."
	}

	prBody := fmt.Sprintf("Código gerado via Dev Studio\n\n**Prompt:** %s\n\n**Explicação:** %s\n\n**Request ID:** %d", 
		request.Prompt, explanation, requestID)

	// 7. Chamar GitHubService.CreatePR()
	pr, err := s.githubService.CreatePR(ctx, branchName, files, prTitle, prBody)
	if err != nil {
		observability.CaptureError(err, map[string]string{
			"action":     "create_pr",
			"request_id": fmt.Sprintf("%d", requestID),
		}, map[string]interface{}{
			"request_id": requestID,
			"branch":     branchName,
			"files_count": len(files),
		})
		return fmt.Errorf("erro ao criar Pull Request: %w", err)
	}

	// 8. Atualizar request com PR info
	prNumber := int64(pr.Number)
	request.PRNumber = &prNumber
	request.PRURL = &pr.URL
	request.BranchName = &branchName
	request.Status = "implemented"

	if err := s.repo.Update(ctx, request); err != nil {
		return fmt.Errorf("erro ao atualizar request: %w", err)
	}

	// 9. Registrar auditoria
	audit := &models.DevStudioAudit{
		RequestID: &requestID,
		UserID:    request.UserID,
		Action:    "implement",
		Details: map[string]interface{}{
			"request_id": requestID,
			"pr_number":  pr.Number,
			"pr_url":     pr.URL,
			"branch":     branchName,
			"files_count": len(files),
		},
	}
	if err := s.repo.CreateAudit(ctx, audit); err != nil {
		slog.Warn("Erro ao criar auditoria", "error", err)
	}

	slog.Info("Pull Request criado com sucesso",
		"request_id", requestID,
		"pr_number", pr.Number,
		"pr_url", pr.URL,
		"branch", branchName,
	)

	return nil
}
