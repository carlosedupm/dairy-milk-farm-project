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
│   └── list/                   # MobileListCard, ListRowActionsMenu, ResponsiveListContainer, DeleteRecordDialog
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
- **Paginação**: usar `ListPaginationBar` (`frontend/src/components/ui/pagination.tsx`) com `total`, `pageSize`, `offset` e callbacks; APIs offset/limit — ver `listPaginated` em `services/animais.ts`. **Exceção — timeline da ficha**: tab **Ciclo** → `AnimalCicloTimelineSection` (`useInfiniteQuery`, tipo fixo `ciclo`); tab **Histórico** → `AnimalTimelineSection` (filtros `todos|saude|alertas|vacinas`, URL `&tipo=`); mini-timeline na Visão Geral (`maxItems=5`); invalidar via `invalidateAnimalTimeline`. Links: `lib/animalFichaLinks.ts` (`animalFichaCicloHref`). Debounce em busca: `useDebouncedValue`.
- **Busca rápida por animal (identificação)**: um único **`AnimalSearchPanel`** (`components/animais/AnimalSearchPanel.tsx`) — debounce ~400 ms, **Enter** dispara busca imediata no mesmo `<form>`, contador em **`useRef`** para descartar respostas HTTP obsoletas quando o termo muda rápido — no **header global** (`HeaderBuscaTrigger` + `useAdaptiveSearch` + `AnimalSearchDialogContext` em `Providers.tsx`) e atalho **«Buscar animal»** no `Dashboard` (mobile); **sem** card duplicado no corpo da home (desktop). **Header**: campo fixo «Brinco ou nome»; **lazy render** — no first paint só o input; `AnimalSearchPanel` carregado via **`next/dynamic`** (`ssr: false`); Popover (desktop) / Dialog (mobile) montam apenas quando `panelActive` em `useAdaptiveSearch` (foco, clique, `openSearch()` ou termo com ≥2 caracteres); desmontagem completa ao fechar (ESC/blur/`resetSearch`). **desktop (`lg+`)** — input no header + resultados em **Popover** (`variant="header"`, input oculto no painel, termo controlado pelo header); **mobile** — input compacto na barra abre **Dialog** com painel completo (`autoFocus` no campo do diálogo). **Reset ao navegar**: `Header` passa `key={pathname}` a `HeaderBuscaTrigger` para remontar o campo a cada rota (limpa termo/overlays). API do contexto: `openSearch()` / `registerSearchField` (atalhos e item do drawer «Ir para busca no topo»). ARIA: `aria-expanded`, `aria-controls` (só com painel activo), `aria-haspopup` no input; ids `header-search-popover` / `header-search-dialog`; foco retorna ao input ao fechar overlay. Classes partilhadas: `animalSearchOverlay.ts` (incl. `safe-area-inset-top` no Dialog). **Paginação (BR-ANIMAIS-009)**: `GET /api/v1/animais/search/by-identificacao` com `limit=20` (default), `offset` e resposta `{ animais, total, limit, offset }`; UI «Mostrando X de Y resultados» + botão **Ver mais** (append); índice GIN `pg_trgm` em `animais.identificacao` (migration 35). **Relevância (BR-ANIMAIS-012)**: ordenação SQL exato → prefixo → contains → equivalente; desempate `created_at DESC`; header envia `fazenda_id` da fazenda ativa; rótulos via `formatAnimalSearchLabel` (`animalSearchUtils.ts`). **Resumo contextual**: após escolher resultado, card de preview (`Link` para `/animais/:id`, hint «Abrir ficha» + `ChevronRight`, `min-h-[44px]`, `onAntesNavegarDetalhe` fecha overlay) — alinhado a `MobileListCard`. Serviços: `searchByIdentificacao` + `getContexto` em `services/animais.ts`.
- **Listagens responsivas (mobile &lt; `md`)**: `ResponsiveListContainer` + `MobileListCard` + `ListRowActionsMenu` + `DeleteRecordDialog` em `components/layout/list/` — ver bullet homónimo em **Padrões de UX e Acessibilidade**. Novas tabelas com coluna Ações devem seguir o mesmo padrão (não duplicar markup card/tabela).
- **Scroll infinito mobile (t_ds_007)**: **`useMobileInfiniteList`** (`hooks/useMobileInfiniteList.ts`) — `useInfiniteQuery` + `IntersectionObserver` (`rootMargin: 200px`, `threshold: 0`); modo **`clientPages`** para listas já carregadas no cliente (produção, coberturas, em lactação); **`MobileInfiniteListFooter`** + **`MobileInfiniteListSkeleton`** após a tabela. **Desktop (`md+`)**: `ListPaginationBar` com `className="hidden md:flex"`; **mobile**: sem barra, sentinela + skeleton (4 rows) + «Carregando…» (`aria-live="polite"`) + «Todos os itens carregados (N)». Filtros: `resetDeps` + `queryKey` com critérios (scroll ao topo só quando filtros mudam, não no mount). Rotas: `/animais`, `/producao`, `/alertas`, `/gestao/coberturas`. Referência histórica: `AnimalTimelineSection.tsx`.
- **Listagens com muitos filtros (mobile-first)**: manter o critério principal (ex.: **identificação**) sempre na vista; demais filtros num painel secundário — **`Popover`** a partir de `md` e **`Dialog`** em viewport estreita — com **`Badge`** indicando quantos filtros avançados estão ativos, **chips** para remover um critério sem reabrir o painel e ações “Limpar filtros avançados” / “Limpar tudo”. **Total de resultados** (`resultCount`) só no **`Dialog` (mobile)** junto aos botões do rodapé — no desktop o utilizador vê o total na página atrás do Popover. Breakpoint: `useMediaQuery("(min-width: 768px)")` em `hooks/useMediaQuery.ts`. Implementação de referência: `AnimaisListToolbar`. Toolbars simples de gestão reutilizam **`ResponsiveFiltersShell`** (`components/layout/ResponsiveFiltersShell.tsx`) — grid inline em `md+`, botão «Filtros» + Dialog em mobile.
- **URL-sync de filtros (t_ds_006)**: **`useFilterSync`** (`hooks/useFilterSync.ts`) — fonte de verdade na query string; config por listagem via `FilterFieldDef[]` (`key`, `param`, `parse`, `serialize`, `isDefault`); `setFilter` / `setFilters` / `clearFilters` com `router.replace(..., { scroll: false })`; `preserveParams` para deep-links (`em_lactacao` em `/animais`, `fazenda_id` em `/producao`). Utilitários em **`lib/filter-url.ts`**: `isValidYmd`, `parseDateRange` (descarta par inválido ou `start > end`), `formatListCountSuffix` → título `(N de M)` ou `(N)`. **Período nas toolbars**: **`PeriodFilter`** (`components/filters/PeriodFilter.tsx`) — dois `DatePickerUnificado` (`showConfirmationMessage={false}`), validação visível «Data início não pode ser maior que data fim» (`getPeriodRangeOrderError` em `lib/period-filter.ts`). **Filtro client-side** (coberturas, cios, partos, secagens, lactações, gestações): `parseDateRange` exige **par completo** (`start` + `end` válidos, `start ≤ end`) — um campo só não filtra; URL só serializa par válido. **Server-side** (`/producao`, `/alertas`): default 30 dias via `getDefaultServerListPeriod`; consulta API via **`resolveServerListPeriodForApi`** — retorna `null` se `start > end` (query desativada; sem fallback silencioso para 30 dias enquanto UI mostra intervalo inválido). **`/gestao/toques`**: um `DatePickerUnificado` (`data` na URL; default hoje na API quando param ausente). Convenção de params: `animal_id`, `start`/`end`, `data` (toques), `q` (fazendas), `status`/`tipo`/`severidade`, `partos_dias=7`, `lactacao_id`. Páginas com hook devem estar em `<Suspense>`. **Debounce na URL**: não usar — escrever diretamente ao mudar; debounce só na query API (ex.: `useDebouncedValue` em `/animais` para `identificacao`). Filtro client-side gestão: `lib/gestao-period-filter.ts` + `GestaoPeriodListToolbar`; configs dedicadas: `lib/*-filter-sync.ts`, `lib/gestacoes-list-filter.ts`.
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
| Efeitos colaterais reutilizáveis (WebSocket, voz, lista de fazendas, breakpoint) | `hooks/` |
| Funções puras (datas, validações leves, mapeamentos) | `lib/format.ts`, `lib/errors.ts`, `lib/utils.ts` ou `components/<domínio>/*-utils.ts` |
| Apresentação e eventos locais | Componentes em `components/` |

- **Regra prática**: componente visual não deve embutir lógica de serialização de API ou regras de negócio extensas; delegar a service + hook/query e receber dados ou callbacks já prontos via props.
- **Anti-padrão**: copiar um bloco inteiro de `useQuery` + Card + tratamento de erro para cada página sem extrair padrão comum (quando já existir analogia clara, preferir layout/hook compartilhado).

#### **Referências no código**

- Composição + DRY de layout: `GestaoListLayout`, `GestaoFormLayout`, `PageContainer`, `ListCardLayout` (`components/layout/ListCardLayout.tsx` — card com título + ação opcional).
- Listagens com TanStack Query: `QueryListContent` (`components/layout/QueryListContent.tsx` — carregando / erro com `EmptyState` variant `error` + `onRetry` / children).
- Estado vazio de listagem: `EmptyState` (`components/ui/empty-state.tsx` — ícone Lucide 48px em círculo; `animate-in fade-in`; variantes `default`|`error`|`success`; `filterTerm` → título `Nenhum resultado para "{termo}"` + descrição «Tente ajustar os filtros»; CTAs `w-full sm:w-auto`, `min-h-[44px]`); composição DRY via `ListEmptyState` (`components/layout/ListEmptyState.tsx` — empty vs filtrado, CTA registro condicional, «Limpar filtros»); alertas sem dados = `success` sem CTA; permissões via `appAccess` (`canRegistrarProducao`, `canManageAnimais`, etc.).
- DRY de erro: `getApiErrorMessage`.
- Abstração de domínio: `useAnimaisMap`, utilitários em `components/folgas/*-utils.ts`.
- Filtros em listagem: `AnimaisListToolbar` (`components/animais/AnimaisListToolbar.tsx`) — busca + Popover/Dialog (`useMediaQuery`); `resultCount`/`listLoading` só para resumo no Dialog mobile.
- Composition no Dev Studio: `ChatInterface`, `HistoryPanel`, `CodePreview` como blocos separados na página.
- Folgas (`/folgas`): lógica de queries, mutações, memos e estado de diálogos em `hooks/useFolgasPage.ts`; `app/folgas/page.tsx` compõe apenas layout e componentes de `components/folgas/`.
- Alertas (`/alertas`): `hooks/useAlertasPage.ts` + `components/alertas/` (`AlertasListToolbar`, `AlertasTable`, `CriarAlertaDialog`, `alertas-utils.ts`); regra Cursor espelha checklist em `.cursor/rules/frontend-ui-patterns.mdc`.

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
- `GET|POST|PUT|DELETE /api/v1/producao` (+ `GET /count`, `GET /filter/by-date?start&end&fazenda_id&lactacao_id`) — listagens filtradas pelas fazendas do usuário; query `fazenda_id` opcional restringe a uma fazenda vinculada; `lactacao_id` opcional filtra registos vinculados à lactação (valida acesso à fazenda da lactação)
- `GET /api/v1/animais/:id/producao` (+ `/count`, `/resumo`) — histórico e resumo por animal; resposta inclui `lactacao_id`; UI agrupada em `/animais/:id/producao`; `POST /api/v1/producao` preenche `lactacao_id` automaticamente (ver `docs/business/producao-leite.md` BR-PRODUCAO-006)
- `GET|POST /api/v1/animais/:id/saude` + `GET|PUT|DELETE /api/v1/animais/:id/saude/:saudeId` — CRUD de saúde animal por sub-recurso; create/update/delete recalculam `animais.status_saude` com base nos casos ativos (`EM_TRATAMENTO` > `DOENTE` > `SAUDAVEL`)
- `GET /api/v1/animais/:id/contexto` — estado atual, gestação, lactação, restrição, `tratamentos_ativos[]` (TRATAMENTO/CIRURGIA ATIVOS), `animal.status_saude`, próximas ações (sem timeline)
- `GET /api/v1/animais/:id/timeline?limit=&offset=&tipo=` — histórico paginado (`todos|ciclo|saude|alertas|vacinas`); resposta `{ timeline, total }`
- `GET|POST /api/v1/animais/:id/vacinas` + `GET|PUT|DELETE /api/v1/animais/:id/vacinas/:vacinaId` + `PATCH .../:vacinaId/aplicar` — calendário de vacinação (BRF-001, BR-SAUDE-007–011); status derivado (`PREVISTA|APLICADA|ATRASADA|REFORCO_VENCIDO`); aplicar → auto-resolve alertas + caso PREVENTIVO em `animal_saude` (`vacina_id`); FUNCIONARIO: GET + POST aplicada + PATCH aplicar (agendar/PUT/DELETE → 403, BR-ACESSO-022)
- `GET /api/v1/fazendas/:id/animais/em-lactacao` (animais com lactação ativa; mesma autorização que listagem por fazenda)
- `GET /api/v1/fazendas/:id/animais/para-cobertura` | `para-toque` | `para-parto` | `para-abertura-lactacao` — listagens de elegibilidade por marco do ciclo (BR-CICLO-015); `AnimalSelect` com `cicloContext` no frontend
- `GET /api/v1/fazendas/:id/restricoes-leite/ativas` | `POST /api/v1/fazendas/:id/restricoes-leite` | `PATCH /api/v1/fazendas/:id/restricoes-leite/:restricaoId/liberar` (descarte até laboratório; ver `docs/business/leite-restricoes.md`)
- `GET /api/v1/dev-studio/usage` | `POST /api/v1/dev-studio/chat|refine|validate|implement` | `GET /history|/status/:id`

**Dev Studio – contexto da IA**:

- **Contexto tipo Cursor**: `loadTargetFilesForPrompt` infere arquivos-alvo (menu, Header, rota, link, dev-studio) e inclui o **estado atual** no contexto. Instruções no prompt: usar como base, preservar o resto; trabalhar como IDE.
- **Contexto do repositório**: Com `GITHUB_TOKEN` + `GITHUB_REPO` configurados, exemplos de código e arquivos-alvo vêm sempre da **branch de produção** (`GITHUB_CONTEXT_BRANCH`, default `main`) via `GitHubService.GetFileContent`. Fallback para disco local quando GitHub não está configurado.

**Assistente Virtual Multimodal Live**:
- **Acesso (UI)**: **FAB (botão flutuante)** fixo no canto inferior direito (`AssistenteFab`), visível apenas em rotas autenticadas; um toque abre o modal. O assistente **não fica no Header**; estado em `AssistenteContext`; modal em `AssistenteDialog` renderizado no layout (ConditionalHeader).
- **Arquitetura**: Streaming bidirecional via WebSocket (`/api/v1/assistente/live`).
- **Backend**: Proxy entre Frontend e Gemini API; Function Calling para acesso ao banco (`assistente_live_service.go` → services de domínio); controle de turno ativo por sessão (`BeginTurn`, `InterruptTurn`, `FinishTurn`) com contexto cancelável para barge-in real. Processa mensagens de texto `{ "text": "..." }` e sinal de interrupção `{ "type": "interrupt" }`; áudio bruto não é utilizado. Escritas no WebSocket são condicionadas ao turno ativo (`WriteWSJSONForTurn`/`WriteWSMessageForTurn`) para bloquear respostas antigas. Em falha (Gemini/rede), envia `{"type": "error", "content": "<mensagem amigável>"}`. **CheckOrigin**: em produção usa `CORS_ORIGIN`; em dev (localhost) aceita qualquer origem.
- **Function Calling (Live)**: tools em `getFunctionDeclarations()`; execução em `ExecuteFunction(ctx, call, userID, perfil, fazendaAtivaID)`. Domínios: fazendas, animais, produção, ciclo reprodutivo, lotes, **saúde** (`consultar_saude`, `registrar_saude` → `AnimalSaudeService`), **alertas** (`listar_alertas`, `resolver_alerta` → `AlertaService` + RBAC BR-ALERTA-007 via `perfil`). Animais identificados por `identificacao` (string falada). Sem tools de exclusão de saúde/alertas. Público: GERENTE+ (`FUNCIONARIO` bloqueado na API/UI).
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

- **Vínculo usuário–fazenda**: Tabela `usuarios_fazendas` (`usuario_id`, `fazenda_id`, **`papel`**: `TITULAR` | `OPERACIONAL`). Um usuário pode ter várias fazendas vinculadas; quando há apenas uma, o sistema a considera automaticamente em formulários e atalhos. **Titularidade de exploração** (para relatórios e regras): filtrar por `papel = TITULAR`; vínculos criados só pelo admin (`PUT .../usuarios/:id/fazendas`) usam **`OPERACIONAL`** no MVP; `POST /me/fazendas` por **PROPRIETARIO** grava **`TITULAR`**.
- **Registo público e vínculo manual**: `POST /api/auth/register` cria utilizador com perfil **`USER`** e **sem** linhas em `usuarios_fazendas`. **Não** há auto-vínculo por “fazenda única” em Register, Login, Validate nem em `POST /api/v1/admin/usuarios` — a provisão é feita por **ADMIN/DEVELOPER** (`PUT /api/v1/admin/usuarios/:id/fazendas` e alteração de `perfil`).
- **Catálogo global de fazendas (API)**: `GET /api/v1/fazendas` (raiz), pesquisas (`/search/*`), `GET /count` e `GET /exists` exigem **`RequireAdmin()`** (ADMIN ou DEVELOPER). Utilizadores não-admin listam apenas **as suas** fazendas via `GET /api/v1/me/fazendas`. Perfil do utilizador logado: `GET /api/v1/me` → `{ id, nome, email, perfil }`.
- **Atribuição de fazendas**: Somente o perfil **ADMIN** (ou DEVELOPER) pode atribuir fazendas a usuários, na tela de administração (editar usuário → seção "Fazendas vinculadas").
- **Perfil não editável**: Na edição de usuário, o campo perfil não pode ser alterado quando o usuário já for ADMIN ou DEVELOPER (somente leitura no frontend e preservação no backend).
- **Módulo agrícola**: domínio separado por safra/cultura para permitir cálculo de resultado agrícola por área/ano e consolidado por fazenda/ano, além de comparativo de fornecedores.

### **Reclassificação automática de categoria (gestão pecuária)**

A categoria do animal (BEZERRA, NOVILHA, MATRIZ, etc.) pode ser atualizada automaticamente por duas regras:

1. **Por primeiro parto**: Ao registrar um parto de uma fêmea com categoria BEZERRA ou NOVILHA, o sistema reclassifica para **MATRIZ** (implementado em `PartoService.Create`).
2. **Por idade (job/endpoint)**: Bezerras com `data_nascimento` preenchida e idade ≥ N meses são reclassificadas para **NOVILHA**. Execução via `POST /api/v1/animais/reclassificar-categoria?meses=12` (parâmetro `meses` opcional; padrão 12). Serviço: `ReclassificacaoCategoriaService.RunReclassificacaoPorIdade`. Animais já com `data_saida` preenchida são ignorados.

Para agendamento periódico (cron), chamar o endpoint acima (ex.: diariamente ou semanalmente) com um job externo ou scheduler.

### **Alertas automáticos (geração diária — Onda 2.2)**

- **Serviço**: `AlertaGeracaoService.GerarAlertasDiarios` — seis regras (tratamento vencido, parto previsto, restrição leite, não-conformidade INT-*, gestação sem secagem, cio do dia).
- **Deduplicação**: `ExistsOpenByFazendaTipoAnimal` + índice parcial `uq_alertas_aberto_tipo_animal` (migration 32).
- **Resolução automática**: `ResolveOpenByAnimal` após concluir tratamento, registrar secagem ou liberar restrição (`AlertaAutoResolver` injetado nos services).
- **Agendamento**: goroutine `RunAlertasCron` no startup (`ALERTAS_CRON_ENABLED`, `ALERTAS_CRON_HOUR`, `ALERTAS_TZ`); disparo manual `POST /api/v1/admin/alertas/gerar` (ADMIN/DEVELOPER).
- **Actor sistema**: `created_by` = utilizador `sistema@interno.ceialmilk` (migration 32); snapshot INT em `alertas_geracao_estado`.
- **Catálogo**: `docs/business/alertas.md` (BR-ALERTA-008 a BR-ALERTA-010).

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
- **Sub-recursos de ação**: operações de domínio que não são CRUD genérico usam rotas dedicadas — ex.: `POST /api/v1/animais/:id/baixa` e `POST .../baixa/reverter` (`AnimalBaixaService`, transação única espelhando `SecagemService`). Campos de saída (`data_saida`, `motivo_saida`, `observacao_saida`) **não** vão no `PUT` genérico do animal.
- **Sub-recursos de domínio (CRUD contextual)**: quando o dado pertence intrinsecamente ao animal, usar sub-recurso em `/api/v1/animais/:id/*` (ex.: saúde animal em `/saude`) com validação de acesso via fazenda do animal e guarda de rebanho no service.
- **Filtro operacional em listagem**: query `rebanho=ativos|baixa|todos` (alias `no_rebanho` boolean) em `GET /api/v1/animais` — default **ativos** = `(data_saida IS NULL OR data_saida > CURRENT_DATE)`; busca por identificação e M2M seguem o mesmo critério por defeito.
- **Guarda transversal**: `EnsureAnimalNoRebanho` nos services de ciclo/produção → HTTP 400 com `ANIMAL_FORA_REBANHO`.
- **Conformidade (auditoria + preventiva)**: `ConformidadeService` — INT-001 a INT-006 com `repository.SQLNoRebanhoFor("a")` (painel, BR-AUDIT-009); INT-007 pós-baixa. **Escrita**: `ciclo_integridade.go` + `RespondIfIntegridadeCiclo` bloqueiam novas violações (BR-AUDIT-010) — produção na data (INT-002), PRENHE com gestação (INT-005), parto encerra lactação antes da nova (INT-001), toque+/restrição/baixa já cobertos nos respetivos services.
- **HTTP Verbs**: GET, POST, PUT, DELETE, PATCH
- **Status Codes**: Uso apropriado de códigos HTTP (200, 201, 400, 401, 404, 500)
- **JSON**: Formato padrão de request/response

### **Versioning**

- **URL Path**: `/api/v1/{recurso}`
- **Backward Compatibility**: Mantida por pelo menos 1 versão

### **Response Format**

- **Escopo**: padrão oficial para respostas de sucesso das rotas de domínio (`/api/auth/*` e `/api/v1/*`) via `internal/response`.
- **Exceções técnicas documentadas**: `GET /health` e fallback degradado de `/api/*` em `cmd/api/main.go` usam payload técnico simplificado (fora do envelope `data/message/timestamp`) por objetivo operacional.

```json
{
  "data": { ... },
  "message": "Success",
  "timestamp": "2026-01-24T10:00:00Z"
}
```

### **Error Response Format**

- **Escopo**: padrão oficial para erros das rotas de domínio (`/api/auth/*` e `/api/v1/*`) via `internal/response`.
- **Exceções técnicas documentadas**: `GET /health` e fallback degradado de `/api/*` em `cmd/api/main.go` seguem payload técnico simplificado para diagnóstico de disponibilidade.

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
- **Refresh Tokens**: Vida longa (7 dias), em cookies HttpOnly; no banco fica apenas o **hash SHA-256** (`refresh_token_service.go`), nunca o token em claro
- **Rotação de refresh token**: cada `POST /api/auth/refresh` revoga o token usado e emite um novo (`RefreshTokenService.Rotate`) — token roubado expira no primeiro uso legítimo
- **Tokens fora do JSON**: login/refresh **não** retornam `access_token`/`refresh_token` no corpo; somente cookies HttpOnly (reduz superfície XSS)
- **Password Hashing**: BCrypt com custo 10; senha mínima **8 caracteres** validada front+back (BR-ACESSO-024)
- **Token Refresh**: Endpoint `/api/auth/refresh` para renovar access tokens usando refresh tokens

### **Autorização**

- **Role-Based**: Controle de acesso baseado em roles (`USER`, `FUNCIONARIO`, `GERENTE`, `GESTAO`, `PROPRIETARIO`, `ADMIN`, `DEVELOPER`)
- **USER**: Perfil **pendente de provisão** após registo público: na UI só rotas utilitárias (`/`, `/onboarding`, `/fazendas`, `/fazendas/selecionar/*`) até ter fazenda e perfil adequados. **Não** cria fazenda via `POST /api/v1/me/fazendas` (bloqueado em `requestAllowedForUser` e no serviço). Na API, `RequirePerfilAPIAccess` permite `GET /api/v1/me` e prefixo `/api/v1/me/` com exceção explícita desse `POST`; demais `/api/v1/*` retornam 403 enquanto `perfil` for `USER`.
- **PROPRIETARIO**: Titular da exploração; acesso operacional completo na UI alinhado a `GERENTE`/`GESTAO` para navegação, **sempre** filtrado por `usuarios_fazendas`. Não acede a `/api/v1/admin/*` nem à listagem global de fazendas.
- **FUNCIONARIO**: Pode acessar a home (`/`), visualizar Folgas da fazenda vinculada e registrar **justificativa** apenas no próprio dia de folga (`POST .../folgas/justificativas`); também acessa Gestão parcial (Cios/Coberturas/Partos/Secagens) e Animais em modo consulta; na home pode **registrar** restrição de leite (`POST .../restricoes-leite`) e listar ativas, mas **não** liberar após laboratório (`PATCH .../liberar` → 403). Em saúde animal: `GET|POST` em `/api/v1/animais/:id/saude` (`funcionarioAnimaisSaudePath`); `PUT|DELETE` → 403. Em vacinas: `GET` + `POST` (só aplicada — sem `data_aplicacao` → 403 no service) + `PATCH .../aplicar` (`funcionarioAnimaisVacinasPath`); `PUT|DELETE` → 403 (BR-ACESSO-022). Escritas genéricas de Animais seguem bloqueadas por matriz configurável (ver abaixo).
- **GESTAO**: Pode **configurar**, **gerar** e **alterar** escala de folgas (`RequireGestaoFolgas` inclui `PROPRIETARIO` e `GERENTE`), com **atalho sem vínculo** a qualquer fazenda existente apenas para **GESTAO**, **ADMIN** e **DEVELOPER** (`PodeAcessarFazendaSemVinculoGestao` em `ValidateFazendaAccessOrGestao` e `validarAcessoFazenda`).
- **GERENTE**: Gere escala de folgas nas fazendas **vinculadas**; **não** utiliza atalho sem vínculo (isolamento por fazenda).
- **ADMIN**: Perfil para acesso à área administrativa (`/api/v1/admin/*`); requer `auth.RequireAdmin()` (ADMIN ou DEVELOPER).
- **DEVELOPER**: Perfil único no sistema (constraint no banco garante 1 apenas); acesso ao Dev Studio (`/api/v1/dev-studio/*`) e área Admin; requer `auth.RequireDeveloper()` para Dev Studio, `auth.RequireAdmin()` para Admin.
- **Resource Ownership**: Verificação de propriedade de recursos
- **Middleware de Autenticação**: Verificação de token em todas as rotas protegidas
- **Frontend (controle por perfil)**:
  - **USER**: modo `pending` em `appAccess.ts` — sem módulos operacionais nem assistente até elevação de perfil; `/fazendas` como gateway (onboarding/seleção); **sem** `/fazendas/criar-minha` na whitelist.
  - **ADMIN/DEVELOPER**: acesso completo às páginas de fazendas (listar/detalhar/criar/editar); em **`/folgas`** a fazenda efetiva vem das **fazendas vinculadas** (`GET /api/v1/me/fazendas` / `useMinhasFazendas`): uma única → sem seletor na página; várias → seletor na página + `setFazendaAtiva` (alinhado ao `FazendaSelector` no header).
  - **PROPRIETARIO** / **GERENTE** / **GESTAO**: em `/folgas`, uso de fazendas vinculadas + seletor quando aplicável; **PROPRIETARIO** e **GERENTE** sem listagem global de fazendas.
  - **FUNCIONARIO**: acesso a `/`, `/folgas`, Gestão parcial (`/gestao/cios*`, `/gestao/coberturas*`, `/gestao/partos*`, `/gestao/secagens*`) e Animais em consulta (`/animais`, `/animais/:id`); UI oculta ações de criar/editar/excluir em Animais e rotas fora da whitelist são redirecionadas pelo `RouteAccessGuard`.

### **Matriz de acesso por perfil (configurável)**

- **Frontend**: `frontend/src/config/appAccess.ts` — mapa `PERFIL_AREAS` (FUNCIONARIO com `animais`, `gestao`, `folgas`); modo **`pending`** para `USER` (sem áreas de menu, caminhos mínimos: `/` e `/fazendas`, sem criar-minha). `isPathAllowedForPerfil` inclui whitelist para FUNCIONARIO e para USER (`/`, `/fazendas`, utilitários). Helpers: `getNavAreasForPerfil`, `getDefaultLandingPath`, `showAssistenteForPerfil`. `RouteAccessGuard` (`Providers.tsx`) redireciona utilizadores autenticados quando a rota não está autorizada. Rotas utilitárias: `/login`, `/registro`, `/onboarding`, `/fazendas/selecionar`.
- **Backend**: `backend/internal/auth/perfil_access.go` — `PerfilTemAcessoAPICompleta` é falso para **FUNCIONARIO** e **USER**. `RequirePerfilAPIAccess()` aplica whitelist: para **USER**, `GET /api/v1/me` e prefixo `/api/v1/me/`; para **FUNCIONARIO**, conjunto documentado em `requestAllowedForFuncionario` (incl. `GET /api/v1/me`, folgas, restricões de leite, animais GET, gestão, etc.); demais endpoints retornam 403. Manter regras alinhadas ao TypeScript.

### **Pós-login (resolução de destino por perfil)**

- **Frontend**: `frontend/src/app/login/page.tsx` (`resolvePostLoginTarget` + `maybeRedirectToOnboarding`):
  - `?redirect=` é honrado **apenas** quando passa em `isPathAllowedForPerfil`.
  - **`USER`**: `getAreasMode === 'pending'` → destino padrão `/onboarding` (aguarda vínculos e perfil operacional).
  - Perfis com **acesso pleno** (`getAreasMode === 'full'`: **GERENTE**, **GESTAO**, **PROPRIETARIO**, **ADMIN**, **DEVELOPER**) seguem o fluxo legado por `/fazendas`, que decide entre `/`, `/onboarding` e `/fazendas/selecionar` conforme vínculos.
  - Perfis com **áreas restritas** (ex.: FUNCIONARIO: lista explícita em `PERFIL_AREAS`) vão direto para `getDefaultLandingPath(perfil)` (FUNCIONARIO → `/`). Antes de redirecionar, é feita uma pré-checagem: se `getMinhasFazendas()` devolver 0, vai direto para `/onboarding`, evitando o flash `landing → onboarding`. Falhas da pré-checagem caem no fluxo padrão.
- **Defesa em segunda camada**: a página `/folgas` (via `useFolgasPage`) também observa `semFazendaVinculada` (`fazendaContextReady && !loadingMinhasFazendas && minhasFazendas.length === 0`) e dispara `router.replace("/onboarding")`, cobrindo casos como refresh com vínculo removido no meio da sessão.
- `AuthContext.login` retorna `User | null` para que o caller possa decidir o destino imediatamente, sem aguardar re-render.

### **Proteção**

- **CORS**: Configurado estritamente para domínio da Vercel
- **Rate limiting**:
  - **Auth (público, por IP)**: `middleware/auth_rate_limit.go` em `POST /api/auth/login`, `/register`, `/refresh`, `/logout` (2× refresh) e `/validate` (20× refresh — chamado em cada carga de página). Defaults: login 10/15 min, registo 5/h, refresh 30/h. Env: `AUTH_LOGIN_RATE_LIMIT`, `AUTH_LOGIN_RATE_WINDOW_MINUTES`, `AUTH_REGISTER_RATE_LIMIT`, `AUTH_REFRESH_RATE_LIMIT`. Resposta **429** + header `Retry-After`; frontend trata em `frontend/src/lib/errors.ts`.
  - **Dev Studio**: 5 req/h por `user_id` — `middleware/rate_limit.go` (`DevStudioRateLimit`).
  - **Integrações M2M**: por `client_id` — `middleware/integration_rate_limit.go` + `INTEGRATION_RATE_LIMIT_PER_HOUR`.
  - **Produção (Render)**: `SetTrustedProxies` restrito a **ranges privados** (RFC1918 + loopback; LB do Render) — confiar em `0.0.0.0/0` permitiria spoof de IP no rate limit. Override via env `TRUSTED_PROXIES` (CSV de CIDRs).
- **Security headers HTTP**:
  - **Backend**: `middleware/security_headers.go` global — `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`; **HSTS** só com `ENV=production`. Swagger `/api/v1/integracoes/docs` com **CSP própria** (restrita a unpkg + inline) em `integracoes_docs.go`.
  - **Frontend**: `frontend/next.config.js` — headers básicos em `/:path*` + **CSP em `Content-Security-Policy-Report-Only`** (observar violações antes de tornar bloqueante; `connect-src` inclui API http/ws via `NEXT_PUBLIC_API_URL`).
- **Erros 500 sanitizados**: `response.ErrorInternal` **loga** os detalhes (slog com método/path) e responde apenas mensagem genérica — nunca enviar `err.Error()` ao cliente.
- **Redirects seguros**: destino de redirect só é honrado se `isSafeInternalPath` (path interno, sem `//`, sem `\`, sem URL absoluta) — login (`?redirect=`) e redirect do assistente Live (`appAccess.ts`).
- **Proxy Next 16**: `frontend/src/proxy.ts` checa presença do cookie `ceialmilk_token`/refresh em rotas protegidas e redireciona para `/login`. **Sem validação de JWT** (camada leve; validação real no backend). Só atua quando o cookie é visível ao frontend (same-site, ex.: dev localhost); em produção cross-domain (Vercel+Render) passa direto e a proteção fica no client + backend.
- **`/metrics` protegido**: em produção exige `Authorization: Bearer <METRICS_TOKEN>`; sem token configurado → 404 (`metricsAuthMiddleware` em `cmd/api/main.go`).
- **Isolamento multi-tenant (BR-ACESSO-023)**: toda listagem/ação valida vínculo via `ResolveFazendaIDsForList`/`ValidateFazendaAccess`; Assistente (texto e Live) usa resolvers com validação de tenant (`ensureAnimalAccess`, `resolveFazendaIDForUser`) e responde "não encontrado" genérico para recursos de outras fazendas.
- **Graceful shutdown**: `SIGINT`/`SIGTERM` → `http.Server.Shutdown` (timeout 5s) + flush Sentry + `defer pool.Close()` — `cmd/api/main.go`.
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

### **Rastreabilidade (`created_by`)**

Contrato para «quem registrou» no domínio (detalhe em `docs/business/auditoria.md`):

1. **Nunca** incluir `created_by` em structs de request (`CreateAnimalRequest`, payloads do assistente, DTOs M2M de integração).
2. **Sempre** definir `CreatedBy` no **call site** antes de `service.Create`: handlers HTTP (`GetActorUserID` + `SetCreatedBy` em `access_helper.go`), assistente (`userID` do JWT em `Executar` / `ExecuteFunction`), criação derivada (ex.: bezerra no parto herda `parto.CreatedBy`).
3. **Integrações M2M**: API key `cmk_live_*` → `IntegrationAuthMiddleware` define `user_id` = `actor_user_id` (utilizador `INTEGRACAO`); `GetActorUserID` reutilizado nos handlers de integração; ver `docs/business/integracoes.md`.
4. **Services** persistem o valor já presente no model; não leem `created_by` do body. Logs com `X-Correlation-ID` são suporte técnico; fonte de verdade de negócio = coluna na entidade.

Migrations: `23` (ciclo/leite), `24` (`animais.created_by`), `25` (`integracao_*`).

### **Integrações M2M (API externa)**

- **Autenticação**: `Authorization: Bearer cmk_live_...` — middleware em `backend/internal/auth/integration.go`; **não** usa `RequirePerfilAPIAccess`.
- **Autorização**: scopes (`animais:read`, `toques:write`, `coberturas:read`, `coberturas:write`, `saude:read`, `saude:write`, `alertas:read`) + `ValidateFazendaIntegracao` em `handlers/access_helper.go`.
- **Rotas**: `/api/v1/integracoes/*` — reutilizam `DiagnosticoGestacaoService`, `AnimalService`, `CoberturaService`, `AnimalSaudeService`, `AlertaService`.
- **Idempotência**: header `Idempotency-Key` + tabela `integracao_idempotencia` (`IntegracaoService.CheckIdempotency`).
- **Auditoria técnica**: `integracao_chamadas` via `middleware/integration_audit.go`.
- **Rate limit**: `INTEGRATION_RATE_LIMIT_PER_HOUR` (default 300) — `middleware/integration_rate_limit.go`.
- **Admin**: `/api/v1/admin/integracoes` + UI `/admin/integracoes`; guia em `docs/integracoes/README.md`.
- **OpenAPI (só M2M)**: spec estática OpenAPI 3.0 em `backend/internal/openapi/integracoes-v1.openapi.yaml` (`go:embed`); rotas **públicas** (sem API key): `GET /api/v1/integracoes/openapi.yaml`, `GET /api/v1/integracoes/docs` (Swagger UI), `GET /api/v1/integracoes/swagger` → redirect; registo em `internal/openapi/integracoes_docs.go` no arranque do router (independente do middleware M2M). Cópia em `docs/openapi/integracoes-v1.openapi.yaml`.

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

### **Erros de validação e feedback em formulários**

Documentação canónica: [`docs/design-system/form-patterns.md`](../docs/design-system/form-patterns.md).

- **Inline**: `FormFieldError` (`components/ui/form-field-error.tsx`) — `role="alert"`, `aria-live="polite"`, abaixo do controlo; opcional `FormField` wrapper com `aria-invalid` / `border-destructive`.
- **Global**: `FormValidationAlert` (`components/ui/form-validation-alert.tsx`) — no **topo** do formulário (antes dos campos); `scrollIntoView` quando a mensagem aparece; títulos «Verifique os campos» (validação client) vs «Não foi possível guardar» (API); **Badge** `TMP-*` / `INT-*` via `parsePrefixedConformidadeMessage` / `getApiErrorConformidadeCode` ([`lib/errors.ts`](frontend/src/lib/errors.ts)).
- **Validação client**: funções em [`lib/form-validation.ts`](frontend/src/lib/form-validation.ts) (`validateAnimalForm`, `validateCoberturaForm`, …) → `fieldErrors` + resumo; **não** depender só de `submitDisabled` sem mensagem.
- **Gestão**: [`GestaoFormLayout`](frontend/src/components/gestao/GestaoFormLayout.tsx) — alerta no topo + `FormFieldErrorsProvider` / `useFormFieldError` nos `*FormFields`; `AnimalSelect` aceita prop `error`.
- **Toast** (sucesso / info / aviso): [`hooks/use-toast.ts`](frontend/src/hooks/use-toast.ts) (`useToast()` + `toast`) + `<Toaster position="top-right" />` em [`Providers`](frontend/src/components/layout/Providers.tsx); contrato a11y em [`components/ui/toast.tsx`](frontend/src/components/ui/toast.tsx). Após `mutation.onSuccess` nas páginas (ex.: «Animal criado»). Erros de API em forms mantêm `FormValidationAlert`; `toast.error` para ações rápidas fora de form longo.
- **Proibido** em forms de domínio: `<p className="text-destructive">` solto no lugar do padrão acima (estados de página «ID inválido» podem manter texto simples).
- **Zoom/reflow**: alerta global visível sem scroll até ao botão em forms longos (`PartoFormFields`, etc.).

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

### **Reset de estado quando deps mudam (não usar `useEffect` + `setState`)**

- **Problema**: o lint `react-hooks/set-state-in-effect` (CI Frontend - Lint) bloqueia o anti-padrão `useEffect(() => setOffset(0), [filtros…])`, porque `setState` síncrono dentro de efeito provoca render em cascata.
- **Padrão recomendado** (React docs — *Storing information from previous renders*): construir uma chave (string) com as deps que devem disparar o reset, guardar a chave anterior em `useState` e comparar **durante a renderização**:

  ```tsx
  const filterKey = `${debouncedIdent}|${fazendaId ?? ""}|${filters.categoria}|...|${pageSize}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    setOffset(0);
  }
  ```

- **Exemplos**: `frontend/src/app/animais/page.tsx` e `frontend/src/app/fazendas/[id]/animais/page.tsx` (reset de paginação ao mudar filtros, busca ou fazenda ativa).
- **Quando o reset é local a um handler** (ex.: trocar `pageSize` numa única ação do usuário), basta chamar `setPageSize(n); setOffset(0)` no mesmo callback — sem efeito.

### **Subscrição a fonte externa do navegador (`useSyncExternalStore`)**

- **Padrão**: Para hooks que acompanham fontes externas mantidas pelo navegador (`window.matchMedia`, `localStorage`, eventos globais, etc.), preferir **`useSyncExternalStore`** em vez de `useEffect` + `setState`. Isso elimina o anti-padrão `set-state-in-effect`, evita re-render desnecessário e dá compatibilidade nativa com SSR.
- **Estrutura**:
  - `subscribe(callback)`: registra listener na fonte externa e retorna função de unsubscribe (em `useCallback` com as deps relevantes).
  - `getSnapshot()`: lê o valor síncrono atual do navegador.
  - `getServerSnapshot()`: valor seguro para SSR/hidratação inicial (geralmente neutro, ex.: `false`).
- **Exemplo**: `frontend/src/hooks/useMediaQuery.ts` — assinatura de `window.matchMedia(query)` para alternar UI mobile/desktop sem `setState` em efeito.

### **Módulo Gestão Pecuária**

- **Layout de listagem**: `GestaoListLayout` em `components/gestao/GestaoListLayout.tsx` — encapsula PageContainer, BackLink, Card, título, botão **Novo** (`newHref`) e ação secundária opcional (`secondaryHref` + `secondaryLabel`, ex.: «Registrar em lote» em toques).
- **Layout de formulário**: `GestaoFormLayout` em `components/gestao/GestaoFormLayout.tsx` — encapsula PageContainer, BackLink, Card, children, botão de envio e exibição de erro com `getApiErrorMessage`.
- **Cache de animais por fazenda (`useAnimaisFazendaQuery`)**: Em `components/gestao/useAnimaisMap.ts` — `queryKey` `["animais", "by-fazenda", fazendaId, scope]` com `scope`: **`operacional`** (`no_rebanho=true`, formulários e `AnimalSelect` em filtros) ou **`todos`** (inclui baixados, rótulos nas listagens). Helpers: `useAnimaisOperacionalList`, `useAnimaisByIdMap` (scope `todos`, só listagem), **`useGestaoAnimaisByIdMap(fazendaId, animalIds)`** (lista + **GET por ID** com merge — detalhe sobrescreve entrada stale), **`useGestaoAnimaisCacheRefresh`** (invalida `todos` no mount de `GestaoListLayout`), `animaisFazendaQueryKey`. Após baixa/reversão, invalidar ambos os scopes na fazenda (`RegistrarBaixaForm`, ficha do animal).
- **Rótulo em listagens (`AnimalGestaoLabel`)**: `components/gestao/AnimalGestaoLabel.tsx` — identificação + badge **«Baixado»** (`AnimalBaixadoBadge`) quando `isAnimalForaDoRebanho`; usado nas tabelas de Gestão, `ProducaoTable`, busca (`AnimalSearchResultLabel`) e links em `PartoEditCriasPanel`. `useAnimaisMap` (string-only) permanece **deprecated**.
- **Ficha — animal baixado (BR-BAIXA-011)**: `AnimalFichaSidebar` — badges «Fora do rebanho» + «Baixado» (variante `prominent`); `useAnimalFichaPage` expõe `canEditarCadastroAnimal`, `showRegistrarProducaoBloqueado`, etc.; ações bloqueadas via `ButtonWithTooltip` + `ANIMAL_BAIXADO_ACAO_BLOQUEADA_MSG` (`animalRebanhoUtils.ts`); `AnimalEditarBloqueadoGuard` em `/animais/:id/editar`; API `PUT`/`DELETE` animal com `EnsureAnimalNoRebanho`.
- **`isAnimalForaDoRebanho` (frontend)**: `services/animais.ts` — `data_saida` efetiva = comparação de **datas civis** `YYYY-MM-DD` (local), alinhada a BR-BAIXA-002 / `CURRENT_DATE` no Postgres; **não** usar `Date` com horas (meio-dia vs meia-noite falhava para baixa no dia corrente). Helpers: `dataSaidaCivilISO`, `localCivilDateISO`.
- **Registos históricos (BR-BAIXA-010)**: `gestaoRebanhoUtils.ts`, `GestaoRegistroRowActions`, `GestaoEditarBloqueadoGuard`, `GestaoRegistroBaixadoAlert` (identificação + badge) — sem Editar/Excluir quando a fêmea está baixada; API `Update`/`Delete` de cio/cobertura/parto com `EnsureAnimalIDNoRebanho`; handlers `RespondIfAnimalForaRebanho`.
- **Tabelas**: CioTable, CoberturaTable, PartoTable, LactacaoTable, ToqueTable, GestacaoTable, SecagemTable, etc. em `components/gestao/` — usam **`useGestaoAnimaisByIdMap`** + `AnimalGestaoLabel`, Table Shadcn, formatDate em pt-BR. **Cios**, **Coberturas** e **Partos** incluem **Editar** e **Excluir** (Dialog de confirmação). Regra de produto: [baixa-rebanho.md](../docs/business/baixa-rebanho.md) BR-BAIXA-009.
- **Partos (CRUD gestão)**: `PartoFormFields` (`/gestao/partos/novo`, `/gestao/partos/[id]/editar`) — **data/hora** com `DateTimePickerPtBr` (pt-BR; envio `toISOString()`); rótulo **«Número de animais na cria»** (API `numero_crias`: quantidade **por parto**; a mesma vaca pode ter vários partos ao longo do tempo). `PartoTable`: coluna **«Animais na cria»**, **Editar/Excluir** (Dialog). Após **excluir** parto: invalidar TanStack Query `partos`, `animais` (por fazenda + prefixo `["animais"]`), `crias`, `fazendas/:id/animais` (`PartoTable` `onSuccess`). `partos.ts`: `create` com `crias?: PartoCriaInput[]`. **Backend**: `POST /api/v1/partos` com `crias[]` opcional → `PartoService.CreateWithCrias` (uma transação: parto + efeitos na matriz + lactação + N crias); sem `crias[]` → só `Create` do parto. `GET|PUT|DELETE /api/v1/partos/:id`; validações animal/fazenda, fêmea, tipo. **Crias**: `GET/POST /api/v1/crias` (`listByParto`, `create`) para parto já existente / painel de edição. **Cria viva → animal** (`CriaService.Create` e batch): transação pgx — `INSERT crias` → `INSERT animais` → `UPDATE crias`; ident provisória **FILHO-** (macho) ou **FILHA-** (fêmea) + ident mãe + data + `parto_id` + `n`; `animal_identificacao` / `animal_raca` opcionais (`db:"-"`); duplicata ident → 409. **Delete parto**: transação remove animais ligados a crias **VIVAS** que não sejam **COMPRADO** e com mãe coerente (`DeleteAnimaisGeradosPorCriasDoPartoTx`), depois apaga o parto. `PartoEditCriasPanel` para filhotes em falta. `globals.css` / `GestaoFormLayout`: ver bullet **Campos de data** acima.
- **Formulários**: Select Shadcn para enums (tipo, resultado, método, intensidade); **`AnimalSelect`** (`components/animais/AnimalSelect.tsx`) para seleção de animal — combobox Popover + busca (`animalSelectUtils.ts`: filtro por identificação, raça, categoria, status reprodutivo; `femeasOnly` / `reprodutoresOnly`; máx. 50 opções; teclado e a11y); `getApiErrorMessage` para erros da API.
- **Campos de data**: Quando for apenas **data** (ex.: início de lactação, data de secagem, **data de fundação da fazenda**, **plantio/colheita**, custos/produções/receitas agrícolas, **análises de solo**), usar **`DatePicker`** / **`DatePickerUnificado`** (`components/ui/date-picker` → `date-picker-unificado.tsx`) com `value`/`onChange` em `YYYY-MM-DD`. **Não** usar `Input type="date"`. UX unificada: **input com máscara `DD/MM/AAAA`** (`inputMode="numeric"`, barras automáticas, validação inline em `lib/date-input.ts`) + **botão calendário** que abre **`DatePickerOverlay`** (Dialog em todos os breakpoints); dropdowns de mês/ano no calendário (`captionLayout="dropdown"`, `navLayout="around"`) para datas históricas sem sobrepor setas de navegação. **Feedback de data válida**: borda `border-feedback-success`, ícone `Check`, mensagem «✓ Data selecionada: …» (`text-feedback-success`, `aria-live="polite"`). **Auto-completar dia**: 2 dígitos (01–31) + blur/Tab → mês/ano atuais (`tryCompleteDayWithCurrentMonthYear` em `date-input.ts`). **Atalhos**: link **Hoje** ao lado do calendário; no Dialog, botões **Hoje**, **Ontem**, **Semana passada** (respeitam `minDate`/`maxDate`, fecham o modal). Em **`DateTimePickerUnificado`**, `showConfirmationMessage={false}` no `DatePickerUnificado` embutido (evita mensagem duplicada entre data e selects de hora). Quando for **data e hora** em **parto**, **cio**, **cobertura**, **toque** ou **produção**, usar **`DateTimePickerPtBr`** / **`DateTimePickerUnificado`** (`datetime-picker-unificado.tsx`; re-export em `datetime-picker-pt-br.tsx`) — **input de data** (reutiliza `DatePickerUnificado`) + **selects nativos inline** de hora (0–23) e minuto (0–59); Dialog **só** para o calendário de data; valor `YYYY-MM-DDTHH:mm` local; utilitários em `lib/datetime-input.ts` (clamp, `maxDateTime`, validação de datetime futuro); exibição legível `dd/MM/yyyy às HH:mm` via `formatDateTimePtBr` em listagens. Para valor inicial a partir da API (RFC3339/UTC), usar `toDatetimeLocalInputValue` em `lib/format.ts` — **não** usar `.slice(0, 16)` na string ISO. Para “agora”, usar `nowDatetimeLocalInputValue()`. **`DatePickerPanel`** (`mode="datetime"`) permanece legado no painel do calendário; o picker principal não abre Dialog para hora. **`Calendar`** (`calendar.tsx`) + overrides `.rdp` em `globals.css`: células ≥ 44px, `min-w-[20rem]`, dropdowns de mês/ano visíveis.
- **Limites temporais em eventos (BR-CICLO-012)**: `DatePicker` / `DateTimePickerPtBr` aceitam `minDate` / `maxDate` (`YYYY-MM-DD`) e `maxDateTime` (`YYYY-MM-DDTHH:mm`). Em **registos de ciclo** (gestão, produção, baixa, cadastro animal, restrição `inicio_em`), passar `maxDate={todayISODate()}` de `frontend/src/lib/date-limits.ts` (datetime: input de data até hoje + selects de hora/minuto limitados quando o dia selecionado é hoje, com clamp implícito a `nowDatetimeLocalMax()`; input manual de data rejeita data > `maxDate` com mensagem de range; datetime composto futuro → `FormFieldError` via `datetime-input.ts`). **Não** aplicar `maxDate=hoje` em filtros de listagem (`CoberturasListToolbar`, `ToquesListToolbar`, `/producao` intervalo) — consultas podem incluir datas futuras próximas. Erros TMP-* da API: `details.conformidade` + `getApiErrorMessage` nos formulários.
- **Limites temporais — agricultura**: `frontend/src/lib/agricultura-date-limits.ts` + `validateSafraCulturaForm` / `validate*AgriculturaForm` em `form-validation.ts`. Formulários usam **`DatePickerUnificado`** com `minDate`/`maxDate`: **safra** (`CreateSafraCulturaDialog`) — plantio: intersecção de antiguidade máx. 5 anos e ano civil da safra; colheita ≥ plantio e ≤ fim do ano/hoje; **custos/produções/receitas** — `resolveSafraCulturaDateRange(sc)` (plantio/colheita da safra ou fallback `${ano}-01-01` … `min(${ano}-12-31, hoje)`); **análise de solo** — coleta e resultado com `maxDate=hoje`, resultado ≥ coleta. Regras de catálogo: `docs/business/agricultura.md` (`BR-AGRI-001`–`004`).
- **Formulários compartilhados (gestão)**: `CioFormFields` (`/gestao/cios/novo`, `/gestao/cios/[id]/editar`); `CoberturaFormFields` (`/gestao/coberturas/novo`, `/gestao/coberturas/[id]/editar`); **`ToqueFormFields`** (`/gestao/toques/novo`) — classificação operacional (`PRENHA`, `VAZIA`, `VAZIA_PEV`, `CLOE`, `CL`, `RETOQUE`), OBS, idade gestacional, cobertura se `PRENHA`, `toqueFormSubmitDisabled()`; utilitários em `lib/toquesUtils.ts`.
- **Listagem de toques (dia de palpação)**: `ToquesListToolbar` + **`ResponsiveFiltersShell`** — filtro por dia com **`DatePicker`**; param URL `data` (default hoje quando ausente); query `GET /api/v1/toques?fazenda_id=&data_de=&data_ate=`; `ToqueTable` com colunas **Animal | Diagnóstico | OBS**, destaque visual para `PROTOCOLO`/medicamentos; lista só leitura → ficha do animal (`ResponsiveListContainer` + `MobileListCard`).
- **Toques em lote (UI JWT)**: `ToqueLoteEditor` em `/gestao/toques/lote` — tabela editável (identificação, diagnóstico, OBS, idade gestacional); `POST /api/v1/toques/lote` (mesma semântica de resposta que M2M: `total/sucesso/falhas[]`); reutiliza `IntegracaoToqueLoteService` no backend.
- **Listagem de coberturas com filtros**: `CoberturasListToolbar` + **`useFilterSync`** — `AnimalSelect`, tipo, período (`start`/`end` na URL); filtragem **client-side** via `filterCoberturas` / `coberturasFilterStateToParams` (`parseDateRange` — alinhado a gestão); título `(N de M)` com `formatListCountSuffix`. Mesmo padrão de período+animal em **`/gestao/cios|partos|secagens|lactacoes`** (`GestaoPeriodListToolbar` + `lib/gestao-period-filter.ts`). **`/gestao/gestacoes`**: `GestacoesListToolbar` (status, partos 7d, animal, janela de parto previsto) — compatível com drill-down `?status=CONFIRMADA&partos_dias=7`. **`/fazendas`**: `FazendasListToolbar` (`q` por nome, client-side, ADMIN). Evolução futura: query params server-side em coberturas/gestão se o volume por fazenda crescer.
- **Edição/exclusão**: **Cios**, **Coberturas** e **Partos** têm fluxo completo (página editar + Dialog de confirmação para excluir). **Coberturas**: `PUT|DELETE /api/v1/coberturas/:id`; exclusão bloqueada (409) se houver gestação ou diagnóstico vinculado (`ErrCoberturaTemVinculos`). Próximo passo alinhável: **toques** e **secagens** no mesmo padrão CRUD.

### **Layout de Página (PageContainer)**

- **Padrão**: Usar o componente `PageContainer` para wrappers de `<main>` em todas as páginas
- **Variantes**: `default` (max-w-5xl), `narrow` (max-w-2xl), `wide` (container max-w-6xl), `centered` (flex center para login/home)
- **Implementação**: `frontend/src/components/layout/PageContainer.tsx` com props `variant`, `className`, `children`
- **Uso**: Fazendas → default; nova/editar fazenda → narrow; Dev Studio → wide; **ficha do animal** → wide (layout 2 colunas + tabs); login e home → centered

### **Ficha do animal (tabs + sidebar)**

- **Rota**: `/animais/[id]` com query opcional `?tab=geral|ciclo|saude|vacinas|producao|historico` (default `geral`, omitido na URL); histórico aceita `&tipo=todos|saude|alertas|vacinas`; `historico&tipo=ciclo` → redirect `?tab=ciclo`.
- **Layout**: `PageContainer variant="wide"`; grid `lg:grid-cols-[minmax(240px,280px)_minmax(0,1fr)]` — sidebar sticky (`AnimalFichaSidebar`) + painel principal com Radix Tabs.
- **Componentes**: `components/animais/ficha/` — `AnimalFichaShell`, `AnimalFichaSidebar`, `AnimalFichaTabs`, tab panels (`AnimalFichaTabVisaoGeral`, `AnimalFichaTabCiclo`, `AnimalFichaTabSaude`, `AnimalFichaTabProducao`, `AnimalFichaTabHistorico`); `AnimalCicloMiniPreview`, `AnimalCicloTimelineSection`; `lib/animalFichaLinks.ts` (`animalFichaCicloHref`); hook `hooks/useAnimalFichaPage.ts`; constantes `animalFichaTabs.ts`.
- **Navegação**: troca de tab via `router.push(..., { scroll: false })`; breadcrumb `PageBreadcrumb` contextual; rotas legadas `/animais/[id]/saude` e `/producao` redirecionam para `?tab=`.
- **Lazy fetch**: queries de saúde/produção/timeline só quando a tab correspondente está ativa.
- **CTA mobile**: `animalProximasAcoesPageSpacerClass` nas tabs **Visão Geral** e **Ciclo** (`AnimalFichaCiclo` / `AnimalCicloMiniPreview` + `AnimalProximasAcoesCta`).
- **Regra de negócio**: BR-ANIMAIS-008; tab **Ciclo** = hub (estado + timeline visual + ações); **Visão Geral** = mini-timeline + cadastro colapsável; **Histórico** = saúde/alertas/baixa (BR-CICLO-008); animal baixado = só consulta no cadastro (BR-BAIXA-011).

### **Extração de Erro da API (getApiErrorMessage)**

- **Padrão**: Usar `getApiErrorMessage(err, fallback)` de `lib/errors.ts` para mensagens de erro vindas da API
- **Implementação**: Trata `response.data.error` (string ou objeto com `message`/`details`), status 429 (rate limit) e retorna fallback caso contrário
- **Uso**: Login, FazendaForm, AssistenteInput, ChatInterface, CodePreview, HistoryPanel — evitar extração inline repetida de `err.response?.data?.error`

### **Header Responsivo**

- **Padrão**: Navegação desktop (`lg:`) com links principais visíveis + popovers agrupados; em mobile (< `lg`) menu hamburger que abre drawer lateral com secções.
- **Agrupamento** (`frontend/src/config/headerNav.ts` + `getHeaderNavGroups`): permissões continuam em `appAccess.ts`; a apresentação divide itens em **Principal** (Animais, Alertas, Produção, Gestão, Folgas — filtrado pelo perfil), **Mais** (ex.: Lotes, Agricultura — `Popover` «Mais») e **Sistema** (Fazendas, Admin, Dev Studio — `Popover` «Sistema»). Popovers e secções do drawer só renderizam se o grupo tiver ≥1 item; itens bloqueados **não** aparecem (sem `disabled`).
- **Labels contextuais**: `getNavAreaLabel(area, perfil)` — ex.: `FUNCIONARIO` + área `gestao` → «Gestão reprodutiva» (alinhado ao `Dashboard`).
- **Hooks**: `useMenuItems` (grupos + `hasNav` + `getAreaLabel`; recalcula ao mudar perfil ou `fazendaAtiva.id`), `useHeaderVisibility` (`showNavLinks` exige fazenda ativa quando há 2+ vínculos; `showBuscaAnimal` exige `fazendaAtiva` para não-admin), `useHeaderScrollState` (scroll → blur/sombra + classes sticky com `safe-area-inset-top`), `useAdaptiveSearch` (Popover `lg+` / Dialog mobile).
- **Componentes**: `Header.tsx` (shell &lt; 100 linhas), `HeaderBrand`, `HeaderNav`, `HeaderActions`, `HeaderBuscaTrigger`, `HeaderMobileBar`, `HeaderBanners`, `HeaderDesktopNav.tsx`, `HeaderMobileNavSections.tsx`, `HeaderMobileDrawer.tsx`, `HeaderAccountPopover.tsx`, `HeaderNavLink.tsx`, `HeaderNavPopover.tsx`, `headerNavIcons.ts`.
- **Implementação**: `Header.tsx` — contentor `max-w-7xl`; `mobileMenuOpen` + `HeaderMobileDrawer` (slide da direita 300ms, `safe-area-inset-bottom` no nav, `id="header-mobile-drawer"`, hamburger com `aria-expanded`/`aria-controls`, foco retorna ao trigger em `onCloseAutoFocus`); **desktop**: `HeaderDesktopNav` só se `showNavLinks && hasNav`; **`HeaderBuscaTrigger`** quando `showBuscaAnimal`; `ThemeToggle`; **`HeaderAccountPopover`** (Conta); **barra mobile** (`HeaderMobileBar`): busca compacta + avatar + hamburger; **drawer**: conta/fazenda, tema, busca, nav filtrada, Sair. Assistente fora do Header (`AssistenteFab` / `AssistenteDialog`).
- **Ícones no menu**: Cada link exibe ícone + texto (`headerNavIcons.ts`: áreas + sistema).
- **Menu Agricultura / Folgas**: Áreas em `MAIN_NAV_AREA_ORDER`; Agricultura e Lotes no grupo **Mais** (desktop) ou **Registos** (drawer); Folgas no grupo **Principal** / **Exploração**.
- **Identidade do utilizador (`UserIdentitySummary`)**: Avatar com **iniciais** (nome composto ou e-mail); linha principal nome ou e-mail; se há nome, **e-mail completo** como linha secundária (`text-muted-foreground`, `break-all`); badge de perfil com `getPerfilLabel`; região com `aria-label` que inclui **fazenda ativa** quando `fazendaAtiva?.nome` existe.
- **Fazenda ativa (`FazendaContext` + `FazendaSelector`)**: `getMinhasFazendas` no carregamento; **0** fazendas → limpa estado; **1** → sempre define como ativa e grava `ceialmilk_fazenda_ativa`; **2+** → restaura `savedId` se ainda válido. **`FazendaSelector`**: não renderiza para **ADMIN**/**DEVELOPER**; `useMinhasFazendas({ enabled })` só quando o perfil precisa de «minhas fazendas»; enquanto carrega lista vazia mostra «A carregar fazendas…»; com **uma** fazenda mostra cartão só leitura **«Fazenda ativa»** + nome; com **várias** mantém `Select` Shadcn (`density="drawer"` → trigger em largura total no drawer), `sr-only` «Fazenda ativa: …» e `aria-label` no trigger para troca de fazenda. **Ciclo de vida por sessão autenticada**: o guard interno (`hasLoaded`) **não é consumido no ramo deslogado**, garantindo que a transição `isAuthenticated: false → true` (login sem hard reload) dispare o carregamento; durante a carga autenticada `isReady` volta a `false` para evitar UI vazia. **Listagens “globais”** (ex.: `/animais`): escopo da consulta = fazenda ativa; se não houver fazenda selecionável (0 vínculos ou 2+ até o usuário escolher no header), a página orienta com mensagem específica em vez de listar dados de outra fazenda.
- **Folgas — visualização para gestão**: Seletor opcional “Visualizar folgas de” em `app/folgas/page.tsx`; estado de filtro acoplado a `{ fazendaId, usuarioId }` para invalidar ao mudar de fazenda sem `useEffect` de reset; células com destaque (`ring-primary`) ou esmaecidas conforme o funcionário escolhido.
- **Folgas — componentes e formulários**: `frontend/src/components/folgas/` — `folgas-utils.ts` (`toYMD`, `parseApiDate`), `folgas-rodizio-utils.ts` (`labelRodizioPrevisto` para texto completo em dialog/tooltip), `folgas-cell-tooltip.ts` (tooltip desktop quando há conteúdo), `FolgasCalendarioDia.tsx` (grade enxuta: previsto curto só com folga prevista; contagem `1 folga` / `N folgas` ou “Meu dia”; `—` sem folga; “Exceção” curto; **mobile**: célula inteira `role="button"` + toque/teclado abre detalhes; **fora do rodízio**: ponto âmbar no mobile, badge texto em `md+`; botão **Ver detalhes** apenas `md+`), `FolgasDiaDetalhesDialog.tsx` (texto completo do rodízio, registros, motivos por perfil, Alterar/Justificar), `FolgasHistoricoTable.tsx` (cards mobile / tabela desktop). Na página: **Gerar mês automático** usa `inicioMes`/`fimMes` do **mês navegado**; painel **Equidade** + aviso âmbar; confirmação extra ao substituir fora do previsto. **Tratamento de conflito** duplicidade → mensagem orientativa. **DatePicker** âncora; **`size="lg"`** em ações principais dos dialogs.
- **Folgas — layout mobile-first (mantendo grade)**: em `/folgas`, os blocos informativos de Alertas/Equidade ficam colapsáveis no mobile (`details/summary`) e expandidos no desktop (`Card`), reduzindo rolagem antes do calendário.
- **Toggle de tema**: Botão de alternar modo claro/escuro (ThemeToggle) no Header (desktop) e no menu mobile; alvo de toque mínimo 44px; ver seção "Padrões de UX e Acessibilidade".
- **Controle por perfil**: Menu de **Fazendas** aparece apenas para ADMIN/DEVELOPER; USER sem fazendas não vê itens de manutenção.

### **Padrões de UX e Acessibilidade**

Público-alvo: usuários leigos em sistemas e em sua maioria idosos; objetivo é navegação confortável e eficiente com identidade visual ligada ao meio rural.

- **Paleta rural** — fonte canónica: [`docs/design-system/tokens.md`](../docs/design-system/tokens.md); runtime em `frontend/src/app/globals.css`; dicionário W3C em `frontend/design-tokens/tokens.json`:
  - **Modo claro**: Primária verde (pastagem) `152 42% 36%`; fundo off-white quente `40 18% 97%`; acento âmbar para hover; texto escuro contraste ≥ 4,5:1 (WCAG AA).
  - **Modo escuro**: Mesma identidade em tons escuros; fundo `152 18% 11%`; primária mais clara `152 48% 48%` para contraste.
  - **Camadas**: primitivos Shadcn (`--primary`, `--background`, …) + semânticos (`--color-surface-*`, `--color-feedback-*`, …) mapeados em `tailwind.config.ts`.
  - **Novos componentes**: preferir tokens semânticos (`bg-surface-primary`, `text-feedback-warning`) em vez de cores literais (`text-amber-600`). CI valida com `npm run validate:tokens` (paridade CSS↔JSON + ausência de literais fora de `landing/` e `dev-studio/`).
- **Modo claro e modo escuro**:
  - Toggle no Header e no menu mobile; ícone Sun/Moon; `aria-label` "Usar modo claro" / "Usar modo escuro".
  - Persistência em `localStorage` com chave `ceialmilk_theme` (valores `light` | `dark`). Script inline no layout aplica tema antes da hidratação para evitar flash.
  - Contexto: `ThemeContext` e `ThemeProvider` em `contexts/ThemeContext.tsx`; componente `ThemeToggle` em `components/layout/ThemeToggle.tsx`.
- **Tipografia**: Corpo e labels mínimo 16px (`text-base`); títulos de página 18–20px ou mais. Input e Label com `text-base`; Button com `text-base` e tamanhos que garantem legibilidade.
- **Foco em campos de texto** (`components/ui/input.tsx`, `textarea.tsx`): no foco usar apenas **`border-ring`** (`focus:border-ring focus:ring-0`); **não** combinar `border` + `ring-1 ring-ring` (evita contorno duplo, especialmente no modo escuro). Transição suave em `border-color`.
- **Alvos de toque**: Mínimo 44×44px para botões e links interativos (WCAG / Apple HIG). Button `size="default"` e `size="icon"` usam `min-h-[44px]`/`min-w-[44px]`; links do Header e CTAs principais seguem o mesmo critério.
- **Formulários**: `space-y-5` entre grupos; botão de envio `size="lg"`; mensagens de erro em `text-base`; tabelas com `overflow-x-auto` em mobile; botões Editar/Excluir nas tabelas com `size="default"` para toque.
- **Seleção em listas longas**: Para pickers com muitos itens (ex.: animais da fazenda), usar combobox pesquisável (`AnimalSelect` — Popover + campo de busca + filtro no cliente em `animalSelectUtils.ts`), não Radix Select com scroll infinito. Limite de exibição (~50) com mensagem para refinar a busca; alvos de toque ≥ 44px nas opções.
- **Home autenticada (`Dashboard`)**: **`DashboardKpiGrid`** no topo (4 tiles `ResumoKpiTile`: partos 7d, em lactação, alertas críticos, leite hoje; skeleton; zero → «Nenhum» via `lib/kpiFormat.ts`; drill-down em `lib/resumoPecuarioLinks.ts`; visível para FUNCIONARIO via `showKpiGridForPerfil`). Abaixo, painéis **`HomeCollapsiblePanel`** (`<details>`; expandido se há itens): `RestricoesLeiteHomePanel` (`id="restricoes-leite"`), `AlertasHomePanel`, `PecuarioResumoHomePanel` (lista partos 30d; `showPecuarioResumoPanelForPerfil` — inclui FUNCIONARIO), **`ConformidadeHomePanel`** (`showConformidadePanelForPerfil` — oculto FUNCIONARIO/USER). Busca animal só via **header** + atalho mobile; atalhos de acesso rápido. Listas internas com `max-h` + scroll (zoom/reflow). **Tour primeira visita** (`DashboardTour`, BR-ACESSO-018): após 1s, 3 passos (busca `data-tour="dashboard-search"` no header em `/` ou atalho mobile, KPIs, acesso rápido); overlay + painel `role="dialog"`; «Pular tour»; persistência `ceialmilk:dashboard-tour:v1:{userId}`; reinício em `HeaderAccountPopover`.
- **Onboarding frio (USER sem fazenda)**: wizard reutilizável em `components/wizard/` (`WizardProvider`, `WizardStep`, `WizardProgress`, `WizardNavigation`); conteúdo em `components/onboarding/OnboardingColdWizard` (3 passos); conclusão grava `ceialmilk:onboarding:wizard:v1:{userId}` e mostra `OnboardingColdSummary` em visitas seguintes; **USER com fazenda** mantém página estática (perfil pendente); ver `docs/business/acessos-perfil.md` BR-ACESSO-018.
- **Listagens responsivas (mobile &lt; `md`)**: Em tabelas com coluna **Ações**, usar **`ResponsiveListContainer`** + **`MobileListCard`** (`frontend/src/components/layout/list/`) no mobile e manter **tabela** em `md+` (`hidden md:block`). **Scroll infinito** nas listagens principais: ver bullet **Scroll infinito mobile (t_ds_007)** na secção de arquitetura frontend. **Toque no corpo do card** = ação principal (`href` ou `onPrimaryClick` — ex.: Ver animal, editar registo, selecionar fazenda). **Ações secundárias/destrutivas** = menu **⋮** (`ListRowActionsMenu`, Popover) com `stopPropagation` no gatilho; **Excluir** nunca só no toque da linha — usar **`DeleteRecordDialog`** único por tabela (estado `deleteDialogOpenId`) partilhado entre mobile e desktop. Listas só leitura (gestação, toque, secagem, lactação): card → `/animais/:id`. **`MobileListCard`**: `title`/`subtitle` são `ReactNode` — renderizar com **`<div>`**, não `<p>` (evita hidratação quando o título inclui `Badge` ou outros filhos com `<div>`). Referências antigas: `FolgasHistoricoTable`, `RestricoesLeiteHomePanel`. Consumidores (2026-05-22): `AnimalTable`, `PartoTable`, `CioTable`, `CoberturaTable`, `ProducaoTable`, `GestacaoTable`, `SecagemTable`, `ToqueTable`, `LactacaoTable`, `FazendaTable`, `UsuarioTable`, `IntegracaoTable`. **2026-05-29**: `AlertasTable` (`/alertas`). **2026-05-30**: **`EmptyState`** unificado em listagens principais (`/animais`, `/producao`, `/alertas`, `/fazendas`, `/gestao/cios|coberturas|toques`) — empty no corpo da tabela + erro/retry via `QueryListContent`.
- **Exclusão — feedback de erro (2026-05-30)**: estado `deleteError` (+ `deleteConformidadeCode` em `AlertasTable`); `onError` → `getApiErrorMessage` + `toast.error` (diálogo **aberto**); `onSuccess` → `toast.success` + fechar; limpar erro ao fechar/confirmar; props `error` / `conformidadeCode` no `DeleteRecordDialog` («Não foi possível excluir»). Tabelas: coberturas, cios, partos, animais, produção, fazendas, `AnimalSaudeList`, alertas. 409 cobertura com vínculos (BR-COBERTURAS-004) visível no modal.

#### **Zoom do navegador, escala de texto do sistema e reflow**

- **Premissa**: Toda tela e todo componente de tela deve assumir **zoom do browser > 100%** e/ou **fonte do SO ampliada** (ex.: Android “tamanho da fonte”, iOS em apps WebView). Testar só breakpoints `sm`/`md`/`lg` **não** substitui este cenário; no **mobile** o ecrã útil encolhe depressa e conteúdo pode ficar **fora de vista ou cortado** se o layout for rígido.
- **Objetivo**: Informação essencial **legível e alcançável** sem depender de um “viewport ideal”. Alinhar mentalmente a **WCAG 1.4.4** (redimensionar texto até 200% sem perda de conteúdo ou função) e a **reflow** (largura estreita + zoom como combinação comum).
- **Layout fluido e rolagem**: Preferir fluxo que **reflow** verticalmente; evitar empilhar várias barras **`fixed`/`sticky`** que reduzam a área útil a quase zero com zoom alto. Onde houver painéis fixos (header, FAB, barras de ferramentas), garantir que o corpo principal ainda **role** e mostre o essencial.
- **Ficha animal — CTA de próximas ações (mobile)**: `AnimalProximasAcoesCta` — até 4 ações; barra `fixed` inferior com botões empilhados e `env(safe-area-inset-bottom)`; conteúdo da página com spacer dinâmico (`pb-32` ou `pb-56` conforme quantidade) quando há `proximas_acoes`; desktop mantém card inline em linha; RBAC via `canProximaAcao` + `isPathAllowedForPerfil` (BR-ANIMAIS-007).
- **Flex/grid e overflow**: Se conteúdo “desaparece” ou fica clipado, rever a cadeia de **overflow** nos filhos; em flex aninhado, **`min-h-0`** (ou equivalente) nos filhos que devem encolher permite **scroll interno** em vez de corte silencioso.
- **Modais, sheets e drawers**: Corpo com **altura máxima relativa ao viewport** (`max-h-[…dvh]` / `max-h-[…vh]` ou padrão Shadcn já usado) + **`overflow-y-auto`** na zona de conteúdo; ações críticas (confirmar, gravar) devem permanecer **alcançáveis após rolar** quando não couberem acima da dobra. Não assumir altura fixa de viewport nem diálogo “encaixado” só a 375px.
- **Truncamento** (`truncate`, `line-clamp`): Reservado a texto **não crítico**; para dados importantes (identificações, datas, estados de negócio), oferecer **“ver mais”**, **tooltip** (desktop) ou **detalhe em dialog** — padrão já usado em módulos como Folgas.
- **Tabelas**: Em **desktop**, manter **`overflow-x-auto`** onde fizer sentido; em **mobile**, preferir o padrão **listagens responsivas** (cards clicáveis) em vez de depender de scroll horizontal para a coluna Ações. Com zoom alto no desktop o scroll lateral pode ser inevitável — garantir colunas essenciais visíveis primeiro.
- **Checklist para IA e revisão**: Antes de dar por concluída uma UI nova ou alterada, validar mentalmente **zoom ~200%** + **largura estreita** (mobile); verificar que nada crítico fica só fora do ecrã sem rolagem ou ação para aceder.

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

## Fluxo de sincronização do Memory Bank

### **Checklist pós-entrega (obrigatório em mudança relevante)**

- **`activeContext.md`**: atualizar estado atual (o que funciona, em andamento, próximos passos e problemas conhecidos).
- **`progress.md`**: alinhar completude, sprint/backlog e histórico sem contradições com `activeContext`.
- **`systemPatterns.md`**: registrar padrões novos ou exceções técnicas intencionais.
- **`techContext.md`**: refletir dependências/versões/configurações efetivamente presentes no código.
- **`Última atualização`**: atualizar data em todos os arquivos alterados no mesmo PR.

### **Regra operacional**

- Toda alteração de comportamento relevante deve atualizar documentação no mesmo PR para evitar drift entre código e memória do projeto.

---

**Versão dos Padrões**: 2.29 (Go + Next.js) — hardening de segurança: refresh tokens hash+rotação, erros sanitizados, CSP report-only, proxy.ts, redirects seguros, multi-tenant BR-ACESSO-023.

**Última atualização**: 2026-06-10 (hardening de segurança e processo — ver `docs/ops/` para runbook, checklist e guia de code review)
