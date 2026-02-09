# 🏗️ System Patterns - CeialMilk

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

### **Estrutura atual do projeto**

**Backend** (`/backend`):

```
cmd/api/main.go                 # Entrada, rotas, middleware, DB pool
internal/
├── handlers/                   # HTTP handlers (Gin)
│   ├── auth_handler.go         # Login, logout, refresh, validate
│   ├── fazenda_handler.go      # CRUD + search fazendas (referência)
│   └── dev_studio_handler.go   # Chat, refine, validate, implement, usage
├── service/                    # Lógica de negócio
│   ├── fazenda_service.go      # Referência
│   ├── dev_studio_service.go   # IA, RAG, GitHub
│   ├── github_service.go       # PRs
│   └── refresh_token_service.go
├── repository/                 # Acesso a dados (pgx)
│   ├── fazenda_repository.go   # Referência
│   ├── dev_studio_repository.go
│   ├── usuario_repository.go
│   └── refresh_token_repository.go
├── models/                     # Structs de domínio (json/db tags)
│   ├── fazenda.go
│   ├── usuario.go
│   ├── dev_studio.go
│   └── refresh_token.go
├── response/                   # Respostas padronizadas
│   └── response.go             # SuccessOK, SuccessCreated, ErrorValidation, ErrorNotFound, etc.
├── auth/                       # JWT, cookies, middleware RequireAuth/RequireDeveloper
├── middleware/                 # CorrelationID, Logging, RateLimit, Recovery, Sentry
├── config/                     # Config, DB, dev JWT
└── observability/              # Sentry, error handler
migrations/                     # golang-migrate .up.sql / .down.sql
```

**Frontend** (`/frontend/src`):

```
app/                            # App Router (Next.js)
├── page.tsx, layout.tsx
├── login/page.tsx
├── fazendas/page.tsx           # Listagem
├── fazendas/nova/page.tsx
├── fazendas/[id]/editar/page.tsx
└── dev-studio/page.tsx
components/
├── fazendas/                   # FazendaForm, FazendaTable
├── dev-studio/                 # ChatInterface, CodePreview, PRStatus, UsageAlert
├── layout/                     # Header, ProtectedRoute, Providers
└── ui/                         # Shadcn: button, card, dialog, input, label, table
services/                       # api.ts (Axios + interceptors), auth, fazendas, devStudio
contexts/                       # AuthContext
lib/utils.ts
```

**Rotas API (referência)**:

- `POST /api/auth/login|logout|refresh|validate`
- `GET|POST|PUT|DELETE /api/v1/fazendas` (+ /count, /exists, /search/by-\*)
- `GET /api/v1/dev-studio/usage` | `POST /api/v1/dev-studio/chat|refine|validate|implement` | `GET /history|/status/:id`

**Dev Studio – contexto da IA**:

- **Contexto tipo Cursor**: `loadTargetFilesForPrompt` infere arquivos-alvo (menu, Header, rota, link, dev-studio) e inclui o **estado atual** no contexto. Instruções no prompt: usar como base, preservar o resto; trabalhar como IDE.
- **Contexto do repositório**: Com `GITHUB_TOKEN` + `GITHUB_REPO` configurados, exemplos de código e arquivos-alvo vêm sempre da **branch de produção** (`GITHUB_CONTEXT_BRANCH`, default `main`) via `GitHubService.GetFileContent`. Fallback para disco local quando GitHub não está configurado.

**Assistente Virtual Multimodal Live**:
- **Arquitetura**: Streaming bidirecional via WebSocket (`/api/v1/assistente/live`).
- **Backend**: Proxy entre Frontend e Gemini API; orquestração de goroutines para processamento paralelo; Function Calling para acesso ao banco. Processa apenas mensagens de **texto** (JSON `{ "text": "..." }`); áudio bruto não é utilizado. Em falha (Gemini ou rede), envia ao cliente `{"type": "error", "content": "<mensagem amigável>"}`. **CheckOrigin**: em produção usa `CORS_ORIGIN` para restringir a origem do WebSocket; em dev (localhost) aceita qualquer origem.
- **Frontend**: Hook `useGeminiLive` abre o WebSocket; reconexão com backoff (1s, 2s, 4s, máx. 3 tentativas); detecção de offline (`navigator.onLine` + eventos `online`/`offline`); ao voltar à aba (`visibilitychange`) reconecta uma vez se o socket estiver fechado. Callbacks `onReconnecting`/`onReconnected` para feedback em texto. Tratamento de `type: "error"` para exibir e falar mensagem amigável.
- **Compatibilidade**: Funciona em qualquer navegador com WebSocket (incluindo mobile). Voz quando há `SpeechRecognition`/`webkitSpeechRecognition`; TTS quando há `speechSynthesis`. Fallback gracioso para texto quando voz não está disponível.
- **Contexto**: Injeção automática de `user_id` e `fazenda_id` (ativa) na inicialização da sessão.

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

## 🔄 Padrões de Design Implementados

### **Padrões Estruturais**

- **MVC**: Separação clara entre Handlers (Controllers), Services e Repositories
- **Dependency Injection**: Injeção manual ou via container simples
- **Repository Pattern**: Abstração da camada de acesso a dados

### **Padrões Comportamentais**

- **Middleware Pattern**: Middleware chain no Gin para autenticação, logging, CORS
- **Strategy Pattern**: Para diferentes algoritmos de validação e processamento
- **Observer Pattern**: Para sistema de notificações e eventos (futuro)

### **Padrões Criacionais**

- **Builder Pattern**: Para construção complexa de objetos de domínio
- **Factory Method**: Para criação de serviços específicos
- **Singleton**: Para conexão de banco de dados (pool de conexões)

## 🗃️ Padrões de Dados

### **Modelagem de Domínio**

```go
// Estrutura principal de entidades
Fazenda (1) ─── (N) Animal (1) ─── (N) ProduçãoLeite
Usuario (N) ─── (N) Fazenda  // via tabela usuarios_fazendas (vínculo N:N)
```

- **Vínculo usuário–fazenda**: Tabela `usuarios_fazendas` (usuario_id, fazenda_id). Um usuário pode ter várias fazendas vinculadas; quando há apenas uma, o sistema a considera automaticamente em formulários e atalhos.
- **Atribuição de fazendas**: Somente o perfil **ADMIN** (ou DEVELOPER) pode atribuir fazendas a usuários, na tela de administração (editar usuário → seção "Fazendas vinculadas").
- **Perfil não editável**: Na edição de usuário, o campo perfil não pode ser alterado quando o usuário já for ADMIN ou DEVELOPER (somente leitura no frontend e preservação no backend).

### **Padrões de Acesso a Dados**

- **pgx/v5**: Driver PostgreSQL nativo com type safety e performance otimizada
- **Prepared Statements**: Todas as queries parametrizadas (proteção SQL Injection)
- **Connection Pooling**: Gerenciado pelo `pgxpool.Pool`
- **Transactions**: Suporte nativo para transações

### **Padrões de Migração de Banco de Dados**

- **golang-migrate**: Migrações versionadas em `/backend/migrations`
- **Execução Automática**: Migrações executadas no startup do servidor
- **Versionamento**: Migrações versionadas em formato `{número}_{descrição}.up.sql` e `.down.sql`

## 🌐 Padrões de API

### **RESTful Design**

- **Resources**: Entidades como recursos (`/api/v1/fazendas`, `/api/v1/animais`)
- **HTTP Verbs**: GET, POST, PUT, DELETE, PATCH
- **Status Codes**: Uso apropriado de códigos HTTP (200, 201, 400, 401, 404, 500)
- **JSON**: Formato padrão de request/response

### **Versioning**

- **URL Path**: `/api/v1/{recurso}`
- **Backward Compatibility**: Mantida por pelo menos 1 versão

### **Response Format**

```json
{
  "data": { ... },
  "message": "Success",
  "timestamp": "2026-01-24T10:00:00Z"
}
```

### **Error Response Format**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": { ... }
  },
  "timestamp": "2026-01-24T10:00:00Z"
}
```

## 🔐 Padrões de Segurança

### **Autenticação**

- **JWT RS256**: Tokens assinados com chave privada, verificados com chave pública
- **Access Tokens**: Vida curta (15 minutos), armazenados em cookies HttpOnly
- **Refresh Tokens**: Armazenados no banco de dados, vida longa (7 dias), em cookies HttpOnly
- **Password Hashing**: BCrypt com custo 10
- **Token Refresh**: Endpoint `/api/auth/refresh` para renovar access tokens usando refresh tokens

### **Autorização**

- **Role-Based**: Controle de acesso baseado em roles (USER, ADMIN, DEVELOPER)
- **USER**: Perfil padrão; acesso a Fazendas e Assistente.
- **ADMIN**: Perfil para acesso à área administrativa (`/api/v1/admin/*`); requer `auth.RequireAdmin()` (ADMIN ou DEVELOPER).
- **DEVELOPER**: Perfil único no sistema (constraint no banco garante 1 apenas); acesso ao Dev Studio (`/api/v1/dev-studio/*`) e área Admin; requer `auth.RequireDeveloper()` para Dev Studio, `auth.RequireAdmin()` para Admin.
- **Resource Ownership**: Verificação de propriedade de recursos
- **Middleware de Autenticação**: Verificação de token em todas as rotas protegidas
- **Frontend (controle por perfil)**:
  - **USER**: não acessa manutenção de fazendas; `/fazendas` funciona como gateway de redirecionamento (onboarding/seleção/animais).
  - **ADMIN/DEVELOPER**: acesso completo às páginas de fazendas (listar/detalhar/criar/editar).

### **Proteção**

- **CORS**: Configurado estritamente para domínio da Vercel
- **Rate Limiting**: Limitação de requisições por IP (futuro)
- **Input Validation**: Validação em todas as entradas (struct tags)
- **SQL Injection**: Prevenido com prepared statements
- **XSS**: Prevenido com sanitização no frontend

### **Armazenamento de Tokens**

- **HttpOnly Cookies**: Tokens armazenados em cookies HttpOnly (não acessíveis via JavaScript)
  - `ceialmilk_token`: Access token (15 minutos)
  - `ceialmilk_refresh_token`: Refresh token (7 dias)
- **Secure Flag**: Cookies enviados apenas via HTTPS em produção (detectado automaticamente)
- **SameSite**: `SameSite=Strict` em dev (CORS localhost); `SameSite=None` em produção cross-origin (frontend Vercel ↔ backend Render), para que o navegador envie cookies em requisições cross-origin
- **Frontend**: Usa `withCredentials: true` no Axios para enviar cookies automaticamente

## ⚡ Padrões de Performance

### **Backend (Go)**

- **Goroutines**: Concorrência nativa para operações paralelas
- **Connection Pooling**: Pool de conexões gerenciado pelo pgx
- **Caching**: Cache em memória para dados frequentes (futuro: Redis)

### **Frontend (Next.js)**

- **Server-Side Rendering (SSR)**: Renderização no servidor quando necessário
- **Static Site Generation (SSG)**: Páginas estáticas pré-renderizadas
- **Image Optimization**: Otimização automática de imagens pela Vercel
- **Code Splitting**: Divisão automática de código por rotas

### **Database Optimization**

- **Indexing**: Índices apropriados para queries frequentes
- **Query Optimization**: Consultas otimizadas com EXPLAIN
- **Connection Pooling**: Pool gerenciado pelo driver

## 🧪 Padrões de Teste

### **Test Pyramid**

- **Unit Tests**: 70% - Testes de unidades isoladas
- **Integration Tests**: 20% - Testes de integração
- **E2E Tests**: 10% - Testes end-to-end

### **Testing Patterns**

- **Table-Driven Tests**: Padrão Go para testes com múltiplos casos
- **Mocking**: Mock de dependências externas
- **Test Containers**: Containers para testes de integração (futuro)

## 🔧 Padrões de Configuração

### **Configuration Management**

- **Environment Variables**: Configuração por variáveis de ambiente
- **Config Struct**: Struct centralizada para configuração
- **Secrets Management**: Gerenciamento de segredos via variáveis de ambiente

### **Logging Patterns**

- **Structured Logging**: JSON format para logs (slog)
- **Log Levels**: DEBUG, INFO, WARN, ERROR
- **Correlation IDs**: IDs únicos para cada request (UUID), incluídos em todos os logs
- **Request Logging**: Middleware de logging estruturado com método, path, status, latency, IP, user agent
- **Centralized Logging**: Logs estruturados em JSON prontos para agregação (BetterStack/Logtail via stdout)

## 🚀 Padrões de Deploy

### **Deployment Patterns**

- **Containerization**: Docker com multi-stage build
- **Orquestração**: Render para backend, Vercel para frontend
- **Environment Driven**: Configuração total via variáveis de ambiente
- **Health Checks**: Endpoints `/health` para verificação de saúde

### **CI/CD Patterns**

- **GitHub Actions**: Pipeline de CI/CD
- **Automated Testing**: Testes automáticos no pipeline
- **Docker Builds**: Builds automatizados de containers
- **Infrastructure as Code**: Terraform-ready

## 🎨 Padrões de UI/UX

### **Componentes Shadcn/UI**

- **Biblioteca**: Shadcn/UI como base de componentes
- **Componentes Disponíveis**: button, card, dialog, input, label, table
- **Estilização**: Tailwind CSS com tema customizado

### **Dialogs de Confirmação**

- **Padrão**: Usar Shadcn/UI Dialog para confirmações de ações destrutivas
- **Nunca usar**: `confirm()` ou `alert()` nativos do JavaScript
- **Estrutura**:
  - `Dialog` com `open` e `onOpenChange` para controle de estado
  - `DialogHeader` com `DialogTitle` e `DialogDescription`
  - `DialogFooter` com botões de ação (cancelar e confirmar)
  - Botão de cancelar: `variant="outline"`
  - Botão de confirmar: `variant="destructive"` para ações destrutivas
- **Exemplo**: Cancelamento de requisições no Dev Studio usa Dialog com confirmação clara

### **Atualização Automática de Listas**

- **Padrão**: Usar `refreshTrigger` (número) para forçar atualização de listas/históricos
- **Implementação**:
  - Estado `refreshTrigger` na página principal
  - Passar `refreshTrigger` como prop para componente de lista
  - `useEffect` no componente de lista observa mudanças em `refreshTrigger`
  - Incrementar `refreshTrigger` após ações que modificam dados (criar, atualizar, deletar, cancelar)
- **Exemplo**: `HistoryPanel` atualiza automaticamente após cancelar requisição

### **Estado derivado da query (evitar setState em useEffect)**

- **Padrão**: Ao exibir dados vindos de TanStack Query e permitir edição local, **não** sincronizar com `setState` dentro de `useEffect` (viola a regra `react-hooks/set-state-in-effect` e pode causar renders em cascata).
- **Abordagem**: Derivar o valor exibido da query e usar estado local apenas para alterações pendentes do usuário:
  - Dados da query: `initialIds = useMemo(() => queryData.map(...), [queryData])`
  - Estado local: `dirty` (boolean) + `pendingIds` (valores editados)
  - Valor exibido: `selectedIds = dirty ? pendingIds : initialIds`
  - Ao salvar com sucesso: invalidar a query e `setDirty(false)` para voltar a exibir os dados do servidor.
- **Exemplo**: Admin editar usuário → seção "Fazendas vinculadas" (`frontend/src/app/admin/usuarios/[id]/editar/page.tsx`).

### **Layout de Página (PageContainer)**

- **Padrão**: Usar o componente `PageContainer` para wrappers de `<main>` em todas as páginas
- **Variantes**: `default` (max-w-5xl), `narrow` (max-w-2xl), `wide` (container max-w-6xl), `centered` (flex center para login/home)
- **Implementação**: `frontend/src/components/layout/PageContainer.tsx` com props `variant`, `className`, `children`
- **Uso**: Fazendas → default; nova/editar fazenda → narrow; Dev Studio → wide; login e home → centered

### **Extração de Erro da API (getApiErrorMessage)**

- **Padrão**: Usar `getApiErrorMessage(err, fallback)` de `lib/errors.ts` para mensagens de erro vindas da API
- **Implementação**: Trata `response.data.error` (string ou objeto com `message`/`details`), status 429 (rate limit) e retorna fallback caso contrário
- **Uso**: Login, FazendaForm, AssistenteInput, ChatInterface, CodePreview, HistoryPanel — evitar extração inline repetida de `err.response?.data?.error`

### **Header Responsivo**

- **Padrão**: Navegação desktop (lg:) com links visíveis; em mobile (< lg) menu hamburger que abre drawer lateral
- **Implementação**: `Header.tsx` — estado `mobileMenuOpen`, ícone Menu (lucide-react), overlay + painel fixo com links, email e Sair; fechar ao clicar no overlay ou no link. O assistente em linguagem natural (AssistenteInput) aparece apenas na página de listagem de fazendas (`/fazendas`), não no Header.
- **Ícones no menu**: Cada link de navegação exibe ícone + texto (Farm/Fazendas, Cow/Animais, Milk/Produção, Users/Admin, Code/Dev Studio) para reforço visual e reconhecimento rápido.
- **Toggle de tema**: Botão de alternar modo claro/escuro (ThemeToggle) no Header (desktop) e no menu mobile; alvo de toque mínimo 44px; ver seção "Padrões de UX e Acessibilidade".
- **Controle por perfil**: Menu de **Fazendas** aparece apenas para ADMIN/DEVELOPER; USER sem fazendas não vê itens de manutenção.

### **Padrões de UX e Acessibilidade**

Público-alvo: usuários leigos em sistemas e em sua maioria idosos; objetivo é navegação confortável e eficiente com identidade visual ligada ao meio rural.

- **Paleta rural** (`frontend/src/app/globals.css`):
  - **Modo claro**: Primária verde (pastagem) `152 42% 36%`; fundo off-white quente `40 18% 97%`; acento âmbar para hover; texto escuro contraste ≥ 4,5:1 (WCAG AA).
  - **Modo escuro**: Mesma identidade em tons escuros; fundo `152 18% 11%`; primária mais clara `152 48% 48%` para contraste.
  - Variáveis: `--primary`, `--secondary`, `--accent`, `--background`, `--foreground`, `--muted`, `--destructive`, `--border`, `--input`, `--ring`, `--radius` (0.625rem).
- **Modo claro e modo escuro**:
  - Toggle no Header e no menu mobile; ícone Sun/Moon; `aria-label` "Usar modo claro" / "Usar modo escuro".
  - Persistência em `localStorage` com chave `ceialmilk_theme` (valores `light` | `dark`). Script inline no layout aplica tema antes da hidratação para evitar flash.
  - Contexto: `ThemeContext` e `ThemeProvider` em `contexts/ThemeContext.tsx`; componente `ThemeToggle` em `components/layout/ThemeToggle.tsx`.
- **Tipografia**: Corpo e labels mínimo 16px (`text-base`); títulos de página 18–20px ou mais. Input e Label com `text-base`; Button com `text-base` e tamanhos que garantem legibilidade.
- **Alvos de toque**: Mínimo 44×44px para botões e links interativos (WCAG / Apple HIG). Button `size="default"` e `size="icon"` usam `min-h-[44px]`/`min-w-[44px]`; links do Header e CTAs principais seguem o mesmo critério.
- **Formulários**: `space-y-5` entre grupos; botão de envio `size="lg"`; mensagens de erro em `text-base`; tabelas com `overflow-x-auto` em mobile; botões Editar/Excluir nas tabelas com `size="default"` para toque.
- **Home autenticada**: Página inicial exibe atalhos grandes (Ver fazendas, Ver animais, Registrar produção) em cards com ícones e botão de ação; sem redirecionamento automático para listagem.

## 📊 Padrões de Monitoramento

### **Observability**

- **Metrics**: Prometheus para métricas de performance (futuro)
- **Tracing**: Distributed tracing com correlation IDs (implementado)
  - Correlation ID gerado automaticamente para cada request
  - Incluído em todos os logs e respostas HTTP (header `X-Correlation-ID`)
- **Logging**: Log aggregation via BetterStack/Logtail
  - Logs estruturados em JSON com correlation IDs
  - Middleware de logging automático para todas as requisições
  - Logs incluem: método, path, status, latency, IP, user agent, correlation ID
- **Health Checks**: Endpoints `/health` para verificação de saúde

### **Alerting Patterns**

- **Error Tracking**: Sentry para captura de erros em tempo real (implementado)
  - Captura automática de panics
  - Captura manual de erros nos handlers com contexto
  - Inclui correlation ID, path, método, user context
- **Threshold-based**: Alertas baseados em thresholds (futuro)
- **Notification Channels**: Email, Slack (futuro)

---

**Última atualização**: 2026-02-08
**Versão dos Padrões**: 2.6 (Go + Next.js) — Assistente Live: erros via WebSocket, reconexão com backoff, CheckOrigin em produção.
