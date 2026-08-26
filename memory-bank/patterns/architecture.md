# Arquitetura do sistema

## 🏛️ Arquitetura do Sistema

### **Padrão Arquitetural**

- **Arquitetura**: Monorepo com separação clara backend/frontend
- **Estilo**: API-centric RESTful com backend-for-frontend
- **Comunicação**: RESTful APIs com JSON
- **Estado**: Stateless com token JWT para sessão

### **Camadas da Aplicação (Backend Go)**

```
┌─────────────────────────────────────────────────┐
│                  Handlers                        │  ← HTTP Endpoints (Gin)
├─────────────────────────────────────────────────┤
│                   Services                       │  ← Lógica de Negócio
├─────────────────────────────────────────────────┤
│                 Repositories                     │  ← Acesso a Dados (pgx/pgxpool)
├─────────────────────────────────────────────────┤
│                   Models                         │  ← Structs de Domínio
├─────────────────────────────────────────────────┤
│                 Database                         │  ← PostgreSQL (pgx)
└─────────────────────────────────────────────────┘
```

### **Camadas da Aplicação (Frontend Next.js)**

```
┌─────────────────────────────────────────────────┐
│                  Pages/App                       │  ← Rotas e Layouts
├─────────────────────────────────────────────────┤
│                 Components                        │  ← UI Components (Shadcn)
├─────────────────────────────────────────────────┤
│                   Services                        │  ← API Client (Axios)
├─────────────────────────────────────────────────┤
│              TanStack Query                       │  ← State Management
└─────────────────────────────────────────────────┘
```

**Onde entra a reutilização**: primitivos em `components/ui/`, blocos por domínio em `components/<área>/`, **lógica de rede e contratos** em `services/`, **helpers** em `lib/`, **hooks** em `hooks/` (ou junto ao domínio quando específicos). Detalhes na subseção **Frontend: DRY, composição e abstração de lógica** (abaixo, após a árvore de pastas).

### **Estrutura atual do projeto**

Listagem de pastas apenas — não enumeramos arquivos aqui, porque a lista envelhece a cada PR. Use `ls` ou `Glob` para o conteúdo atual.

**Backend** (`/backend`):

```
cmd/api/main.go                 # Entrada: rotas, middleware, DB pool, migrações
internal/
├── handlers/                   # HTTP (Gin): bind, validação de forma, resposta
├── service/                    # Regra de domínio e orquestração
├── repository/                 # Acesso a dados (pgx)
├── models/                     # Structs de domínio (tags json/db)
├── response/                   # Respostas padronizadas (Success*, Error*)
├── auth/                       # JWT RS256, cookies, middleware de perfil
├── middleware/                 # CorrelationID, Logging, RateLimit, Recovery, Sentry, Metrics
├── requestctx/                 # Contexto de request (usuário, fazenda, correlation)
├── config/                     # Config, DB, chaves JWT de dev
├── logger/                     # slog estruturado
├── observability/              # Sentry, error handler
├── openapi/                    # Spec embed das integrações M2M
└── assistente/                 # Assistente multimodal (Gemini Live)
migrations/                     # golang-migrate .up.sql / .down.sql
```

**Frontend** (`/frontend/src`):

```
app/                            # App Router — uma pasta por rota:
                                # admin, agricultura, alertas, animais, dev-studio,
                                # fazendas, folgas, gestao, login, lotes, onboarding,
                                # producao, registro
components/                     # Uma pasta por domínio (mesmos nomes das rotas) +
├── ui/                         #   primitivos Shadcn
├── layout/                     #   Header, Providers, ProtectedRoute, PageContainer
│   └── list/                   #   MobileListCard, ResponsiveListContainer, etc.
├── filters/                    #   PeriodFilter e afins
└── wizard/                     #   onboarding
services/                       # api.ts (Axios + interceptors) e um módulo por domínio
hooks/                          # Lógica reutilizável e hooks use<Dominio>Page
contexts/                       # AuthContext, AssistenteContext, FazendaContext, ThemeContext
lib/                            # utils, errors (getApiErrorMessage), filter-url, format
config/                         # Configuração de runtime
```

Convenções por pasta: [`backend/AGENTS.md`](../../backend/AGENTS.md) e [`frontend/AGENTS.md`](../../frontend/AGENTS.md).


**Padrão Handler (referência: fazenda_handler)**:

- Struct do handler com `service *service.XxxService`; `NewXxxHandler(svc)`.
- Request DTOs com `binding:"required"` e `json` tags; `c.ShouldBindJSON(&req)`.
- Respostas: `response.SuccessOK`, `response.SuccessCreated`, `response.ErrorValidation`, `response.ErrorNotFound`, `response.ErrorInternal`, etc.
- IDs de path: `c.Param("id")` → `strconv.ParseInt`; erros retornam via `response.*`.
- Handler chama `h.service.Method(c.Request.Context(), ...)` e mapeia erros (ex.: `pgx.ErrNoRows` → `ErrorNotFound`).

**Padrão Service (referência: fazenda_service)**:

- Struct com `repo *repository.XxxRepository`; `NewXxxService(repo)`.
- Métodos recebem `ctx context.Context`; regras de negócio; delega persistência ao repo.
- Erros de domínio (ex.: `ErrXxxNotFound`) para o handler mapear.

**Padrão Repository (referência: fazenda_repository)**:

- Struct com `db *pgxpool.Pool`; `NewXxxRepository(db)`.
- Queries SQL parametrizadas; `QueryRow` / `Query` / `Exec`; `pgx.ErrNoRows` quando não encontrar.
- Models com tags `db` para Scan.

**Model (referência: fazenda)**:

- Struct com `json` e `db` tags; `*string` / `*time.Time` para opcionais; `CreatedAt` / `UpdatedAt`.

