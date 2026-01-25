# 🎯 Análise Corrigida: Dev Studio Web em Produção

> **Nota**: Esta análise foi complementada por uma [análise crítica detalhada](./critical-review.md) que identifica riscos adicionais, sugere melhorias e recomenda uma abordagem incremental (MVP first). Recomendamos revisar a análise crítica antes de iniciar a implementação.

## 📋 Necessidade Real

1. ✅ **Interface WEB** integrada ao sistema CeialMilk
2. ✅ **Área protegida** `/dev-studio` no frontend Next.js
3. ✅ **Chat com IA** com RAG Dinâmico (contexto inteligente)
4. ✅ **Validação Sintática** no backend (Go AST / TS Parser)
5. ✅ **Fluxo Seguro de PR** (Pull Requests automáticos em branches efêmeras)
6. ✅ **Deploy via Staging** antes da produção
7. ✅ **Audit Trail** completo com Diff Hashes
8. ✅ **Análise de Impacto** visual para o desenvolvedor antes da aplicação

**Cursor PRO**: Já usado para desenvolvimento local (IDE) - não é parte desta solução.

---

## 🏗️ Arquitetura Corrigida

### Componentes Necessários

```
┌─────────────────────────────────────────────────────────┐
│   Frontend Next.js (CeialMilk - em produção)          │
│   ┌───────────────────────────────────────────────────┐ │
│   │  /dev-studio (ProtectedRoute - perfil DEVELOPER) │ │
│   │  - Chat Interface (IA)                            │ │
│   │  - Preview de Código                               │ │
│   │  - Status de Deploy                                │ │
│   │  - Histórico                                       │ │
│   └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                    ↕ HTTP/REST
┌─────────────────────────────────────────────────────────┐
│   Backend Go (CeialMilk - em produção)                 │
│   ┌───────────────────────────────────────────────────┐ │
│   │  /api/v1/dev-studio/*                             │ │
│   │  - POST /chat                                     │ │
│   │  - POST /implement                                │ │
│   │  - GET /history                                   │ │
│   │  - GET /status                                    │ │
│   └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                    ↕
┌─────────────────────────────────────────────────────────┐
│   Dev Studio Service (Go)                                │
│   - Gemini API / Claude API                             │
│   - Git Operations (commit/push)                        │
│   - CI/CD Trigger                                       │
│   - Audit Logging                                       │
└─────────────────────────────────────────────────────────┘
```

---

## 💰 Análise de Custos (Corrigida)

### Opção 1: Gemini API Free Tier + Integração Direta

**Arquitetura**:

- Frontend: Next.js (já existe - CeialMilk)
- Backend: Go (já existe - CeialMilk)
- IA: Gemini API (free tier)
- Git: GitHub API (gratuito)

**Custo Mensal**: **$0**

**Limitações**:

- 1,500 requests/dia (API free tier)
- 1M tokens/minuto

**Ideal para**: Uso moderado, máximo de economia

---

### Opção 2: Gemini CLI + Integração Backend

**Arquitetura**:

- Frontend: Next.js (já existe)
- Backend: Go (já existe)
- IA: Gemini CLI (chamado via backend)
- Git: GitHub API (gratuito)

**Custo Mensal**: **$0**

**Limitações**:

- 1,000 requests/dia (CLI free tier)
- Requer Gemini CLI instalado no servidor

**Ideal para**: Uso moderado, sandbox nativo

---

### Opção 3: Claude API + Integração Direta

**Arquitetura**:

- Frontend: Next.js (já existe)
- Backend: Go (já existe)
- IA: Claude API
- Git: GitHub API (gratuito)

**Custo Mensal**: **~$26-75** (dependendo do uso)

**Vantagens**:

- Melhor qualidade de código
- Sem limites rígidos (paid tier)

**Ideal para**: Produção, qualidade crítica

---

### Opção 4: Clawdbot Self-hosted + Integração

**Arquitetura**:

- Frontend: Next.js (já existe)
- Backend: Go (já existe)
- Clawdbot: Self-hosted (separado)
- IA: Gemini API (free tier)
- Git: GitHub API (gratuito)

**Custo Mensal**: **$5-10** (infraestrutura Clawdbot)

**Vantagens**:

- Reutilizável em outros projetos
- Control UI separado

**Ideal para**: Múltiplos projetos, reutilização

---

## 🏆 Recomendação Corrigida

### Para Máximo de Economia (Gratuito)

**🏆 RECOMENDAÇÃO: Gemini API Free Tier + Integração Direta no Backend Go**

**Por quê?**

1. ✅ **Gratuito** (free tier: 1,500 req/dia)
2. ✅ **Integrado** (usa infraestrutura existente)
3. ✅ **Sem dependências externas** (não precisa Clawdbot)
4. ✅ **Interface web** (Next.js já existe)
5. ✅ **Backend Go** (já existe)

**Arquitetura**:

```
Frontend Next.js (CeialMilk)
  /dev-studio (página protegida)
    ↓ HTTP/REST
Backend Go (CeialMilk)
  /api/v1/dev-studio/*
    ↓
Dev Studio Service (Go)
  - Gemini API (free tier) + RAG Dinâmico
  - Syntax Validation (Pre-commit)
  - Git Operations (Branch/PR via GitHub App)
  - Ephemeral Docker Sandbox
  - Audit Logging (Diff Hashes)
```

**Custo**: **$0 adicional**

---

## 🛠️ Implementação: Backend Go

### Handler Dev Studio

```go
// backend/internal/handlers/dev_studio_handler.go
package handlers

import (
    "net/http"
    "github.com/gin-gonic/gin"
    "github.com/ceialmilk/api/internal/service"
    "github.com/ceialmilk/api/internal/response"
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
        response.ErrorValidation(c, "Prompt obrigatório", err.Error())
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
        response.ErrorInternal(c, "Erro ao gerar código", err.Error())
        return
    }

    response.SuccessOK(c, codeResponse, "Código gerado com sucesso")
}

// POST /api/v1/dev-studio/implement
func (h *DevStudioHandler) Implement(c *gin.Context) {
    var req struct {
        RequestID int64             `json:"request_id" binding:"required"`
        Files     map[string]string `json:"files" binding:"required"`
    }

    if err := c.ShouldBindJSON(&req); err != nil {
        response.ErrorValidation(c, "Dados inválidos", err.Error())
        return
    }

    userID := c.GetInt64("user_id")

    // Aplicar mudanças
    result, err := h.devStudioSvc.ApplyChanges(c.Request.Context(), req.RequestID, req.Files, userID)
    if err != nil {
        response.ErrorInternal(c, "Erro ao aplicar mudanças", err.Error())
        return
    }

    response.SuccessOK(c, result, "Mudanças aplicadas com sucesso")
}
```

### Service Dev Studio

```go
// backend/internal/service/dev_studio_service.go
package service

import (
    "context"
    "encoding/json"
    "fmt"
    "bytes"
    "net/http"
    "os"
)

type DevStudioService struct {
    geminiAPIKey string
    githubToken  string
    projectRepo  *repository.DevStudioProjectRepository
}

func NewDevStudioService(geminiAPIKey, githubToken string) *DevStudioService {
    return &DevStudioService{
        geminiAPIKey: geminiAPIKey,
        githubToken:  githubToken,
    }
}

func (s *DevStudioService) GenerateCode(ctx context.Context, prompt string, userID int64) (*CodeGenerationResponse, error) {
    // 1. Carregar contexto do projeto (memory-bank)
    context, err := s.loadProjectContext(ctx)
    if err != nil {
        return nil, err
    }

    // 2. Construir prompt completo
    fullPrompt := fmt.Sprintf(`
Você é um desenvolvedor experiente trabalhando no projeto CeialMilk.

PADRÕES ARQUITETURAIS:
%s

STACK TECNOLÓGICA:
%s

ESTADO ATUAL:
%s

TAREFA SOLICITADA:
%s

Gere o código necessário seguindo os padrões documentados.
Retorne JSON com:
{
  "files": {
    "path/to/file.go": "conteúdo",
    "path/to/file.tsx": "conteúdo"
  },
  "explanation": "explicação"
}
`, context.SystemPatterns, context.TechContext, context.ActiveContext, prompt)

    // 3. Chamar Gemini API
    payload := map[string]interface{}{
        "contents": []map[string]interface{}{
            {
                "parts": []map[string]interface{}{
                    {"text": fullPrompt},
                },
            },
        },
    }

    jsonData, _ := json.Marshal(payload)
    req, _ := http.NewRequestWithContext(ctx, "POST",
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key="+s.geminiAPIKey,
        bytes.NewBuffer(jsonData))
    req.Header.Set("Content-Type", "application/json")

    client := &http.Client{}
    resp, err := client.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    // 4. Parsear resposta
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
        return nil, err
    }

    // 5. Extrair código
    codeText := geminiResponse.Candidates[0].Content.Parts[0].Text
    codeData := s.parseCodeResponse(codeText)

    // 6. Salvar request
    request, err := s.saveRequest(ctx, userID, prompt, codeData)
    if err != nil {
        return nil, err
    }

    return &CodeGenerationResponse{
        RequestID:   request.ID,
        Files:       codeData.Files,
        Explanation: codeData.Explanation,
        Status:      "pending",
    }, nil
}

func (s *DevStudioService) ApplyChanges(ctx context.Context, requestID int64, files map[string]string, userID int64) (*ApplyChangesResponse, error) {
    // 1. Buscar request
    request, err := s.getRequest(ctx, requestID)
    if err != nil {
        return nil, err
    }

    // 2. Validação Sintática (Sanity Check)
    if err := s.validateSyntax(files); err != nil {
        return nil, fmt.Errorf("erro de sintaxe: %w", err)
    }

    // 3. Executar em Sandbox Docker Efêmero
    if err := s.runDockerTests(ctx, files); err != nil {
        return nil, fmt.Errorf("falha nos testes em sandbox: %w", err)
    }

    // 4. Criar branch efêmera e abrir Pull Request
    prURL, diffHash, err := s.createPullRequest(ctx, files, "Auto: "+request.Prompt)
    if err != nil {
        return nil, err
    }

    // 5. Atualizar status e registrar Auditoria com DiffHash
    request.Status = "pr_opened"
    request.DiffHash = diffHash
    s.updateRequest(ctx, request)

    return &ApplyChangesResponse{
        Status:  "pr_opened",
        Message: "Pull Request criado: " + prURL,
        PRURL: prURL,
    }, nil
}

func (s *DevStudioService) loadProjectContext(ctx context.Context) (*ProjectContext, error) {
    // Ler memory-bank do repositório
    // Pode ser via GitHub API ou filesystem local

    return &ProjectContext{
        SystemPatterns: "...", // memory-bank/systemPatterns.md
        TechContext:    "...", // memory-bank/techContext.md
        ActiveContext:  "...", // memory-bank/activeContext.md
    }, nil
}

func (s *DevStudioService) applyGitChanges(ctx context.Context, files map[string]string, commitMessage string) error {
    // Usar GitHub API ou git command
    // Commit e push automático

    return nil
}
```

---

## 🎨 Implementação: Frontend Next.js

### Página Dev Studio

```typescript
// frontend/src/app/dev-studio/page.tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { ChatInterface } from '@/components/dev-studio/ChatInterface';
import { CodePreview } from '@/components/dev-studio/CodePreview';
import { DeployStatus } from '@/components/dev-studio/DeployStatus';

export default function DevStudioPage() {
    const { user } = useAuth();

    // Verificar perfil DEVELOPER
    if (user?.perfil !== 'DEVELOPER') {
        return <div>Acesso negado. Perfil DEVELOPER necessário.</div>;
    }

    return (
        <ProtectedRoute>
            <div className="container mx-auto p-6">
                <h1 className="text-3xl font-bold mb-6">Dev Studio</h1>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                        <ChatInterface />
                    </div>
                    <div>
                        <CodePreview />
                        <DeployStatus />
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
```

### Componente Chat

```typescript
// frontend/src/components/dev-studio/ChatInterface.tsx
'use client';

import { useState } from 'react';
import { api } from '@/services/api';

export function ChatInterface() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSend = async () => {
        if (!input.trim()) return;

        setLoading(true);

        // Adicionar mensagem do usuário
        const userMessage: Message = {
            role: 'user',
            content: input,
        };
        setMessages(prev => [...prev, userMessage]);

        try {
            // Chamar backend
            const response = await api.post('/api/v1/dev-studio/chat', {
                prompt: input,
            });

            // Adicionar resposta
            const aiMessage: Message = {
                role: 'assistant',
                content: response.data.data.explanation,
                code: response.data.data.files,
                requestId: response.data.data.request_id,
            };
            setMessages(prev => [...prev, aiMessage]);

            setInput('');
        } catch (error) {
            console.error('Erro ao gerar código:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="chat-container">
            <div className="messages">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`message ${msg.role}`}>
                        {msg.content}
                        {msg.code && (
                            <CodePreview code={msg.code} requestId={msg.requestId} />
                        )}
                    </div>
                ))}
            </div>
            <div className="input-area">
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Descreva a feature que deseja implementar..."
                />
                <button onClick={handleSend} disabled={loading}>
                    {loading ? 'Gerando...' : 'Enviar'}
                </button>
            </div>
        </div>
    );
}
```

---

## 🔐 Segurança

### Middleware de Autorização

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
```

### Rate Limiting

```go
// backend/internal/middleware/rate_limit.go
func DevStudioRateLimit() gin.HandlerFunc {
    limiter := rate.NewLimiter(rate.Every(time.Hour), 10) // 10 req/hora

    return func(c *gin.Context) {
        userID := c.GetInt64("user_id")
        key := fmt.Sprintf("dev_studio:%d", userID)

        if !limiter.Allow() {
            response.ErrorTooManyRequests(c, "Limite de requisições excedido")
            c.Abort()
            return
        }

        c.Next()
    }
}
```

---

## 💰 Custo Final

### Opção Recomendada: Gemini API Free Tier

**Custo Mensal**: **$0**

**Componentes**:

- Frontend: Next.js (já existe - CeialMilk)
- Backend: Go (já existe - CeialMilk)
- IA: Gemini API (free tier - 1,500 req/dia)
- Git: GitHub API (gratuito)
- Infraestrutura: Render + Vercel (já existe)

**Total**: **$0 adicional**

---

## 🚀 Plano de Implementação

### Semana 1: Backend & Segurança

- [ ] Criar modelos (DevStudioRequest, DevStudioAudit com DiffHash)
- [ ] Implementar Syntax Parsers (Go AST / TS Parser)
- [ ] Implementar DevStudioService (Gemini API com RAG Dinâmico)
- [ ] Middleware de autorização e Rate limiting agressivo

### Semana 2: Git & Sandbox

- [ ] Integração com GitHub App (Branch/PR)
- [ ] Sistema de Ephemeral Docker Sandbox para testes
- [ ] Fluxo de Pull Request automático
- [ ] Registro de auditoria imutável

### Semana 3: Frontend & UX

- [ ] Página /dev-studio com ProtectedRoute
- [ ] Componente ChatInterface com Análise de Impacto
- [ ] Componente DiffViewer para Preview realista
- [ ] Status de PR/Deploy em tempo real

---

## ✅ Conclusão

**Para sua necessidade real (interface web em produção)**:

**🏆 RECOMENDAÇÃO: Gemini API Free Tier + Integração Direta**

**Arquitetura**:

- Frontend: Next.js (CeialMilk) - `/dev-studio`
- Backend: Go (CeialMilk) - `/api/v1/dev-studio/*`
- IA: Gemini API (free tier)
- Git: GitHub API

**Custo**: **$0 adicional**

**Tempo**: **3 semanas**

---

**Última atualização**: 2026-01-25  
**Status**: Análise corrigida para interface web em produção  
**Recomendação**: Gemini API Free Tier + Integração Direta (com abordagem incremental recomendada)

**Próximos Passos**: Revisar [análise crítica](./critical-review.md) para recomendações detalhadas sobre riscos, mitigações e plano de implementação revisado em fases menores (MVP first).
