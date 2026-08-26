# Padrões de design e frontend (DRY/composição)

### **Frontend: DRY, composição e abstração de lógica**

O frontend combina **DRY (Don't Repeat Yourself)**, **composition pattern** (React) e **abstração de lógica** em camadas. Objetivo: menos duplicação, componentes enxutos e regras fáceis de testar e alterar.

#### **DRY — uma única fonte de verdade**

- **HTTP e contratos de API**: funções em `frontend/src/services/*` (Axios, `withCredentials`); não repetir URLs, headers ou parsing bruto em componentes.
- **Erros de API**: sempre `getApiErrorMessage` (`lib/errors.ts`) em formulários, mutações e listagens com `useQuery` — evitar `err.response?.data` espalhado.
- **UI genérica**: Shadcn em `components/ui/`; não recriar botão/card/dialog ad hoc quando já existe primitivo.
- **Layouts e shells repetidos**: `PageContainer`, `GestaoListLayout`, `GestaoFormLayout`, `BackLink` — nova listagem de gestão deve reutilizar o layout em vez de copiar Card + header.
- **Paginação**: usar `ListPaginationBar` (`frontend/src/components/ui/pagination.tsx`) com `total`, `pageSize`, `offset` e callbacks; APIs offset/limit — ver `listPaginated` em `services/animais.ts`. **Exceção — timeline da ficha**: tab **Ciclo** → hub (`AnimalFichaCiclo` + `AnimalCicloTimelineSection`, `useInfiniteQuery`, tipo fixo `ciclo`); tab **Histórico** → `AnimalTimelineSection` (filtros `todos|saude|alertas|vacinas`, URL `&tipo=`); **Visão Geral** → resumo curto (`AnimalCicloMiniPreview`: alertas compactos + mini-timeline `maxItems=5` + CTAs; sem card «Estado atual»); **sidebar** sticky (`AnimalFichaSidebar`) com sinais críticos via `buildAnimalContextoLinhasResumo`; invalidar via `invalidateAnimalTimeline`. Links: `lib/animalFichaLinks.ts` (`animalFichaCicloHref`). Debounce em busca: `useDebouncedValue`.
- **Busca rápida por animal (identificação)**: um único **`AnimalSearchPanel`** (`components/animais/AnimalSearchPanel.tsx`) — debounce ~400 ms, **Enter** dispara busca imediata no mesmo `<form>`, contador em **`useRef`** para descartar respostas HTTP obsoletas quando o termo muda rápido — no **header global** (`HeaderBuscaTrigger` + `useAdaptiveSearch` + `AnimalSearchDialogContext` em `Providers.tsx`) e atalho **«Buscar animal»** no `Dashboard` (mobile); **sem** card duplicado no corpo da home (desktop). **Header**: campo fixo «Brinco ou nome»; **lazy render** — no first paint só o input; `AnimalSearchPanel` carregado via **`next/dynamic`** (`ssr: false`); Popover (desktop) / Dialog (mobile) montam apenas quando `panelActive` em `useAdaptiveSearch` (foco, clique, `openSearch()` ou termo com ≥2 caracteres); desmontagem completa ao fechar (ESC/blur/`resetSearch`). **desktop (`lg+`, `layout="desktop"`)** — input no header + resultados em **Popover** (`variant="header"`, input oculto no painel, termo controlado pelo header); selecção → card de contexto (`getContexto`) → `Link` «Abrir ficha». **mobile (`layout="mobile"`)** — Dialog com input sticky + lista scrollável (`blur` do input ao scroll); **match exacto** (`findExactIdentificacaoMatch`) após busca/Enter → `router.push` ficha; ambiguidade → lista compacta (ID + meta + highlight do termo) com **um toque → ficha** (sem card intermédio). Helpers: `animalSearchUtils.ts` (`normalizeIdentificacao`, `formatAnimalSearchResultMeta`). **Reset ao navegar**: `Header` passa `key={pathname}` a `HeaderBuscaTrigger` para remontar o campo a cada rota (limpa termo/overlays). API do contexto: `openSearch()` / `registerSearchField` (atalhos e item do drawer «Ir para busca no topo»). ARIA: `aria-expanded`, `aria-controls` (só com painel activo), `aria-haspopup` no input; ids `header-search-popover` / `header-search-dialog`; foco retorna ao input ao fechar overlay. Classes partilhadas: `animalSearchOverlay.ts` (incl. `safe-area-inset-top` no Dialog). **Paginação (BR-ANIMAIS-009)**: `GET /api/v1/animais/search/by-identificacao` com `limit=20` (default), `offset` e resposta `{ animais, total, limit, offset }`; UI «Mostrando X de Y resultados» (desktop) / «N resultados — toque para abrir a ficha» (mobile) + botão **Ver mais** (append); índice GIN `pg_trgm` em `animais.identificacao` (migration 35). **Relevância (BR-ANIMAIS-012)**: ordenação SQL exato → prefixo → contains → equivalente; desempate `created_at DESC`; header envia `fazenda_id` da fazenda ativa; rótulos via `formatAnimalSearchLabel` (`animalSearchUtils.ts`). Serviços: `searchByIdentificacao` + `getContexto` em `services/animais.ts`.
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

