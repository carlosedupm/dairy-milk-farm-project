# 🚀 Proposta: Dev Studio - Área de Desenvolvimento Interativa em Produção

## 📋 Visão Geral

Implementar uma área específica no sistema em produção onde desenvolvedores autenticados possam interagir com um agente de IA para implementar features diretamente no ambiente de produção, seguindo a esteira de deploy automatizada.

## 🎯 Objetivos

1. **Área Exclusiva**: Interface protegida apenas para perfil `DEVELOPER`
2. **Interação Natural**: Chat com IA para descrever features em linguagem natural
3. **Validação Ativa**: Código validado sintaticamente antes de qualquer aplicação
4. **Fluxo de PR Seguro**: Criação automática de Pull Requests em vez de push direto na main
5. **Implementação Automática**: Código gerado e aplicado em branch efêmera
6. **Deploy Automático**: Integração com CI/CD para deploy via branch de staging/PR
7. **Auditoria Completa**: Log de todas as ações realizadas, incluindo diff hashes
8. **Análise de Impacto**: Visualização clara do que será alterado antes da aprovação

## 🏗️ Arquitetura Proposta

### Componentes Principais

```
┌─────────────────────────────────────────────────────────┐
│              Frontend (Next.js)                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  /dev-studio (ProtectedRoute - perfil DEVELOPER) │  │
│  │  - Chat Interface (IA + Análise de Impacto)      │  │
│  │  - Diff Viewer (Preview Realista)                 │  │
│  │  - Status de Deploy / PR                          │  │
│  │  - Histórico de Mudanças                           │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                        ↕ HTTP/REST
┌─────────────────────────────────────────────────────────┐
│              Backend (Go)                                │
│  ┌───────────────────────────────────────────────────┐  │
│  │  /api/v1/dev-studio/*                             │  │
│  │  - POST /chat (IA com RAG Dinâmico)               │  │
│  │  - POST /validate (Syntax Check / Sanity)         │  │
│  │  - POST /implement (Criar Branch/PR)              │  │
│  │  - GET /history (Audit com Diff Hash)             │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                        ↕
┌─────────────────────────────────────────────────────────┐
│         Dev Studio Service (Go)                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  - Claude/OpenAI/Gemini API Integration           │  │
│  │  - Code Generation & Parsing Validation           │  │
│  │  - Git Operations (Branch, Commit, PR)            │  │
│  │  - Ephemeral Docker Sandbox Testing               │  │
│  │  - Audit Logging (Diff Hashes)                    │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                        ↕
┌─────────────────────────────────────────────────────────┐
│         External Services                                │
│  - Claude API / OpenAI API                              │
│  - GitHub API (para commits/push)                       │
│  - Render API (para deploy)                             │
│  - Vercel API (para deploy frontend)                   │
└─────────────────────────────────────────────────────────┘
```

## 🔐 Segurança

### Controle de Acesso

1. **Perfil DEVELOPER**: Novo perfil no sistema (`Usuario.Perfil = "DEVELOPER"`)
2. **Middleware de Autorização**: Verificar perfil antes de acessar rotas `/api/v1/dev-studio/*`
3. **Rate Limiting**: Limitar requisições por desenvolvedor (5 req/hora no MVP, pode aumentar para 10/hora após validação)
4. **Aprovação Manual**: Opção de requerer aprovação antes de deploy em produção
5. **Sandbox**: Executar código em ambiente isolado antes de aplicar

### Auditoria

- Todas as ações registradas em tabela `dev_studio_audit`
- Logs incluem: usuário, timestamp, comando, código gerado, resultado
- Histórico completo de mudanças aplicadas

## 📦 Implementação Técnica

### 1. Backend (Go)

#### Novos Modelos

```go
// backend/internal/models/dev_studio.go
type DevStudioRequest struct {
    ID          int64                  `json:"id" db:"id"`
    UserID      int64                  `json:"user_id" db:"user_id"`
    Prompt      string                 `json:"prompt" db:"prompt"`
    Status      string                 `json:"status" db:"status"` // pending, processing, completed, failed
    CodeChanges map[string]interface{} `json:"code_changes" db:"code_changes"` // JSONB com mudanças
    Error       *string                `json:"error,omitempty" db:"error"`
    CreatedAt   time.Time              `json:"created_at" db:"created_at"`
    UpdatedAt   time.Time              `json:"updated_at" db:"updated_at"`
}

type DevStudioAudit struct {
    ID          int64     `json:"id" db:"id"`
    RequestID   int64     `json:"request_id" db:"request_id"`
    UserID      int64     `json:"user_id" db:"user_id"`
    Action      string    `json:"action" db:"action"` // chat, implement, deploy
    Details     string    `json:"details" db:"details"` // JSON
    DiffHash    string    `json:"diff_hash" db:"diff_hash"` // Hash do commit/PR
    CreatedAt   time.Time `json:"created_at" db:"created_at"`
}
```

#### Novo Handler

```go
// backend/internal/handlers/dev_studio_handler.go
package handlers

import (
    "github.com/ceialmilk/api/internal/observability"
    "github.com/ceialmilk/api/internal/response"
    "github.com/ceialmilk/api/internal/service"
    "github.com/gin-gonic/gin"
)

type DevStudioHandler struct {
    devStudioSvc *service.DevStudioService
}

// POST /api/v1/dev-studio/chat
func (h *DevStudioHandler) Chat(c *gin.Context) {
    var req struct {
        Prompt string `json:"prompt" binding:"required"`
    }
    
    if err := c.ShouldBindJSON(&req); err != nil {
        response.ErrorValidation(c, "Dados inválidos", err.Error())
        return
    }
    
    userID := c.GetInt64("user_id")
    
    // Verificar perfil DEVELOPER
    perfil := c.GetString("perfil")
    if perfil != "DEVELOPER" {
        response.ErrorForbidden(c, "Acesso negado. Perfil DEVELOPER necessário.")
        return
    }
    
    // Gerar código com Gemini API
    codeResponse, err := h.devStudioSvc.GenerateCode(c.Request.Context(), req.Prompt, userID)
    if err != nil {
        // Integrar com Sentry para captura de erros
        observability.CaptureError(err, map[string]interface{}{
            "user_id": userID,
            "prompt":  req.Prompt,
        })
        response.ErrorInternal(c, "Erro ao gerar código", err.Error())
        return
    }
    
    response.SuccessOK(c, codeResponse, "Código gerado com sucesso")
}

// POST /api/v1/dev-studio/implement
func (h *DevStudioHandler) Implement(c *gin.Context) {
    var req struct {
        RequestID int64 `json:"request_id" binding:"required"`
    }
    
    if err := c.ShouldBindJSON(&req); err != nil {
        response.ErrorValidation(c, "Dados inválidos", err.Error())
        return
    }
    
    userID := c.GetInt64("user_id")
    
    // Aplicar mudanças
    result, err := h.devStudioSvc.ApplyChanges(c.Request.Context(), req.RequestID, userID)
    if err != nil {
        observability.CaptureError(err, map[string]interface{}{
            "user_id":    userID,
            "request_id": req.RequestID,
        })
        response.ErrorInternal(c, "Erro ao aplicar mudanças", err.Error())
        return
    }
    
    response.SuccessOK(c, result, "Mudanças aplicadas com sucesso")
}

// GET /api/v1/dev-studio/history
func (h *DevStudioHandler) History(c *gin.Context) {
    userID := c.GetInt64("user_id")
    
    history, err := h.devStudioSvc.GetHistory(c.Request.Context(), userID)
    if err != nil {
        response.ErrorInternal(c, "Erro ao buscar histórico", err.Error())
        return
    }
    
    response.SuccessOK(c, history, "Histórico recuperado com sucesso")
}

// GET /api/v1/dev-studio/status/:id
func (h *DevStudioHandler) Status(c *gin.Context) {
    id := c.Param("id")
    requestID, err := strconv.ParseInt(id, 10, 64)
    if err != nil {
        response.ErrorValidation(c, "ID inválido", err.Error())
        return
    }
    
    status, err := h.devStudioSvc.GetStatus(c.Request.Context(), requestID)
    if err != nil {
        response.ErrorInternal(c, "Erro ao buscar status", err.Error())
        return
    }
    
    response.SuccessOK(c, status, "Status recuperado com sucesso")
}
```

#### Novo Service

```go
// backend/internal/service/dev_studio_service.go
package service

import (
    "context"
    "fmt"
    "go/ast"
    "go/parser"
    "go/token"
    "os"
    "path/filepath"
    "strings"
    
    "github.com/ceialmilk/api/internal/observability"
    "github.com/ceialmilk/api/internal/requestctx"
    "log/slog"
)

type DevStudioService struct {
    geminiAPIKey string
    githubToken  string
    requestRepo  *repository.DevStudioRequestRepository
    auditRepo    *repository.DevStudioAuditRepository
}

func (s *DevStudioService) GenerateCode(ctx context.Context, prompt string, userID int64) (*CodeGenerationResponse, error) {
    logger := requestctx.GetLogger(ctx)
    correlationID := requestctx.GetCorrelationID(ctx)
    
    logger.Info("Gerando código com IA",
        "user_id", userID,
        "prompt_length", len(prompt),
        "correlation_id", correlationID,
    )
    
    // 1. Carregar contexto do projeto (memory-bank) - MVP: RAG simples
    context, err := s.loadProjectContext(ctx)
    if err != nil {
        observability.CaptureError(err, map[string]interface{}{
            "user_id":        userID,
            "correlation_id": correlationID,
            "action":         "load_context",
        })
        return nil, fmt.Errorf("erro ao carregar contexto: %w", err)
    }
    
    // 2. Chamar Gemini API
    codeResponse, err := s.callGeminiAPI(ctx, prompt, context)
    if err != nil {
        observability.CaptureError(err, map[string]interface{}{
            "user_id":        userID,
            "correlation_id": correlationID,
            "action":         "gemini_api",
        })
        return nil, fmt.Errorf("erro ao chamar Gemini API: %w", err)
    }
    
    // 3. Salvar request no banco
    request, err := s.requestRepo.Create(ctx, &models.DevStudioRequest{
        UserID:      userID,
        Prompt:      prompt,
        Status:      "pending",
        CodeChanges: codeResponse.Files,
    })
    if err != nil {
        return nil, fmt.Errorf("erro ao salvar request: %w", err)
    }
    
    logger.Info("Código gerado com sucesso",
        "user_id", userID,
        "request_id", request.ID,
        "files_count", len(codeResponse.Files),
        "correlation_id", correlationID,
    )
    
    return &CodeGenerationResponse{
        RequestID:   request.ID,
        Files:       codeResponse.Files,
        Explanation: codeResponse.Explanation,
        Status:      "pending",
    }, nil
}

// MVP: RAG simples - carregar todo o memory-bank
func (s *DevStudioService) loadProjectContext(ctx context.Context) (string, error) {
    files := []string{
        "memory-bank/systemPatterns.md",
        "memory-bank/techContext.md",
        "memory-bank/activeContext.md",
        "memory-bank/progress.md",
        "memory-bank/productContext.md",
    }
    
    var context strings.Builder
    context.WriteString("# Contexto do Projeto CeialMilk\n\n")
    
    for _, file := range files {
        content, err := os.ReadFile(file)
        if err != nil {
            slog.Warn("Erro ao carregar arquivo do memory-bank", "file", file, "error", err)
            continue
        }
        context.WriteString(fmt.Sprintf("\n## %s\n\n%s\n", filepath.Base(file), string(content)))
    }
    
    return context.String(), nil
}

// Validação sintática simples para MVP
func (s *DevStudioService) validateSyntaxGo(code string) error {
    fset := token.NewFileSet()
    _, err := parser.ParseFile(fset, "", code, parser.ParseComments)
    if err != nil {
        return fmt.Errorf("erro de sintaxe Go: %w", err)
    }
    return nil
}

func (s *DevStudioService) ValidateCode(code map[string]string) error {
    for path, content := range code {
        ext := filepath.Ext(path)
        switch ext {
        case ".go":
            if err := s.validateSyntaxGo(content); err != nil {
                return fmt.Errorf("arquivo %s: %w", path, err)
            }
        case ".ts", ".tsx":
            // Validação básica de TypeScript (pode ser expandida)
            if len(content) == 0 {
                return fmt.Errorf("arquivo %s está vazio", path)
            }
        }
    }
    return nil
}

func (s *DevStudioService) ImplementChanges(ctx context.Context, requestID int64, userID int64) error {
    // 1. Buscar código gerado
    request, err := s.requestRepo.GetByID(ctx, requestID)
    if err != nil {
        return fmt.Errorf("erro ao buscar request: %w", err)
    }
    
    // 2. Validar código sintaticamente
    if err := s.ValidateCode(request.CodeChanges); err != nil {
        return fmt.Errorf("erro de validação: %w", err)
    }
    
    // 3. Criar PR (implementação na Fase 1)
    // Por enquanto, apenas salvar status
    request.Status = "validated"
    if err := s.requestRepo.Update(ctx, request); err != nil {
        return fmt.Errorf("erro ao atualizar request: %w", err)
    }
    
    return nil
}
```

#### Middleware de Autorização e Rate Limiting

```go
// backend/internal/auth/middleware.go
func DeveloperOnlyMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        perfil, exists := c.Get("perfil")
        if !exists || perfil != "DEVELOPER" {
            response.ErrorForbidden(c, "Acesso negado. Perfil DEVELOPER necessário.")
            c.Abort()
            return
        }
        c.Next()
    }
}

// backend/internal/middleware/rate_limit.go
import (
    "golang.org/x/time/rate"
    "time"
)

func DevStudioRateLimit() gin.HandlerFunc {
    // MVP: Rate limiting conservador (5 req/hora)
    // Pode aumentar para 10/hora após validação
    limiter := rate.NewLimiter(rate.Every(time.Hour), 5)
    
    return func(c *gin.Context) {
        userID := c.GetInt64("user_id")
        key := fmt.Sprintf("dev_studio:%d", userID)
        
        if !limiter.Allow() {
            response.ErrorTooManyRequests(c, "Limite de requisições excedido. Máximo 5 requisições por hora.")
            c.Abort()
            return
        }
        
        c.Next()
    }
}

// Uso no main.go - Reutilizar middleware existente
router.Group("/api/v1/dev-studio").
    Use(middleware.CorrelationIDMiddleware()).     // Já existe
    Use(middleware.StructuredLoggingMiddleware()).  // Já existe
    Use(middleware.SentryRecoveryMiddleware()).     // Já existe
    Use(authMiddleware.RequireAuth()).              // Já existe
    Use(developerMiddleware.RequireDeveloper()).    // Novo
    Use(rateLimitMiddleware.DevStudioLimit())       // Novo
```

### 2. Frontend (Next.js)

#### Nova Página

```typescript
// frontend/src/app/dev-studio/page.tsx
export default function DevStudioPage() {
    return (
        <div className="container mx-auto p-6">
            <h1>Dev Studio</h1>
            <ChatInterface />
            <CodePreview />
            <DeployStatus />
            <History />
        </div>
    );
}
```

#### Componente de Chat

```typescript
// frontend/src/components/dev-studio/ChatInterface.tsx
export function ChatInterface() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");

    const handleSend = async () => {
        // POST /api/v1/dev-studio/chat
        // Exibir código gerado
    };

    return (
        <div className="chat-container">
            {/* Interface de chat com IA */}
        </div>
    );
}
```

### 3. Integração com IA

#### Opções de Provedor

1. **Anthropic Claude API** (Recomendado)
   - Melhor para código e contexto longo
   - Suporta system prompts extensos
   - Custo: ~$0.003/1K tokens

2. **OpenAI GPT-4**
   - Alternativa consolidada
   - Custo: ~$0.03/1K tokens

#### Contexto para IA

- Enviar conteúdo do `memory-bank/` como contexto
- Incluir padrões arquiteturais (`systemPatterns.md`)
- Incluir stack tecnológica (`techContext.md`)
- Incluir estado atual (`activeContext.md`)

### 4. Integração com Git

#### Operações Necessárias

```go
// backend/internal/service/git_client.go
type GitClient struct {
    repoPath string
    token    string // GitHub token
}

func (g *GitClient) CommitAndPush(ctx context.Context, changes map[string]string, message string) error {
    // 1. Aplicar mudanças no filesystem
    // 2. git add .
    // 3. git commit -m message
    // 4. git push origin main
}
```

**⚠️ IMPORTANTE**: Usar token com permissões limitadas (apenas push, sem delete/force)

### 5. Integração com CI/CD

#### Render (Backend)

```go
// Trigger deploy via Render API
// Render detecta push e faz deploy automático
```

#### Vercel (Frontend)

```go
// Trigger deploy via Vercel API
// Ou confiar no auto-deploy do Vercel ao detectar push
```

## 🗄️ Migração de Banco de Dados

```sql
-- backend/migrations/5_add_dev_studio.up.sql

-- Tabela de requests
CREATE TABLE dev_studio_requests (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES usuarios(id),
    prompt TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    code_changes JSONB,
    error TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dev_studio_requests_user_id ON dev_studio_requests(user_id);
CREATE INDEX idx_dev_studio_requests_status ON dev_studio_requests(status);
-- Índice GIN para consultas eficientes em JSONB
CREATE INDEX idx_dev_studio_requests_code_changes ON dev_studio_requests USING GIN (code_changes);

-- Tabela de auditoria
CREATE TABLE dev_studio_audit (
    id BIGSERIAL PRIMARY KEY,
    request_id BIGINT REFERENCES dev_studio_requests(id),
    user_id BIGINT NOT NULL REFERENCES usuarios(id),
    action VARCHAR(50) NOT NULL,
    details JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dev_studio_audit_user_id ON dev_studio_audit(user_id);
CREATE INDEX idx_dev_studio_audit_request_id ON dev_studio_audit(request_id);

-- Adicionar perfil DEVELOPER ao seed (opcional)
-- UPDATE usuarios SET perfil = 'DEVELOPER' WHERE email = 'dev@example.com';
```

## ⚠️ Riscos e Mitigações

### Riscos

1. **Código Malicioso**: IA pode gerar código inseguro
2. **Deploy Quebrado**: Mudanças podem quebrar produção
3. **Acesso Não Autorizado**: Se token vazar, pode comprometer sistema
4. **Custos de IA**: Uso excessivo pode gerar custos altos
5. **Limites do Free Tier**: Gemini free tier pode ser insuficiente
6. **Qualidade do Código**: IA pode gerar código com bugs sutis
7. **Complexidade**: Implementação completa pode ser muito complexa
8. **Manutenção do Contexto**: Memory-bank desatualizado = código ruim

### Mitigações

1. **Validação de Código**:
   - Syntax parsing nativo (Go AST / TS Parser) antes de qualquer commit (MVP)
   - Linter automático integrado no backend (Fase 2)
   - Testes em Ephemeral Docker Containers antes do PR (Fase 3 - Opcional)

2. **Sandbox/Staging**:
   - Fluxo obrigatório de Pull Request (PR)
   - Deploy automático em ambiente de staging para validação visual
   - Aprovação humana necessária para merge em `main`
   - **Recomendação**: Começar sem sandbox no MVP, adicionar depois se necessário

3. **Segurança**:
   - GitHub App com permissões granulares (apenas repo/pull_requests)
   - Rate limiting agressivo por IP e Usuário
   - Logs de auditoria imutáveis com Diff Hashes
   - 2FA obrigatório para perfil DEVELOPER
   - Revisão humana sempre antes do merge

4. **Contexto e IA**:
   - RAG Dinâmico: Seleção seletiva de arquivos do memory-bank (Fase 2)
   - **MVP**: Usar todo o memory-bank (RAG simples)
   - Análise de Impacto: IA descreve efeitos colaterais antes da aplicação
   - Limite de tokens por request e monitoramento de custos

5. **Limites do Free Tier**:
   - Monitoramento de uso desde o início
   - Alertas quando próximo de limites
   - Fallback para Claude/OpenAI (paid tier) se necessário
   - Considerar upgrade para paid tier se uso intenso

6. **Abordagem Incremental**:
   - **MVP primeiro**: Validar conceito com funcionalidades básicas
   - **Evoluir gradualmente**: Adicionar features complexas depois
   - Reduz riscos iniciais e permite aprender e ajustar

7. **Manutenção do Contexto**:
   - Processo automatizado para atualizar memory-bank
   - Validação de consistência do contexto
   - Alertas quando contexto está desatualizado

## 🚀 Fases de Implementação (Revisado - Abordagem Incremental)

### Fase 0: MVP Simplificado (2 semanas) - **RECOMENDADO COMEÇAR AQUI**

**Objetivo**: Validar conceito com mínimo de complexidade

**Backend**:

- [ ] Criar perfil DEVELOPER
- [ ] Migração de banco (tabelas básicas)
- [ ] Middleware de autorização
- [ ] Estrutura básica do handler/service
- [ ] Service básico (Gemini API)
- [ ] Validação sintática simples (Go AST / TS Parser)

**Frontend**:

- [ ] Página `/dev-studio` (proteção DEVELOPER)
- [ ] Componente ChatInterface básico
- [ ] Componente CodePreview
- [ ] Serviço API básico

**O que NÃO fazer ainda**:

- ❌ Sandbox Docker
- ❌ PR automático (criar manualmente)
- ❌ RAG dinâmico complexo (usar todo memory-bank)
- ❌ Análise de impacto avançada

**Critério de Sucesso**: Desenvolvedor consegue gerar código e ver preview

### Fase 1: Automação Básica (2 semanas)

**Objetivo**: Automatizar criação de PRs

**Backend**:

- [ ] Integração com GitHub API
- [ ] Criação automática de PR
- [ ] Histórico de mudanças
- [ ] Status de PR/deploy

**Frontend**:

- [ ] Status de PR em tempo real
- [ ] Histórico visual
- [ ] Link para PR no GitHub

**Critério de Sucesso**: PR criado automaticamente ao aprovar código

### Fase 2: Melhorias (2 semanas)

**Objetivo**: Melhorar qualidade e segurança

**Backend**:

- [ ] RAG dinâmico inteligente
- [ ] Análise de impacto melhorada
- [ ] Monitoramento e alertas
- [ ] Fallback para outras IAs
- [ ] Linter automático

**Frontend**:

- [ ] Análise de impacto visual
- [ ] Alertas de limites
- [ ] Métricas de uso

**Critério de Sucesso**: Código gerado de melhor qualidade

### Fase 3: Segurança Avançada (2 semanas) - **OPCIONAL**

**Objetivo**: Máxima segurança e confiabilidade

**Backend**:

- [ ] Sandbox opcional (E2B ou similar)
- [ ] Aprovação em duas etapas
- [ ] Rollback automático
- [ ] Testes automatizados em sandbox
- [ ] Sistema de auditoria completo

**Frontend**:

- [ ] Interface de aprovação
- [ ] Notificações de rollback
- [ ] Interface de chat polida
- [ ] Status de deploy em tempo real

**Critério de Sucesso**: Sistema robusto e confiável

**Nota**: Ver [análise crítica](./analysis/critical-review.md) para detalhes completos sobre riscos e mitigações.

## 💰 Estimativa de Custos

### Mensal (uso moderado)

**Opção 1: Gemini API Free Tier (Recomendado para MVP)**

- **Gemini API**: $0 (free tier - 1.500 req/dia)
- **GitHub Actions**: Incluído (se dentro do limite)
- **Render/Vercel**: Sem custo adicional (deploy automático)
- **Total**: $0 adicional

**Opção 2: Com Fallback para Paid Tier**

- **Gemini API**: $0 (free tier)
- **Claude/OpenAI API**: ~$26-75/mês (se necessário como fallback)
- **GitHub Actions**: Incluído (se dentro do limite)
- **Render/Vercel**: Sem custo adicional (deploy automático)
- **Total**: ~$26-75/mês (apenas se usar fallback)

**Recomendação**: Começar com free tier e monitorar uso. Implementar fallback apenas se necessário.

## ✅ Checklist de Viabilidade

- [x] Sistema de autenticação com perfis existe
- [x] CI/CD configurado (GitHub Actions)
- [x] Deploy automatizado (Render + Vercel)
- [ ] Integração com IA (a implementar)
- [ ] Integração com Git API (a implementar)
- [ ] Sistema de auditoria (a implementar)

## 📝 Próximos Passos

1. ✅ **Aprovação da Proposta**: Validar se a solução atende às necessidades
2. ✅ **Revisar Análise Crítica**: Ver [análise crítica](./analysis/critical-review.md) para recomendações detalhadas
3. 🚧 **Decidir sobre Abordagem**: MVP primeiro ou implementação completa
4. 🚧 **Definir Provedor de IA**: Gemini (free tier) com fallback opcional
5. 🚧 **Configurar Tokens**: GitHub, Render, Vercel, Gemini API
6. 🚧 **Iniciar Fase 0**: MVP simplificado (2 semanas)
7. 🚧 **Validar Conceito**: Testar com casos reais
8. 🚧 **Evoluir Gradualmente**: Adicionar features conforme necessário

---

**Última atualização**: 2026-01-25
**Status**: Proposta inicial (atualizada com abordagem incremental e melhorias práticas específicas para CeialMilk)
**Autor**: Sistema de Documentação CeialMilk
**Nota**: Ver [análise crítica](./analysis/critical-review.md) para recomendações detalhadas sobre riscos, mitigações e abordagem incremental.
