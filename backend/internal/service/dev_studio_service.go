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
	"strings"
	"time"

	"github.com/ceialmilk/api/internal/models"
	"github.com/ceialmilk/api/internal/observability"
	"github.com/ceialmilk/api/internal/repository"
)

type DevStudioService struct {
	repo           *repository.DevStudioRepository
	geminiAPIKey   string
	memoryBankPath string
	githubService  *GitHubService
}

type CodeGenerationResponse struct {
	RequestID   int64                  `json:"request_id"`
	Files       map[string]string      `json:"files"`
	Explanation string                 `json:"explanation"`
	Status      string                 `json:"status"`
}

func NewDevStudioService(repo *repository.DevStudioRepository, geminiAPIKey, memoryBankPath string, githubService *GitHubService) *DevStudioService {
	return &DevStudioService{
		repo:           repo,
		geminiAPIKey:   geminiAPIKey,
		memoryBankPath: memoryBankPath,
		githubService: githubService,
	}
}

func (s *DevStudioService) GenerateCode(ctx context.Context, prompt string, userID int64) (*CodeGenerationResponse, error) {
	slog.Info("Gerando código com IA",
		"user_id", userID,
		"prompt_length", len(prompt),
	)

	// 1. Carregar contexto do projeto (RAG simples - todo memory-bank)
	context, err := s.loadProjectContext(ctx)
	if err != nil {
		observability.CaptureError(err, map[string]string{
			"action": "load_context",
		}, map[string]interface{}{
			"user_id":       userID,
			"prompt_length": len(prompt),
		})
		return nil, fmt.Errorf("erro ao carregar contexto: %w", err)
	}

	// 2. Chamar Gemini API
	codeResponse, err := s.callGeminiAPI(ctx, prompt, context)
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

func (s *DevStudioService) loadProjectContext(ctx context.Context) (string, error) {
	files := []string{
		"systemPatterns.md",
		"techContext.md",
		"activeContext.md",
		"progress.md",
		"productContext.md",
	}

	var contextBuilder strings.Builder
	contextBuilder.WriteString("# Contexto do Projeto CeialMilk\n\n")

	for _, file := range files {
		filePath := filepath.Join(s.memoryBankPath, file)
		content, err := os.ReadFile(filePath)
		if err != nil {
			slog.Warn("Erro ao carregar arquivo do memory-bank", "file", file, "error", err)
			continue
		}
		contextBuilder.WriteString(fmt.Sprintf("\n## %s\n\n%s\n", file, string(content)))
	}

	return contextBuilder.String(), nil
}

func (s *DevStudioService) callGeminiAPI(ctx context.Context, prompt string, projectContext string) (*CodeGenerationResponse, error) {
	fullPrompt := fmt.Sprintf(`Você é um desenvolvedor experiente trabalhando no projeto CeialMilk.

CONTEXTO DO PROJETO:
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

IMPORTANTE: Retorne APENAS o JSON, sem markdown, sem código blocks, sem explicações adicionais.`, projectContext, prompt)

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

func (s *DevStudioService) ValidateCode(ctx context.Context, requestID int64) error {
	request, err := s.repo.GetByID(ctx, requestID)
	if err != nil {
		return fmt.Errorf("erro ao buscar request: %w", err)
	}

	// Extrair files do code_changes
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

	// Validar cada arquivo
	for path, content := range files {
		ext := filepath.Ext(path)
		switch ext {
		case ".go":
			if err := s.validateSyntaxGo(content); err != nil {
				return fmt.Errorf("arquivo %s: %w", path, err)
			}
		case ".ts", ".tsx", ".js", ".jsx":
			// Validação básica de TypeScript/JavaScript
			if len(content) == 0 {
				return fmt.Errorf("arquivo %s está vazio", path)
			}
		}
	}

	// Atualizar status
	request.Status = "validated"
	if err := s.repo.Update(ctx, request); err != nil {
		return fmt.Errorf("erro ao atualizar request: %w", err)
	}

	// Registrar auditoria
	audit := &models.DevStudioAudit{
		RequestID: &requestID,
		UserID:    request.UserID,
		Action:    "validate",
		Details: map[string]interface{}{
			"request_id": requestID,
			"files_count": len(files),
		},
	}
	if err := s.repo.CreateAudit(ctx, audit); err != nil {
		slog.Warn("Erro ao criar auditoria", "error", err)
	}

	return nil
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

func (s *DevStudioService) GetStatus(ctx context.Context, requestID int64) (*models.DevStudioRequest, error) {
	return s.repo.GetByID(ctx, requestID)
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
