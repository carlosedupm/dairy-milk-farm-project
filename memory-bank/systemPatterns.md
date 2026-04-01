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

**Onde entra a reutilização**: primitivos em `components/ui/`, blocos por domínio em `components/<área>/`, **lógica de rede e contratos** em `services/`, **helpers** em `lib/`, **hooks** em `hooks/` (ou junto ao domínio quando específicos). Detalhes na subseção **Frontend: DRY, composição e abstração de lógica** (abaixo, após a árvore de pastas).

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
├── layout/                     # Header, ConditionalHeader, AssistenteFab, AssistenteDialog, ProtectedRoute, Providers
└── ui/                         # Shadcn: button, card, dialog, input, label, table
services/                       # api.ts (Axios + interceptors), auth, fazendas, devStudio
hooks/                          # useGeminiLive, useVoiceRecognition, useMinhasFazendas (lógica reutilizável)
contexts/                       # AuthContext, AssistenteContext, FazendaContext, ThemeContext
lib/                            # utils.ts, errors.ts (getApiErrorMessage), etc.
```

### **Frontend: DRY, composição e abstração de lógica**

O frontend combina **DRY (Don't Repeat Yourself)**, **composition pattern** (React) e **abstração de lógica** em camadas. Objetivo: menos duplicação, componentes enxutos e regras fáceis de testar e alterar.

#### **DRY — uma única fonte de verdade**

- **HTTP e contratos de API**: funções em `frontend/src/services/*` (Axios, `withCredentials`); não repetir URLs, headers ou parsing bruto em componentes.
- **Erros de API**: sempre `getApiErrorMessage` (`lib/errors.ts`) em formulários, mutações e listagens com `useQuery` — evitar `err.response?.data` espalhado.
- **UI genérica**: Shadcn em `components/ui/`; não recriar botão/card/dialog ad hoc quando já existe primitivo.
- **Layouts e shells repetidos**: `PageContainer`, `GestaoListLayout`, `GestaoFormLayout`, `BackLink` — nova listagem de gestão deve reutilizar o layout em vez de copiar Card + header.
- **Formatação e regras puras**: datas em `lib/format.ts` (`formatDatePtBr`, `formatDateTimePtBr`, `formatDateTimePtBrOptional`); labels e maps (ex. `useAnimaisMap`, `folgas-utils`, `folgas-rodizio-utils`) em hooks ou módulos `.ts` compartilhados, não duplicados em cada página.

#### **Composition — compor em vez de inflar props**

- **Páginas (`app/*/page.tsx`)**: orquestram Query + layout + componentes de domínio; mantêm-se finas — a maior parte da UI vem de componentes filhos.
- **Containers com `children`**: layouts (`GestaoListLayout`, `PageContainer`) e Cards envolvem conteúdo variável; evitar componentes “god” com muitas flags (`showX`, `modeA`, `modeB`).
- **Encaixe de primitivos + domínio**: compor `Button`, `Dialog`, `Table` com componentes como `CioTable` ou `FazendaForm` em vez de um único arquivo gigante por rota.
- **Quando extrair**: se o JSX se repete entre duas rotas com a mesma estrutura, extrair um componente ou um layout; se só muda o corpo, usar `children`.

#### **Abstração de lógica — o que fica onde**

| Responsabilidade | Onde colocar |
|------------------|--------------|
| Chamadas HTTP, tipos de payload/resposta | `services/` |
| Cache, loading, erro, invalidação de dados remotos | TanStack Query nas páginas (ou hook dedicado se o fluxo crescer) |
| Estado global (auth, tema, fazenda ativa, assistente) | `contexts/` |
| Efeitos colaterais reutilizáveis (WebSocket, voz, lista de fazendas) | `hooks/` |
| Funções puras (datas, validações leves, mapeamentos) | `lib/format.ts`, `lib/errors.ts`, `lib/utils.ts` ou `components/<domínio>/*-utils.ts` |
| Apresentação e eventos locais | Componentes em `components/` |

- **Regra prática**: componente visual não deve embutir lógica de serialização de API ou regras de negócio extensas; delegar a service + hook/query e receber dados ou callbacks já prontos via props.
- **Anti-padrão**: copiar um bloco inteiro de `useQuery` + Card + tratamento de erro para cada página sem extrair padrão comum (quando já existir analogia clara, preferir layout/hook compartilhado).

#### **Referências no código**

- Composição + DRY de layout: `GestaoListLayout`, `GestaoFormLayout`, `PageContainer`, `ListCardLayout` (`components/layout/ListCardLayout.tsx` — card com título + ação opcional).
- Listagens com TanStack Query: `QueryListContent` (`components/layout/QueryListContent.tsx` — carregando / erro via `getApiErrorMessage` / children).
- DRY de erro: `getApiErrorMessage`.
- Abstração de domínio: `useAnimaisMap`, utilitários em `components/folgas/*-utils.ts`.
- Composition no Dev Studio: `ChatInterface`, `HistoryPanel`, `CodePreview` como blocos separados na página.
- Folgas (`/folgas`): lógica de queries, mutações, memos e estado de diálogos em `hooks/useFolgasPage.ts`; `app/folgas/page.tsx` compõe apenas layout e componentes de `components/folgas/`.

**Rotas API (referência)**:

- `POST /api/auth/login|logout|refresh|validate`
- `GET|POST|PUT|DELETE /api/v1/fazendas` (+ /count, /exists, /search/by-\*)
- `GET|POST /api/v1/fazendas/:id/fornecedores` + `GET|PUT|DELETE /api/v1/fornecedores/:id`
- `GET|POST /api/v1/fazendas/:id/areas` + `GET|PUT|DELETE /api/v1/areas/:id`
- `GET|POST /api/v1/areas/:id/analises-solo`
- `GET /api/v1/areas/:id/safras/:ano` + `POST|GET|PUT|DELETE /api/v1/safras-culturas`
- `GET|POST /api/v1/safras-culturas/:id/custos|producoes|receitas`
- `GET /api/v1/areas/:id/resultado/:ano` + `GET /api/v1/fazendas/:id/resultado-agricola/:ano`
- `GET /api/v1/fazendas/:id/fornecedores/comparativo/:ano`
- `GET /api/v1/fazendas/:id/usuarios-vinculados` (usuários com vínculo N:N à fazenda; acesso: vínculo ou gestão/admin/dev via `ValidateFazendaAccessOrGestao`)
- `GET|PUT /api/v1/fazendas/:id/folgas/config` | `GET /api/v1/fazendas/:id/folgas/escala` (resposta: `linhas` + `rodizio_por_dia` por data) | `GET /api/v1/fazendas/:id/folgas/resumo-equidade?inicio&fim` (GESTAO/ADMIN/DEVELOPER: registradas vs previstas do 5x1 por slot) | `POST /api/v1/fazendas/:id/folgas/gerar` | `POST /api/v1/fazendas/:id/folgas/alteracoes` | `POST /api/v1/fazendas/:id/folgas/justificativas` | `GET /api/v1/fazendas/:id/folgas/alteracoes` | `GET /api/v1/fazendas/:id/folgas/alertas`
- `GET /api/v1/dev-studio/usage` | `POST /api/v1/dev-studio/chat|refine|validate|implement` | `GET /history|/status/:id`

**Dev Studio – contexto da IA**:

- **Contexto tipo Cursor**: `loadTargetFilesForPrompt` infere arquivos-alvo (menu, Header, rota, link, dev-studio) e inclui o **estado atual** no contexto. Instruções no prompt: usar como base, preservar o resto; trabalhar como IDE.
- **Contexto do repositório**: Com `GITHUB_TOKEN` + `GITHUB_REPO` configurados, exemplos de código e arquivos-alvo vêm sempre da **branch de produção** (`GITHUB_CONTEXT_BRANCH`, default `main`) via `GitHubService.GetFileContent`. Fallback para disco local quando GitHub não está configurado.

**Assistente Virtual Multimodal Live**:
- **Acesso (UI)**: **FAB (botão flutuante)** fixo no canto inferior direito (`AssistenteFab`), visível apenas em rotas autenticadas; um toque abre o modal. O assistente **não fica no Header**; estado em `AssistenteContext`; modal em `AssistenteDialog` renderizado no layout (ConditionalHeader).
- **Arquitetura**: Streaming bidirecional via WebSocket (`/api/v1/assistente/live`).
- **Backend**: Proxy entre Frontend e Gemini API; Function Calling para acesso ao banco; controle de turno ativo por sessão (`BeginTurn`, `InterruptTurn`, `FinishTurn`) com contexto cancelável para barge-in real. Processa mensagens de texto `{ "text": "..." }` e sinal de interrupção `{ "type": "interrupt" }`; áudio bruto não é utilizado. Escritas no WebSocket são condicionadas ao turno ativo (`WriteWSJSONForTurn`/`WriteWSMessageForTurn`) para bloquear respostas antigas. Em falha (Gemini/rede), envia `{"type": "error", "content": "<mensagem amigável>"}`. **CheckOrigin**: em produção usa `CORS_ORIGIN`; em dev (localhost) aceita qualquer origem.
- **Frontend**: Hook `useGeminiLive` abre o WebSocket, envia `interrupt` antes de novos comandos no Live, trata reconexão com backoff (1s, 2s, 4s, máx. 3 tentativas), offline (`navigator.onLine` + eventos `online`/`offline`) e reconexão ao voltar à aba (`visibilitychange`). Callbacks `onReconnecting`/`onReconnected` para feedback em texto; tratamento de `type: "error"` para exibir e falar mensagem amigável.
- **Compatibilidade**: Funciona em qualquer navegador com WebSocket (incluindo mobile). Voz quando há `SpeechRecognition`/`webkitSpeechRecognition`; TTS quando há `speechSynthesis`. Fallback gracioso para texto quando voz não está disponível.
- **Contexto**: Injeção automática de `user_id` e `fazenda_id` (ativa) na inicialização da sessão.
- **Exibição da resposta (modo Live)**: Texto exibido como texto puro (`whitespace-pre-wrap`), sem interpretação de markdown (sem negrito a partir de `*`), para que o usuário não precise "falar" asterisco e TTS/visual permaneçam consistentes. Implementação: `AssistenteInput.tsx` — `<p className="text-foreground whitespace-pre-wrap">` em vez de ReactMarkdown.
- **Formato de resposta (API)**: O system instruction do Assistente Live e o prompt do endpoint interpretar instruem o modelo a responder em texto puro, sem markdown e sem asteriscos (*), para exibição e TTS consistentes.
- **UX uso sem fone**: Fala do usuário é prioridade. Barge-in no frontend ocorre em dois níveis: detecção precoce de fala (interim) para cortar TTS rapidamente e envio final do texto reconhecido. Anti-eco usa `isEchoTranscript` + `ECHO_PHRASES`, janela pós-TTS maior no mobile e reabertura inteligente do microfone no Live (respeitando fim do TTS/janela anti-eco). Prewarm de microfone usa `echoCancellation`, `noiseSuppression` e `autoGainControl`. UI mantém dicas: "Pode falar agora" e mensagem para uso com alto-falante.

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
Fazenda (1) ─── (N) Área (1) ─── (N) SafraCultura
SafraCultura (1) ─── (N) CustoAgricola
SafraCultura (1) ─── (N) ProducaoAgricola
SafraCultura (1) ─── (N) ReceitaAgricola
Fazenda (1) ─── (N) Fornecedor (referenciado por custos/receitas)
```

- **Vínculo usuário–fazenda**: Tabela `usuarios_fazendas` (usuario_id, fazenda_id). Um usuário pode ter várias fazendas vinculadas; quando há apenas uma, o sistema a considera automaticamente em formulários e atalhos.
- **Auto-vínculo backend (fazenda única)**: ao criar usuário via `POST /api/auth/register` ou `POST /api/v1/admin/usuarios`, se existir exatamente uma fazenda no sistema e o usuário estiver sem vínculos, o backend cria automaticamente o vínculo em `usuarios_fazendas`. O mesmo check roda em login/validate para backfill progressivo (idempotente) de usuários já existentes sem vínculo.
- **Atribuição de fazendas**: Somente o perfil **ADMIN** (ou DEVELOPER) pode atribuir fazendas a usuários, na tela de administração (editar usuário → seção "Fazendas vinculadas").
- **Perfil não editável**: Na edição de usuário, o campo perfil não pode ser alterado quando o usuário já for ADMIN ou DEVELOPER (somente leitura no frontend e preservação no backend).
- **Módulo agrícola**: domínio separado por safra/cultura para permitir cálculo de resultado agrícola por área/ano e consolidado por fazenda/ano, além de comparativo de fornecedores.

### **Reclassificação automática de categoria (gestão pecuária)**

A categoria do animal (BEZERRA, NOVILHA, MATRIZ, etc.) pode ser atualizada automaticamente por duas regras:

1. **Por primeiro parto**: Ao registrar um parto de uma fêmea com categoria BEZERRA ou NOVILHA, o sistema reclassifica para **MATRIZ** (implementado em `PartoService.Create`).
2. **Por idade (job/endpoint)**: Bezerras com `data_nascimento` preenchida e idade ≥ N meses são reclassificadas para **NOVILHA**. Execução via `POST /api/v1/animais/reclassificar-categoria?meses=12` (parâmetro `meses` opcional; padrão 12). Serviço: `ReclassificacaoCategoriaService.RunReclassificacaoPorIdade`. Animais já com `data_saida` preenchida são ignorados.

Para agendamento periódico (cron), chamar o endpoint acima (ex.: diariamente ou semanalmente) com um job externo ou scheduler.

### **Origem de aquisição (animais)**

O cadastro de animais distingue dois cenários via `origem_aquisicao` (NASCIDO | COMPRADO):

- **NASCIDO**: Animal nascido na propriedade — `data_nascimento` é obrigatória.
- **COMPRADO**: Animal comprado — `data_nascimento` não é obrigatória (muitas vezes desconhecida). Usar `data_entrada` como referência (data de aquisição).

Validação em `AnimalService.Create` e `AnimalService.Update`: para origem NASCIDO, exige `data_nascimento != nil`. Coluna `origem_aquisicao` com DEFAULT 'NASCIDO' para retrocompatibilidade (migration 13).

### **Vinculação do reprodutor em cobertura (monta natural)**

Para coberturas de tipo **MONTA_NATURAL**, o reprodutor (touro/boi) deve ser registrado. O sistema aceita:

- **`touro_animal_id`** (FK para `animais`): vincula diretamente ao animal cadastrado; validações: animal existe, sexo M, categoria TOURO ou BOI, mesma fazenda.
- **`touro_info`** (texto livre): alternativa quando o touro não está cadastrado (ex.: touro de aluguel).

Regras em `CoberturaService.Create` e `Update`: para MONTA_NATURAL, exige pelo menos um de `touro_animal_id` ou `touro_info`. A coluna `touro_animal_id` foi adicionada na migration 14.

Frontend: formulário de nova cobertura exibe `AnimalSelect` (reprodutoresOnly) para MONTA_NATURAL; CoberturaTable exibe coluna "Reprodutor" (identificação do animal ou `touro_info`).

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

- **Role-Based**: Controle de acesso baseado em roles (USER, FUNCIONARIO, GESTAO, ADMIN, DEVELOPER)
- **USER**: Perfil geral; acesso a Fazendas e Assistente.
- **FUNCIONARIO**: Pode visualizar módulo Folgas da fazenda vinculada e registrar **justificativa** apenas no próprio dia de folga (`POST .../folgas/justificativas`). Fora de Folgas, o acesso à UI e à API é **restrito** por matriz configurável (ver abaixo).
- **GESTAO**: Pode **configurar**, **gerar** e **alterar** escala de folgas (`RequireGestaoFolgas` = GESTAO, ADMIN ou DEVELOPER), com acesso a fazendas existentes mesmo sem vínculo N:N (via `ValidateFazendaAccessOrGestao`).
- **ADMIN**: Perfil para acesso à área administrativa (`/api/v1/admin/*`); requer `auth.RequireAdmin()` (ADMIN ou DEVELOPER).
- **DEVELOPER**: Perfil único no sistema (constraint no banco garante 1 apenas); acesso ao Dev Studio (`/api/v1/dev-studio/*`) e área Admin; requer `auth.RequireDeveloper()` para Dev Studio, `auth.RequireAdmin()` para Admin.
- **Resource Ownership**: Verificação de propriedade de recursos
- **Middleware de Autenticação**: Verificação de token em todas as rotas protegidas
- **Frontend (controle por perfil)**:
  - **USER**: não acessa manutenção de fazendas; `/fazendas` funciona como gateway de redirecionamento (onboarding/seleção/animais).
  - **ADMIN/DEVELOPER**: acesso completo às páginas de fazendas (listar/detalhar/criar/editar); em **`/folgas`** a fazenda efetiva vem das **fazendas vinculadas** (`GET /api/v1/me/fazendas` / `useMinhasFazendas`): uma única → sem seletor na página; várias → seletor na página + `setFazendaAtiva` (alinhado ao `FazendaSelector` no header).
  - **GESTAO**: em `/folgas`, mesmas ações de gestão da escala que admin/dev (usa fazenda ativa / vínculo).
  - **FUNCIONARIO**: em `/folgas`, apenas visualização e botão de justificativa no próprio dia de folga; **menu e rotas** limitados à área Folgas (`frontend/src/config/appAccess.ts`), com `RouteAccessGuard` redirecionando outras URLs e FAB do assistente oculto quando o perfil só tem Folgas.

### **Matriz de acesso por perfil (configurável)**

- **Frontend**: `frontend/src/config/appAccess.ts` — mapa `PERFIL_AREAS` (ex.: `FUNCIONARIO: ['folgas']`), helpers `getNavAreasForPerfil`, `isPathAllowedForPerfil`, `getDefaultLandingPath`, `showAssistenteForPerfil`. O `Header` monta o menu a partir dessa lista; `RouteAccessGuard` (`Providers.tsx`) redireciona utilizadores autenticados para a landing permitida se a rota não estiver autorizada. Rotas utilitárias: `/login`, `/registro`, `/onboarding`, `/fazendas/selecionar`.
- **Backend**: `backend/internal/auth/perfil_access.go` — `RequirePerfilAPIAccess()` aplicado após `AuthMiddleware` em todos os grupos `/api/v1/*` autenticados. Para **FUNCIONARIO**, apenas `GET /api/v1/me/*` e caminhos que casam com `/api/v1/fazendas/:id/folgas/...` (regex); demais endpoints retornam 403. Manter regras alinhadas ao TypeScript ao adicionar perfis ou áreas.

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
- **Combos/seletores**: usar `Select` do Shadcn para campos de seleção (evitar `<select>` nativo), incluindo formulários da área Admin (`/admin/usuarios`).

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

### **Módulo Gestão Pecuária**

- **Layout de listagem**: `GestaoListLayout` em `components/gestao/GestaoListLayout.tsx` — encapsula PageContainer, BackLink, Card, título e botão Novo (opcional via prop `newHref`).
- **Layout de formulário**: `GestaoFormLayout` em `components/gestao/GestaoFormLayout.tsx` — encapsula PageContainer, BackLink, Card, children, botão de envio e exibição de erro com `getApiErrorMessage`.
- **Hook useAnimaisMap**: Em `components/gestao/useAnimaisMap.ts` — busca animais da fazenda e retorna `Map<animal_id, identificacao>` para exibir nome do animal nas tabelas em vez do ID. Usa `Array.isArray(data) ? data : []` para garantir que sempre itera sobre um array (evita "animais is not iterable" quando a query está desabilitada ou retorna formato inesperado).
- **Tabelas**: CioTable, PartoTable, LactacaoTable, etc. em `components/gestao/` — usam `useAnimaisMap`, Table Shadcn, formatDate em pt-BR. CioTable inclui Editar e Excluir (Dialog de confirmação).
- **Formulários**: Select Shadcn para enums (tipo, resultado, método, intensidade); AnimalSelect para seleção de animal; `getApiErrorMessage` para erros da API.
- **Campos de data**: Quando for apenas **data** (ex.: início de lactação, data de secagem, **data de fundação da fazenda**, **plantio/colheita**, custos/produções/receitas agrícolas, **análises de solo**), usar **DatePicker** (`components/ui/date-picker`) com `value`/`onChange` em `YYYY-MM-DD`. **Não** usar `Input type="date"`. Quando for **data e hora** (ex.: cio detectado, cobertura, toque, parto), usar `Input type="datetime-local"`.
- **Edição/exclusão**: Atualmente apenas Cios tem fluxo completo (página editar + Dialog de confirmação para excluir). Próximo passo: estender para coberturas, toques e secagens usando Cios como referência (backend PUT/DELETE + frontend página editar e coluna Ações na tabela).

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
- **Menu Agricultura**: Link dedicado no Header (`Wheat`) com navegação para `/agricultura`, tanto no desktop quanto no menu mobile.
- **Menu Folgas**: Link no Header (`CalendarDays`) para `/folgas` (escala 5x1 por fazenda).
- **Fazenda ativa (`FazendaContext` + `FazendaSelector`)**: `getMinhasFazendas` no carregamento; **0** fazendas → limpa estado; **1** → sempre define como ativa e grava `ceialmilk_fazenda_ativa`; **2+** → restaura `savedId` se ainda válido. **`FazendaSelector`**: componente retorna `null` quando `fazendas.length <= 1` (sem dropdown desnecessário).
- **Folgas — visualização para gestão**: Seletor opcional “Visualizar folgas de” em `app/folgas/page.tsx`; estado de filtro acoplado a `{ fazendaId, usuarioId }` para invalidar ao mudar de fazenda sem `useEffect` de reset; células com destaque (`ring-primary`) ou esmaecidas conforme o funcionário escolhido.
- **Folgas — componentes e formulários**: `frontend/src/components/folgas/` — `folgas-utils.ts` (`toYMD`, `parseApiDate`), `folgas-rodizio-utils.ts` (`labelRodizioPrevisto` para texto completo em dialog/tooltip), `folgas-cell-tooltip.ts` (tooltip desktop quando há conteúdo), `FolgasCalendarioDia.tsx` (grade enxuta: previsto curto só com folga prevista; contagem `1 folga` / `N folgas` ou “Meu dia”; `—` sem folga; “Exceção” curto; **mobile**: célula inteira `role="button"` + toque/teclado abre detalhes; **fora do rodízio**: ponto âmbar no mobile, badge texto em `md+`; botão **Ver detalhes** apenas `md+`), `FolgasDiaDetalhesDialog.tsx` (texto completo do rodízio, registros, motivos por perfil, Alterar/Justificar), `FolgasHistoricoTable.tsx` (cards mobile / tabela desktop). Na página: **Gerar mês automático** usa `inicioMes`/`fimMes` do **mês navegado**; painel **Equidade** + aviso âmbar; confirmação extra ao substituir fora do previsto. **Tratamento de conflito** duplicidade → mensagem orientativa. **DatePicker** âncora; **`size="lg"`** em ações principais dos dialogs.
- **Folgas — layout mobile-first (mantendo grade)**: em `/folgas`, os blocos informativos de Alertas/Equidade ficam colapsáveis no mobile (`details/summary`) e expandidos no desktop (`Card`), reduzindo rolagem antes do calendário.
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

**Versão dos Padrões**: 2.18 (Go + Next.js) — `lib/format.ts`, listagens DRY, `useFolgasPage` para Folgas.

**Última atualização**: 2026-04-01 (campos de data: DatePicker em fazenda/agricultura; sem `Input type="date"`)
