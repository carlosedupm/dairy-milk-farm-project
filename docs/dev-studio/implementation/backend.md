# 🛠️ Guia de Implementação: Dev Studio Multi-Tenant

## 📋 Visão Geral

Este guia fornece exemplos práticos de código e configuração para implementar o Dev Studio como solução reutilizável para múltiplos projetos.

---

## 🏗️ Arquitetura Multi-Tenant

### Estrutura de Dados

```sql
-- Tabela de projetos configurados
CREATE TABLE dev_studio_projects (
    id BIGSERIAL PRIMARY KEY,
    project_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    config JSONB NOT NULL, -- Configuração completa do projeto
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de requests (multi-tenant)
CREATE TABLE dev_studio_requests (
    id BIGSERIAL PRIMARY KEY,
    project_id VARCHAR(100) NOT NULL REFERENCES dev_studio_projects(project_id),
    user_id BIGINT NOT NULL REFERENCES usuarios(id),
    prompt TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    code_changes JSONB,
    error TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_dev_studio_requests_project ON dev_studio_requests(project_id);
CREATE INDEX idx_dev_studio_requests_user ON dev_studio_requests(user_id);
```

---

## 🔧 Configuração por Projeto

### Modelo de Configuração

```go
// backend/internal/models/dev_studio_config.go
package models

type DevStudioProjectConfig struct {
    ProjectID string `json:"project_id"`
    Name      string `json:"name"`

    Git struct {
        Repo   string `json:"repo"`   // "github.com/user/repo"
        Branch string `json:"branch"` // "main"
        Token  string `json:"token"`  // GitHub token (armazenado criptografado)
    } `json:"git"`

    CICD struct {
        Type    string `json:"type"`    // "github_actions", "render", "vercel", "custom"
        Trigger string `json:"trigger"` // "push", "webhook"
        Webhook string `json:"webhook,omitempty"` // URL do webhook (se custom)
    } `json:"cicd"`

    Context struct {
        MemoryBankPath string   `json:"memory_bank_path"` // "memory-bank/"
        SystemPatterns string   `json:"system_patterns"`  // "memory-bank/systemPatterns.md"
        TechContext    string   `json:"tech_context"`     // "memory-bank/techContext.md"
        AdditionalFiles []string `json:"additional_files,omitempty"`
    } `json:"context"`

    Security struct {
        Sandbox        bool `json:"sandbox"`        // Executar em sandbox antes
        RequireApproval bool `json:"require_approval"` // Requer aprovação manual
        RateLimit      struct {
            RequestsPerHour int `json:"requests_per_hour"`
            TokensPerRequest int `json:"tokens_per_request"`
        } `json:"rate_limit"`
    } `json:"security"`

    Enabled bool `json:"enabled"`
}
```

### Exemplo de Configuração: CeialMilk

```json
{
  "project_id": "ceialmilk",
  "name": "CeialMilk",
  "git": {
    "repo": "github.com/seu-usuario/ceialmilk",
    "branch": "main",
    "token": "ghp_xxx" // Armazenado criptografado no banco
  },
  "cicd": {
    "type": "github_actions",
    "trigger": "push"
  },
  "context": {
    "memory_bank_path": "memory-bank/",
    "system_patterns": "memory-bank/systemPatterns.md",
    "tech_context": "memory-bank/techContext.md",
    "additional_files": ["AGENTS.md", "README.md"]
  },
  "security": {
    "sandbox": true,
    "require_approval": false,
    "rate_limit": {
      "requests_per_hour": 10,
      "tokens_per_request": 100000
    }
  },
  "enabled": true
}
```

### Exemplo de Configuração: Outro Projeto

```json
{
  "project_id": "meu-outro-projeto",
  "name": "Meu Outro Projeto",
  "git": {
    "repo": "github.com/seu-usuario/outro-projeto",
    "branch": "main",
    "token": "ghp_yyy"
  },
  "cicd": {
    "type": "vercel",
    "trigger": "webhook",
    "webhook": "https://api.vercel.com/v1/integrations/deploy/xxx"
  },
  "context": {
    "memory_bank_path": "docs/",
    "system_patterns": "docs/architecture.md",
    "tech_context": "docs/tech-stack.md"
  },
  "security": {
    "sandbox": true,
    "require_approval": true,
    "rate_limit": {
      "requests_per_hour": 5,
      "tokens_per_request": 50000
    }
  },
  "enabled": true
}
```

---

## 🤖 Integração com IA (Claude API)

### Service de IA

```go
// backend/internal/service/ai_service.go
package service

import (
    "context"
    "encoding/json"
    "fmt"
    "bytes"
    "net/http"
)

type AIService struct {
    apiKey    string
    baseURL   string
    model     string
}

func (s *AIService) GenerateCode(ctx context.Context, req CodeGenerationRequest) (*CodeGenerationResponse, error) {
    // 1. RAG Dinâmico: Selecionar apenas contexto relevante
    relevantContext := s.selectRelevantContext(req.Prompt, req.Context)

    // 2. Construir system prompt com contexto filtrado
    systemPrompt := buildSystemPrompt(req.SystemPatterns, req.TechContext, relevantContext)

    // ... restante da chamada ...
}

func (s *AIService) selectRelevantContext(prompt string, fullContext string) string {
    // Lógica para filtrar o memory-bank baseado em palavras-chave do prompt
    // Ex: se "animal" estiver no prompt, incluir models/animal.go
    return filteredContext
}
```

### 🧪 Validação Sintática (Sanity Check)

```go
// backend/internal/service/validator_service.go
package service

import (
    "go/parser"
    "go/token"
)

func (s *ValidatorService) ValidateGoSyntax(content string) error {
    fset := token.NewFileSet()
    _, err := parser.ParseFile(fset, "", content, parser.AllErrors)
    return err
}
```

### 📦 Sandbox Docker Efêmero

```go
// backend/internal/service/sandbox_service.go
func (s *SandboxService) RunInDocker(ctx context.Context, files map[string]string) error {
    // 1. Criar Dockerfile temporário
    // 2. Build image
    // 3. Run tests inside container
    // 4. Cleanup
    return nil
}
```

func buildSystemPrompt(systemPatterns, techContext, context string) string {
return fmt.Sprintf(`
Você é um assistente de desenvolvimento especializado em gerar código de alta qualidade.

Você deve:

1. Seguir rigorosamente os padrões arquiteturais documentados
2. Usar a stack tecnológica especificada
3. Manter consistência com o código existente
4. Gerar código seguro e testável
5. Incluir comentários quando necessário
6. Seguir as convenções de nomenclatura do projeto

PADRÕES ARQUITETURAIS:
%s

STACK TECNOLÓGICA:
%s

CONTEXTO DO PROJETO:
%s
`, systemPatterns, techContext, context)
}

````

---

## 🏖️ Integração com Sandbox (E2B)

### Service de Sandbox

```go
// backend/internal/service/sandbox_service.go
package service

import (
    "context"
    "encoding/json"
    "fmt"
    "bytes"
    "net/http"
    "time"
)

type SandboxService struct {
    apiKey  string
    baseURL string
}

func NewSandboxService(apiKey string) *SandboxService {
    return &SandboxService{
        apiKey:  apiKey,
        baseURL: "https://api.e2b.dev/v1",
    }
}

type SandboxExecutionResult struct {
    Success   bool   `json:"success"`
    Output    string `json:"output"`
    Error     string `json:"error,omitempty"`
    TestsPass bool   `json:"tests_pass"`
}

func (s *SandboxService) ExecuteCode(ctx context.Context, code string, language string) (*SandboxExecutionResult, result error) {
    // Criar sandbox
    sandboxID, err := s.createSandbox(ctx, language)
    if err != nil {
        return nil, err
    }
    defer s.deleteSandbox(ctx, sandboxID)

    // Escrever código no sandbox
    if err := s.writeFile(ctx, sandboxID, "generated_code."+getExtension(language), code); err != nil {
        return nil, err
    }

    // Executar código
    output, err := s.executeCommand(ctx, sandboxID, getRunCommand(language))
    if err != nil {
        return &SandboxExecutionResult{
            Success: false,
            Error:   err.Error(),
        }, nil
    }

    // Executar testes básicos (se existirem)
    testsPass := true
    if hasTests(code) {
        testOutput, testErr := s.executeCommand(ctx, sandboxID, getTestCommand(language))
        testsPass = testErr == nil && containsSuccess(testOutput)
    }

    return &SandboxExecutionResult{
        Success:   true,
        Output:    output,
        TestsPass: testsPass,
    }, nil
}

func (s *SandboxService) createSandbox(ctx context.Context, language string) (string, error) {
    templateID := getTemplateID(language) // "python", "node", "go", etc.

    payload := map[string]interface{}{
        "templateID": templateID,
    }

    // Implementar chamada à API E2B
    // Retornar sandbox ID
    return "sandbox_xxx", nil
}

func getTemplateID(language string) string {
    templates := map[string]string{
        "go":     "go",
        "python": "python3",
        "node":   "node",
        "typescript": "node",
    }
    return templates[language]
}

func getExtension(language string) string {
    extensions := map[string]string{
        "go":         "go",
        "python":     "py",
        "node":       "js",
        "typescript": "ts",
    }
    return extensions[language]
}

func getRunCommand(language string) string {
    commands := map[string]string{
        "go":         "go run generated_code.go",
        "python":     "python generated_code.py",
        "node":       "node generated_code.js",
        "typescript": "ts-node generated_code.ts",
    }
    return commands[language]
}

func getTestCommand(language string) string {
    commands := map[string]string{
        "go":         "go test ./...",
        "python":     "pytest",
        "node":       "npm test",
        "typescript": "npm test",
    }
    return commands[language]
}
````

---

## 🔀 Integração com Git

### Service de Git

```go
// backend/internal/service/git_service.go
package service

import (
    "context"
    "fmt"
    "os/exec"
    "os"
    "path/filepath"
    "io/ioutil"
)

type GitService struct {
    workDir string // Diretório temporário para clones
}

func NewGitService(workDir string) *GitService {
    return &GitService{workDir: workDir}
}

type GitChanges struct {
    Files map[string]string // path -> content
    Message string
}

func (s *GitService) ApplyChanges(ctx context.Context, config *models.DevStudioProjectConfig, changes GitChanges) error {
    // 1. Clonar repositório (ou usar existente)
    repoPath := filepath.Join(s.workDir, config.ProjectID)
    if err := s.cloneOrUpdate(ctx, config, repoPath); err != nil {
        return err
    }

    // 2. Aplicar mudanças nos arquivos
    for path, content := range changes.Files {
        fullPath := filepath.Join(repoPath, path)
        if err := os.MkdirAll(filepath.Dir(fullPath), 0755); err != nil {
            return err
        }
        if err := ioutil.WriteFile(fullPath, []byte(content), 0644); err != nil {
            return err
        }
    }

    // 3. Commit
    if err := s.commit(ctx, repoPath, changes.Message); err != nil {
        return err
    }

    // 4. Push
    if err := s.push(ctx, repoPath, config); err != nil {
        return err
    }

    return nil
}

func (s *GitService) cloneOrUpdate(ctx context.Context, config *models.DevStudioProjectConfig, repoPath string) error {
    if _, err := os.Stat(repoPath); os.IsNotExist(err) {
        // Clonar
        repoURL := fmt.Sprintf("https://%s@github.com/%s.git", config.Git.Token, config.Git.Repo)
        cmd := exec.CommandContext(ctx, "git", "clone", repoURL, repoPath)
        return cmd.Run()
    } else {
        // Atualizar
        cmd := exec.CommandContext(ctx, "git", "pull", "origin", config.Git.Branch)
        cmd.Dir = repoPath
        return cmd.Run()
    }
}

func (s *GitService) commit(ctx context.Context, repoPath, message string) error {
    // git add .
    cmd := exec.CommandContext(ctx, "git", "add", ".")
    cmd.Dir = repoPath
    if err := cmd.Run(); err != nil {
        return err
    }

    // git commit
    cmd = exec.CommandContext(ctx, "git", "commit", "-m", message)
    cmd.Dir = repoPath
    return cmd.Run()
}

func (s *GitService) push(ctx context.Context, repoPath string, config *models.DevStudioProjectConfig) error {
    // Configurar token
    repoURL := fmt.Sprintf("https://%s@github.com/%s.git", config.Git.Token, config.Git.Repo)
    cmd := exec.CommandContext(ctx, "git", "remote", "set-url", "origin", repoURL)
    cmd.Dir = repoPath
    if err := cmd.Run(); err != nil {
        return err
    }

    // git push
    cmd = exec.CommandContext(ctx, "git", "push", "origin", config.Git.Branch)
    cmd.Dir = repoPath
    return cmd.Run()
}
```

---

## 🚀 Handler Multi-Tenant

### Handler com Suporte a Múltiplos Projetos

```go
// backend/internal/handlers/dev_studio_handler.go
package handlers

import (
    "net/http"
    "github.com/ceialmilk/api/internal/service"
    "github.com/ceialmilk/api/internal/models"
    "github.com/ceialmilk/api/internal/response"
    "github.com/gin-gonic/gin"
)

type DevStudioHandler struct {
    devStudioSvc *service.DevStudioService
    projectRepo  *repository.DevStudioProjectRepository
}

// POST /api/v1/dev-studio/:project_id/chat
func (h *DevStudioHandler) Chat(c *gin.Context) {
    projectID := c.Param("project_id")
    userID := c.GetInt64("user_id")

    // Buscar configuração do projeto
    project, err := h.projectRepo.GetByID(c.Request.Context(), projectID)
    if err != nil {
        response.ErrorNotFound(c, "Projeto não encontrado")
        return
    }

    if !project.Enabled {
        response.ErrorForbidden(c, "Projeto desabilitado")
        return
    }

    var req struct {
        Prompt string `json:"prompt" binding:"required"`
    }
    if err := c.ShouldBindJSON(&req); err != nil {
        response.ErrorValidation(c, "Prompt obrigatório", err.Error())
        return
    }

    // Verificar rate limit
    if err := h.devStudioSvc.CheckRateLimit(c.Request.Context(), userID, projectID); err != nil {
        response.ErrorTooManyRequests(c, err.Error())
        return
    }

    // Carregar contexto do projeto
    context, err := h.devStudioSvc.LoadProjectContext(c.Request.Context(), project)
    if err != nil {
        response.ErrorInternal(c, "Erro ao carregar contexto", err.Error())
        return
    }

    // Gerar código com IA
    codeResponse, err := h.devStudioSvc.GenerateCode(c.Request.Context(), service.CodeGenerationRequest{
        Prompt:      req.Prompt,
        Context:     context.FullContext,
        SystemPatterns: context.SystemPatterns,
        TechContext: context.TechContext,
    })
    if err != nil {
        response.ErrorInternal(c, "Erro ao gerar código", err.Error())
        return
    }

    // Salvar request
    request, err := h.devStudioSvc.CreateRequest(c.Request.Context(), projectID, userID, req.Prompt, codeResponse)
    if err != nil {
        response.ErrorInternal(c, "Erro ao salvar request", err.Error())
        return
    }

    response.SuccessOK(c, gin.H{
        "request_id": request.ID,
        "code":       codeResponse,
        "status":     "pending",
    }, "Código gerado com sucesso")
}

// POST /api/v1/dev-studio/:project_id/implement/:request_id
func (h *DevStudioHandler) Implement(c *gin.Context) {
    projectID := c.Param("project_id")
    requestID := c.Param("request_id")
    userID := c.GetInt64("user_id")

    // Buscar request
    request, err := h.devStudioSvc.GetRequest(c.Request.Context(), requestID)
    if err != nil {
        response.ErrorNotFound(c, "Request não encontrado")
        return
    }

    if request.ProjectID != projectID {
        response.ErrorForbidden(c, "Request não pertence a este projeto")
        return
    }

    // Buscar configuração do projeto
    project, err := h.projectRepo.GetByID(c.Request.Context(), projectID)
    if err != nil {
        response.ErrorNotFound(c, "Projeto não encontrado")
        return
    }

    // Se require_approval, verificar se foi aprovado
    if project.Security.RequireApproval {
        // Verificar aprovação (implementar lógica)
    }

    // Executar em sandbox (se habilitado)
    if project.Security.Sandbox {
        sandboxResult, err := h.devStudioSvc.ExecuteInSandbox(c.Request.Context(), request.CodeChanges)
        if err != nil {
            response.ErrorInternal(c, "Erro ao executar em sandbox", err.Error())
            return
        }

        if !sandboxResult.Success {
            response.ErrorBadRequest(c, "Código falhou no sandbox", sandboxResult.Error)
            return
        }

        if !sandboxResult.TestsPass {
            response.ErrorBadRequest(c, "Testes falharam no sandbox", nil)
            return
        }
    }

    // Aplicar mudanças no Git
    if err := h.devStudioSvc.ApplyChanges(c.Request.Context(), project, request); err != nil {
        response.ErrorInternal(c, "Erro ao aplicar mudanças", err.Error())
        return
    }

    // Trigger CI/CD
    if err := h.devStudioSvc.TriggerCICD(c.Request.Context(), project); err != nil {
        // Log erro mas não falha (CI/CD pode ser automático via push)
    }

    // Atualizar status
    request.Status = "completed"
    h.devStudioSvc.UpdateRequest(c.Request.Context(), request)

    response.SuccessOK(c, gin.H{
        "request_id": request.ID,
        "status":     "completed",
        "message":    "Mudanças aplicadas e deploy iniciado",
    }, "Implementação concluída")
}
```

---

## 🔐 Segurança: Criptografia de Tokens

### Service de Criptografia

```go
// backend/internal/service/encryption_service.go
package service

import (
    "crypto/aes"
    "crypto/cipher"
    "crypto/rand"
    "encoding/base64"
    "io"
)

type EncryptionService struct {
    key []byte // 32 bytes para AES-256
}

func NewEncryptionService(key string) *EncryptionService {
    // Key deve ser de 32 bytes (256 bits)
    keyBytes := []byte(key)
    if len(keyBytes) < 32 {
        // Padding ou hash
    }
    return &EncryptionService{key: keyBytes[:32]}
}

func (s *EncryptionService) Encrypt(plaintext string) (string, error) {
    block, err := aes.NewCipher(s.key)
    if err != nil {
        return "", err
    }

    gcm, err := cipher.NewGCM(block)
    if err != nil {
        return "", err
    }

    nonce := make([]byte, gcm.NonceSize())
    if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
        return "", err
    }

    ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
    return base64.StdEncoding.EncodeToString(ciphertext), nil
}

func (s *EncryptionService) Decrypt(ciphertext string) (string, error) {
    data, err := base64.StdEncoding.DecodeString(ciphertext)
    if err != nil {
        return "", err
    }

    block, err := aes.NewCipher(s.key)
    if err != nil {
        return "", err
    }

    gcm, err := cipher.NewGCM(block)
    if err != nil {
        return "", err
    }

    nonceSize := gcm.NonceSize()
    nonce, ciphertext := data[:nonceSize], data[nonceSize:]

    plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
    if err != nil {
        return "", err
    }

    return string(plaintext), nil
}
```

---

## 📝 Exemplo de Uso Completo

### Fluxo Completo: Chat → Implementação → Deploy

```go
// Exemplo de uso completo
func ExampleFlow() {
    // 1. Desenvolvedor faz login e acessa /dev-studio/ceialmilk

    // 2. Desenvolvedor envia prompt
    // POST /api/v1/dev-studio/ceialmilk/chat
    // {
    //   "prompt": "Preciso adicionar um endpoint para listar animais de uma fazenda"
    // }

    // 3. Sistema:
    //    - Carrega contexto do CeialMilk (memory-bank)
    //    - Chama Claude API com contexto
    //    - Gera código (handler, service, repository)
    //    - Retorna preview

    // 4. Desenvolvedor aprova
    // POST /api/v1/dev-studio/ceialmilk/implement/123

    // 5. Sistema:
    //    - Executa código em sandbox (E2B)
    //    - Valida testes
    //    - Aplica mudanças no Git
    //    - Faz commit e push
    //    - Trigger CI/CD (GitHub Actions detecta push)

    // 6. CI/CD:
    //    - GitHub Actions roda testes
    //    - Render detecta push e faz deploy automático
    //    - Vercel detecta push e faz deploy automático

    // 7. Deploy concluído em produção!
}
```

---

## 🎯 Próximos Passos de Implementação

1. **Criar migração de banco** (tabelas dev_studio_projects, dev_studio_requests)
2. **Implementar EncryptionService** (para tokens Git)
3. **Implementar AIService** (integração Claude API)
4. **Implementar SandboxService** (integração E2B)
5. **Implementar GitService** (commit/push)
6. **Implementar DevStudioService** (orquestração)
7. **Implementar DevStudioHandler** (endpoints)
8. **Criar frontend** (página /dev-studio)

---

**Última atualização**: 2026-01-25  
**Status**: Guia de implementação prático
