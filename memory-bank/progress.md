# 📈 Progress - CeialMilk

## 📊 Status Geral do Projeto

### **Completude Geral**: 99% — **Fase 2 (ciclo + auditoria UI)**: 100% em código; **baixa do rebanho** entregue (2026-05-24); checklist de regressão documentado (execução em staging pendente)

```bash
🏗️  Infraestrutura: 95% ✅
📚  Documentação: 97% ✅ (memory bank + OpenAPI integrações M2M)
💻  Implementação: 95% ✅ (CRUD Animais, Produção, Gestão Pecuária e Módulo Agrícola em consolidação)
🧪  Testes: 78% ✅ (unitários backend service saúde/alertas + E2E frontend + scripts TestSprite TC001–TC009 API)
🚀  Deploy: 90% ✅ (backend Render + frontend Vercel em produção)
```

### **Velocidade e Métricas**

- **Início do projeto**: 2025-09-07
- **Migração Arquitetural**: 2026-01-24
- **Velocity atual**: Em reestruturação
- **Team size**: 1 desenvolvedor
- **Sprint atual**: Pós-Fase 2 — validação operacional + preparação Fase 3
- **Progresso sprint**: Fase 2 fechada em desenvolvimento

## ✅ O que foi concluído

### **Scroll infinito mobile — listagens (✅ 2026-06-01 — t_ds_007)**

- [x] `hooks/useMobileInfiniteList.ts` — `useInfiniteQuery`, sentinela, `clientPages`, reset de scroll ao filtrar
- [x] `MobileInfiniteListFooter` + `MobileInfiniteListSkeleton` em `components/layout/list/`
- [x] `/animais`, `/alertas`, `/producao`, `/gestao/coberturas` — infinite &lt; `md`, paginação `md+`

### **Toolbar filtros + URL-sync (✅ 2026-06-01 — t_ds_006)**

- [x] `hooks/useFilterSync.ts` + `lib/filter-url.ts` + `ResponsiveFiltersShell`
- [x] Toolbars novas: cios, partos, secagens, lactações, gestações, fazendas
- [x] URL-sync: animais, produção (`ProducaoListToolbar`), alertas, coberturas, toques
- [x] Filtro client-side gestão (`lib/gestao-period-filter.ts`, `lib/gestacoes-list-filter.ts`)
- [x] Título `(N de M)` em todas as 11 listagens; back/forward restaura filtros

### **Ficha animal — tabs + sidebar (✅ 2026-06-01)**

- [x] Layout 2 colunas desktop / coluna única mobile (`AnimalFichaShell`, `PageContainer wide`)
- [x] Radix Tabs acessíveis (`components/ui/tabs.tsx`) — Visão Geral, Saúde, Produção, Histórico
- [x] Sidebar fixa (`AnimalFichaSidebar`) com resumo via `animalResumoUtils`
- [x] URLs `?tab=saude|producao|historico`; redirects rotas legadas
- [x] Breadcrumb contextual; forms saúde voltam para `?tab=saude`
- [x] BR-ANIMAIS-008; BR-CICLO-008 atualizado

### **Design System — tokens semânticos (✅ 2026-05-30)**

- [x] **RF01**: [`docs/design-system/tokens.md`](../docs/design-system/tokens.md) — tabelas completas (cores, tipografia, espaçamento, radius, sombras, breakpoints)
- [x] **RF02**: Tokens de cor semânticos (`surface`, `text`, `border`, `brand`, `accent`, `feedback`) em `globals.css` + `tailwind.config.ts`
- [x] **RF03**: Tipografia — 6 tamanhos, 4 pesos, line-heights, letter-spacing
- [x] **RF04**: Espaçamento grid 4px (escala Tailwind 1–24)
- [x] **RF05**: Border radius ×6, sombras elevation ×4
- [x] **RF06**: JSON export W3C DTCG em `frontend/design-tokens/tokens.json`
- [x] Migração de cores literais (`amber-*`, `green-*`, etc.) para classes `feedback-*` nos componentes operacionais (exc. `landing/`, `dev-studio/`)
- [x] Script CI `validate-design-tokens` — paridade CSS ↔ JSON + lint de cores literais
- [x] Regra Cursor + ESLint documentada para novos componentes

### **Exclusão em listagens — erro visível + toast (✅ 2026-05-30)**

- [x] `DeleteRecordDialog`: props `error` e `conformidadeCode` (badge INT/TMP em alertas)
- [x] Padrão replicado: `deleteError` + `onError`/`onSuccess` + toasts; diálogo aberto em falha de API
- [x] Tabelas: `CoberturaTable`, `CioTable`, `PartoTable`, `AnimalTable`, `ProducaoTable`, `FazendaTable`, `AnimalSaudeList`, `AlertasTable`
- [x] UX 409 cobertura (BR-COBERTURAS-004) visível no modal e toast — não só no console
- [ ] Pendente: exclusão na ficha `/animais/[id]` (fluxo inline, sem `DeleteRecordDialog`)

### **Form validation inline + global + toast (✅ 2026-05-30)**

- [x] `FormFieldError`, `FormField`, `lib/form-validation.ts`, `FormValidationAlert`, `GestaoFormLayout` + contexto de erros por campo
- [x] Sonner (`use-toast`, `Toaster`); migrados animais, produção, gestão, admin
- [x] `systemPatterns.md` + regra Cursor `frontend-ui-patterns.mdc`

### **`lactacao_id` em produção (✅ 2026-05-30)**

- [x] Migration `34_add_lactacao_id_producao_leite`: coluna nullable + FK + índice
- [x] Backend: `FindLactacaoForProducaoDate`, auto-fill POST, recalc PUT condicional, filtro GET `lactacao_id`
- [x] Frontend: filtro na listagem `/producao`, coluna lactação, `/animais/[id]/producao` agrupada, aviso no `ProducaoForm`
- [x] Catálogo: BR-PRODUCAO-006, BR-CICLO-007 atualizado; testes `producao_lactacao_test.go`

### **Onda 3.3 — Catálogo saúde + alertas (✅ 2026-05-29)**

- [x] `docs/business/saude-animal.md`: fluxo sync, cenários, refs BR-CICLO/BR-ALERTA, backlog planejado (BR-SAUDE-001–005)
- [x] `docs/business/alertas.md`: matrizes severidade/geração/INT-001–007, fluxograma status, refs cruzadas (BR-ALERTA-001–012)
- [x] `docs/business/README.md`: índice reordenado (ciclo → saúde → alertas → auditoria)
- [x] `docs/business/ciclo-rebanho.md`: secções saúde/alertas no fluxo, matriz e backlog actualizados

### **Onda 3.2 — Testes unitários saúde + alertas (✅ 2026-05-29)**

- [x] Refactor: interfaces `animalSaudeStore`, `alertaStore`, `alertaGeracaoStore` nos serviços (duck typing com repos pgx)
- [x] `animal_saude_service_test.go`: Create/Update/Delete, sync `status_saude`, guardas rebanho, auto-resolve `TRATAMENTO_VENCIDO`
- [x] `alerta_service_test.go`: Create manual, bloqueio automático/perfil, transições status, delete só MANUAL
- [x] `alerta_geracao_service_test.go`: `TestTryCreateAlerta_NaoDuplica` (genérico)
- [x] Validação: `go test ./internal/service/... -count=1`

### **Alertas — DoD listagem (✅ 2026-05-31)**

- [x] Filtro de período (`start`/`end`, OR `created_at`/`data_prevista`) — backend + `AlertasListToolbar`
- [x] Botão **Atualizar** na página `/alertas` (refetch manual)
- [x] Badge Bell no Header (`useAlertasAbertosCount`, alertas ABERTOS)
- [x] Catálogo: BR-ALERTA-014, BR-ALERTA-015

### **Onda 2.1 — Sistema de Alertas (✅ 2026-05-29)**

- [x] Migration `31_add_alertas`: tabela `alertas`, constraints, índices, RLS
- [x] Backend: model, repository, service, handler; rotas fazenda-scoped; RBAC FUNCIONARIO vs GERENTE+
- [x] Frontend: `alertas.ts`, `/alertas`, `AlertasHomePanel`, menu Bell, `appAccess.ts`
- [x] Catálogo: `docs/business/alertas.md` (BR-ALERTA-001–007)

### **Onda 2.2 — Geração automática de alertas (✅ 2026-05-29)**

- [x] Migration `32_alertas_geracao_automatica`: usuário sistema, `alertas_geracao_estado`, índice dedup
- [x] `AlertaGeracaoService.GerarAlertasDiarios` — 6 regras; deduplicação; resolução automática
- [x] Cron in-process + `POST /api/v1/admin/alertas/gerar`; teste `TestGerarAlertasDiarios_NaoDuplica`
- [x] Catálogo: BR-ALERTA-008–010; extensões ciclo/leite/auditoria

### **Onda 2.5 — Web Push alertas CRÍTICA/ALTA (✅ 2026-05-29)**

- [x] Migration `33_push_subscriptions_fazenda_ativa`: `push_subscriptions`, `usuarios.fazenda_ativa_id`
- [x] Backend: `PushNotificationService` (webpush-go + VAPID), hooks em `AlertaService` / `AlertaGeracaoService`
- [x] API: `GET/PUT/DELETE /api/v1/me/push-*`, `PUT /api/v1/me/fazenda-ativa`
- [x] Frontend: SW push/click, `PushPermissionBanner`, sync `FazendaContext`, deep link `/alertas?tipo=`
- [x] Catálogo: BR-ALERTA-011–012; `deploy-notes.md` (VAPID)

### **Segurança HTTP e rate limit de auth (✅ 2026-05-27)**

- [x] Backend: `AuthRateLimit` por IP (login/registro/refresh); env `AUTH_*_RATE_LIMIT`; `SecurityHeadersMiddleware`; `SetTrustedProxies` em produção
- [x] Frontend: headers básicos em `next.config.js` (sem CSP)
- [x] Testes: `backend/internal/middleware/auth_rate_limit_test.go`
- [x] Documentação: `systemPatterns.md`, `techContext.md`, `deploy-notes.md`

### **Onda 1.1 saúde animal (✅ 2026-05-28)**

- [x] Migration `30_add_animal_saude.up.sql`: tabela `animal_saude` com FKs para `animais`/`usuarios`, `CHECK` para `tipo_caso` e `status`, `created_at` com `NOW()` e constraint `chk_animal_saude_data_fim`.
- [x] Índices operacionais: `idx_animal_saude_animal_status` e `idx_animal_saude_animal_data`.
- [x] Rollback: migration `30_add_animal_saude.down.sql` com `DROP TABLE IF EXISTS animal_saude`.

### **Onda 1.2 saúde animal (✅ 2026-05-28)**

- [x] Backend: CRUD completo de `animal_saude` em sub-recurso do animal (`GET|POST /api/v1/animais/:id/saude`, `GET|PUT|DELETE /api/v1/animais/:id/saude/:saudeId`).
- [x] Domínio: validação de `tipo_caso`, `status` e intervalo (`data_fim >= data_inicio`) em service/model.
- [x] Regra operacional: CRUD permitido apenas para animal no rebanho (`EnsureAnimalNoRebanho`) e com acesso válido à fazenda.
- [x] Sincronização: recálculo automático de `animais.status_saude` após create/update/delete (`EM_TRATAMENTO` > `DOENTE` > `SAUDAVEL`).
- [x] Testes: novos testes em service e handler para regras centrais e parsing de payload.
- [x] Documentação: catálogo `docs/business/saude-animal.md` + índice atualizado.

### **Onda 1.3 saúde animal — RBAC (✅ 2026-05-28)**

- [x] Backend: `funcionarioAnimaisSaudePath` em `perfil_access.go` — FUNCIONARIO `GET|POST` em `/api/v1/animais/:id/saude`; `PUT|DELETE` → 403; USER sem acesso.
- [x] Testes: `perfil_access_test.go` (tabela de métodos/rotas de saúde).
- [x] Frontend: rotas `/animais/:id/saude` e `/animais/:id/saude/novo` em `appAccess.ts`; helpers `canCriarRegistroSaude`, `canEditarRegistroSaude`, `canExcluirRegistroSaude`.
- [x] Documentação: BR-SAUDE-001 (matriz de perfis), BR-ACESSO-017.

### **Onda 1.4 saúde animal — UI (✅ 2026-05-28)**

- [x] Serviço `frontend/src/services/animalSaude.ts` (listagem, CRUD).
- [x] `AnimalSaudeForm` + `AnimalSaudeFormFields`; páginas listagem, novo e editar.
- [x] `AnimalSaudeTable` com ações condicionadas por perfil (Novo / Editar / Excluir).
- [x] Atalho «Saúde» na ficha do animal (`/animais/:id`).

### **Timeline paginada na ficha (✅ 2026-05-29)**

- [x] `GET /api/v1/animais/:id/timeline` com `limit`/`offset`/`tipo` (`todos|ciclo|saude|alertas`); UNION SQL em `TimelineRepository`.
- [x] Timeline removida de `/contexto`; `AnimalTimelineSection` (scroll infinito IO, chips mobile-first); `AnimalFichaCiclo` só estado + próximas ações.
- [x] Alertas na timeline (`tipo=ALERTA`, BR-ALERTA-013); produção sem cap de 15 itens; invalidação `invalidateAnimalTimeline`.
- [x] Catálogo BR-CICLO-008, BR-SAUDE-005; Postman; testes unitários repositório/service.

### **Onda 1.5 saúde animal — listagem + timeline (✅ 2026-05-28; paginação 2026-05-29)**

- [x] `AnimalSaudeList` (cards mobile, tabela desktop, coluna Observações, badges por status, paginação client 20).
- [x] Página `/animais/:id/saude`: `PageBreadcrumb`, título, `QueryListContent`.
- [x] Timeline: endpoint paginado + `AnimalTimelineSection` (`tipo=SAUDE` no filtro saúde); BR-SAUDE-005 / BR-CICLO-008.

### **Validações temporais do ciclo (✅ 2026-05-25)**

- [x] Backend: `ciclo_integridade_temporal.go` (TMP-001–006), services Create/Update, handlers `RespondIfIntegridadeCiclo`
- [x] Frontend: `maxDate`/`minDate` nos pickers; `date-limits.ts`; formulários de gestão, produção, baixa, animal, restrições
- [x] Catálogo BR-CICLO-012–014, BR-BAIXA-001/002, BR-AUDIT-010 (matriz TMP), módulos do ciclo
- [x] Checklist: `docs/tests/validacao-temporal-ciclo.md`; `getApiErrorMessage` com prefixo `[TMP-*]` / `[INT-*]`

### **Baixa do rebanho (✅ 2026-05-24; Gestão BR-BAIXA-009/010 validado 2026-05-25)**

- [x] Catálogo `docs/business/baixa-rebanho.md` (BR-BAIXA-001–010, BR-CICLO-011, BR-ACESSO-016, INT-007)
- [x] Backend: migration 27–28, `AnimalBaixaService`, guarda, RBAC FUNCIONARIO+MORTE, filtro listagem, conformidade INT-007
- [x] Frontend: `/animais/baixa`, ficha/lista/busca, remoção de `data_saida` do formulário genérico
- [x] Gestão pós-baixa: badge «Baixado», bloqueio edição, `useGestaoAnimaisByIdMap`, correção `isAnimalForaDoRebanho` (data civil — baixa no dia corrente)
- [x] M2M: campos de saída no OpenAPI; busca exclui baixados (BR-INTEG-008)
- [x] Checklist manual: `docs/tests/baixa-rebanho-checklist.md` (secção BR-BAIXA-009 validada pelo utilizador)

### **Migração Arquitetural (✅ 65%)**

- [x] **Vínculo usuário–fazenda**: Tabela `usuarios_fazendas` (N:N) com `papel` TITULAR|OPERACIONAL (migration 21); GET /api/v1/me/fazendas com `papel`; POST /api/v1/me/fazendas (apenas **PROPRIETARIO** — vínculo TITULAR); GET/PUT /api/v1/admin/usuarios/:id/fazendas (MVP: vínculos OPERACIONAL); fazenda única automática em formulários e home; admin atribui fazendas na edição de usuário; perfil não editável para ADMIN/DEVELOPER; perfil **PROPRIETARIO** no admin e isolamento em folgas (sem atalho sem vínculo para GERENTE/PROPRIETARIO)
- [x] **Limpeza**: Remoção completa de código Java/Spring legado
- [x] **Documentação**: Memory bank atualizado para nova stack
- [x] **Estrutura Monorepo**: Pastas `/backend` e `/frontend` criadas
- [x] **Backend Go**: Estrutura básica implementada
  - [x] Configuração e logger
  - [x] Modelos (Fazenda, Usuario)
  - [x] Repository pattern
  - [x] Service layer
  - [x] Handlers (CRUD Fazendas)
  - [x] Autenticação JWT (estrutura)
- [x] **Frontend Next.js**: Setup inicial
  - [x] Next.js 14+ configurado
  - [x] Tailwind CSS configurado
  - [x] Estrutura de pastas
  - [x] Cliente API básico

### **Infraestrutura (✅ 85%)**

- [x] **Estrutura Monorepo**: Criada e organizada
- [x] **Docker Compose**: Configurado para desenvolvimento local
- [x] **Dockerfile Backend**: Multi-stage build (Go 1.24), otimizado
- [x] **render.yaml**: Ajustado para Render (JWT sync:false, PORT injetado, buildFilter, autoDeployTrigger)
- [x] **CI/CD**: Build Docker do backend no pipeline
- [x] **Migrações**: golang-migrate no startup; V3 seed admin, V4 refresh tokens, V11 usuarios_fazendas
- [x] **Deploy Backend**: ✅ Funcionando em produção no Render (PostgreSQL, JWT, CORS)
- [x] **Deploy Frontend**: ✅ Funcionando em produção na Vercel; login, validate e CRUD validados no ar

### **Documentação (✅ 96%)**

- [x] **README.md**: Atualizado para nova stack
- [x] **Memory bank**: Atualizado (incl. Folgas 5x1 — regras de negócio, UX mobile, geração pelo mês visível — 2026-04-01; TestSprite API — 2026-04-21; **zoom/reflow UX** — 2026-05-11; **Header identidade + fazenda ativa** — 2026-05-12)
  - [x] `activeContext.md`: Estado atual refletindo migração
  - [x] `techContext.md`: Stack Go + Next.js documentada
  - [x] `systemPatterns.md`: Padrões atualizados (incl. DRY + composition + abstração de lógica no frontend; **zoom/reflow e checklist UX**; **Header Responsivo** com `UserIdentitySummary` e `FazendaSelector` estendido — 2026-05-12)
  - [x] `deploy-notes.md`: Deploy atualizado
- [x] **AGENTS.md**: Diretrizes atualizadas para nova stack

## 🚧 Em andamento

### **Backend Go (🚧 88%)**

- [x] Estrutura básica e configuração
- [x] Modelos de domínio
- [x] Repository e Service para Fazendas (CRUD + search, count, exists)
- [x] Handlers HTTP (CRUD Fazendas, search, count, exists)
- [x] Sistema de migrações (golang-migrate no startup)
- [x] Autenticação (login, validate), JWT RS256, middleware
- [x] Chaves JWT de desenvolvimento (devcontainer)
- [x] Módulo agrícola (fornecedores, áreas, análises de solo, safras/culturas, custos, produções, receitas, resultado)
- [x] Módulo folgas 5x1 (migration 16, API, perfis FUNCIONARIO/GESTAO, página `/folgas`, motivos/exceção na célula, filtro visual por funcionário para gestão, fazenda por `/me/fazendas` em folgas para admin/dev)
- [ ] Validações de entrada adicionais

### **Frontend Next.js (🚧 82%)**

- [x] Setup inicial e configuração
- [x] Estrutura básica
- [x] Páginas de autenticação (login)
- [x] Páginas de gestão de fazendas (listagem, nova, editar, excluir)
- [x] Componentes Shadcn/UI (button, input, card, label, table, dialog)
- [x] TanStack Query configurado
- [x] Integração com API (auth + fazendas)
- [x] **Assistente – feedback "pode falar"**: Faixa visual e aria-live quando o assistente está aguardando a fala (fluxo "Deseja mais?" e dialog de confirmação); estados aguardandoMaisOperacao, micAbreEmBreve, preparandoOuvirConfirmacao; TTS "Pode falar." opcional
- [x] **Assistente em linguagem natural**: **FAB (botão flutuante)** no canto inferior direito, visível em telas autenticadas para perfis com acesso ao assistente (**`FUNCIONARIO` oculto/bloqueado** no estado atual); um toque abre o modal do assistente. Estado em `AssistenteContext`; modal em `AssistenteDialog` no layout; **assistente removido do Header** (desktop e mobile). AssistenteInput no Dialog — acessível em qualquer página permitida. **Contexto do usuário e do sistema**: backend Interpretar recebe user_id, perfil e nome; AssistenteService carrega **fazendas vinculadas ao usuário** (GetByUsuarioID) e injeta no prompt do Gemini (nome, perfil, lista de fazendas id+nome); quando o usuário tem apenas uma fazenda e não menciona fazenda em cadastrar_animal, listar_animais_fazenda ou consultar_animais_fazenda, o LLM inclui fazenda_id e o backend usa resolveFazendaForUser (fallback uma fazenda + validação de acesso); intents por perfil (USER só fazendas; ADMIN/DEVELOPER futuros intents admin). **Intents**: Fazendas: cadastrar, listar, buscar, editar, excluir. **Animais**: consultar_animais_fazenda, listar_animais_fazenda, detalhar_animal, **cadastrar_animal** (fazenda + identificação + opcionais), **editar_animal** (id ou identificação + campos), **excluir_animal**, **registrar_producao_animal** (animal + quantidade litros). Redirect: animal → /animais/:id; animal_id → /animais/:id; fazenda_id → /fazendas/:id/animais. Interpretar (Gemini) + executar (FazendaService + AnimalService para consulta de animais), dialog de confirmação, entrada por voz (Web Speech API pt-BR). **Voz em modo contínuo**: reconhecimento contínuo, acúmulo de transcrição, finalização por clique no microfone ou timeout de silêncio (2,5 s). **Retorno em voz (TTS)** e **confirmação por voz** (sim/não). Persistência na edição (repository RowsAffected + ID), erro exibido dentro do dialog (error.details)
- [x] **Assistente Live sem fone (barge-in priorizado)**: cancelamento precoce do TTS ao detectar fala do usuário (interim), `getUserMedia` com `echoCancellation`/`noiseSuppression`/`autoGainControl`, janela anti-eco maior no mobile e reabertura do microfone sincronizada com fim do TTS; protocolo WS com `type: "interrupt"` + cancelamento de turno no backend para evitar respostas atrasadas.
- [x] **Layout e DRY**: PageContainer (variantes default, narrow, wide, centered) em todas as páginas; BackLink para "Voltar"; getApiErrorMessage (lib/errors.ts) centralizado; ApiResponse<T> em api.ts; **Header** responsivo com menu hamburger em mobile, **`UserIdentitySummary`** (iniciais, e-mail secundário, fazenda no `aria-label`), **`FazendaSelector`** (uma fazenda = cartão só leitura; várias = Select com a11y; loading), secção **Conta e fazenda** no topo do drawer e avatar compacto na barra mobile
- [x] **Módulo Administrador**: Perfis estruturados (USER, ADMIN, DEVELOPER); constraint unicidade DEVELOPER (migração 8); área admin `/admin/usuarios` (listagem, criar, editar, ativar/desativar); `GET /api/v1/admin/usuarios/pendentes-provisao` + painel de contas **USER** pendentes no topo da listagem; RequireAdmin; link Admin no Header para ADMIN/DEVELOPER
- [x] **UX e Acessibilidade**: Paleta rural (modo claro e escuro) em globals.css; toggle tema no Header e menu mobile com persistência (ThemeContext, ThemeToggle); tipografia 16px e alvos de toque 44px; ícones no menu (Farm, Cow, Milk, Users, Code); formulários e listas padronizados (space-y-5, botão lg, tabelas overflow-x-auto); home com atalhos (Ver fazendas, Ver animais, Registrar produção)
- [x] **Fluxos de acesso e onboarding**: Header oculto em `/registro`; botão "Voltar para login" no onboarding faz logout; restrição de acesso às páginas de fazenda para USER (gateway em `/fazendas`, `/fazendas/[id]` admin-only); correção de erro no `AnimalForm` ao iniciar nova criação; `/onboarding` com wizard 3 passos para **USER sem fazenda** (`components/wizard`, `OnboardingColdWizard`); página estática para USER com fazenda (perfil pendente); tour Dashboard primeira visita (`DashboardTour`, BR-ACESSO-018); empty states orientativos em animais/produção/gestão; catálogo **BR-ACESSO-009** (fila admin) e **BR-ACESSO-010** (convites planejados) em `docs/business/acessos-perfil.md`
- [x] **Módulo Agricultura no App Router**: dashboard `/agricultura`, CRUD de fornecedores e áreas, análises de solo, safras/culturas, custos, produções, receitas, resultado por fazenda/ano e comparativo de fornecedores, com serviços dedicados em `src/services/agricultura.ts`
- [x] **Folgas UX mobile (refatoração + polimento)**: layout mobile reorganizado mantendo grade mensal; alertas/equidade colapsáveis; célula tocável no mobile (sem rótulo “Ver detalhes” repetido; botão explícito só `md+`); `FolgasDiaDetalhesDialog`; grade com texto mínimo e indicador compacto para fora do rodízio no celular; histórico em cards no mobile e tabela no desktop
- [x] **Consistência com padrões de UI/erros**: `HistoryPanel` (Dev Studio) com Select Shadcn em vez de `<select>` nativo; `/admin` com `PageContainer`; erros de `useQuery` em listagens usando `getApiErrorMessage` onde havia mensagem fixa
- [x] **DRY frontend (Fase plano)**: `QueryListContent` + `ListCardLayout`; `lib/format.ts`; hook `useFolgasPage` para `/folgas` (página só UI)
- [x] **Landing pública + CTA no header**: `LandingPage.tsx` com copy focada em gestão leiteira e Brasil, marca no hero, bento sem promessas de offline/sync ou “projeções inteligentes”; mock do painel com `role="img"` + `aria-label` e ações ilustrativas não focáveis; `Header.tsx` com **Criar conta** (`/registro`) para visitantes (desktop e menu mobile)
- [x] **Home logada (Dashboard)**: `Dashboard.tsx` + `RestricoesLeiteHomePanel.tsx` + `AnimalSearchHome.tsx` — hierarquia visual, progressive disclosure e atalhos sem CTA duplicado
- [x] **`AnimalSelect` pesquisável**: combobox com filtro no cliente (`animalSelectUtils.ts`); gestão pecuária, produção e registro de restrições de leite; substitui Select com scroll longo
- [x] **UX Input/Textarea — foco**: borda única `border-ring` no foco (sem ring sobreposto); corrige aparência do campo de busca por identificação no diálogo global
- [x] **M2M saúde e alertas (2026-05-30)**: scopes `saude:read`, `saude:write`, `alertas:read`; `GET|POST /integracoes/saude`, `GET /integracoes/alertas`; idempotência POST saúde; OpenAPI + admin UI; BR-INTEG-009–011
- [x] **API de integrações M2M (2026-05-21)**: migration 25; auth `cmk_live_*` + scopes; rotas `/api/v1/integracoes` (me, animais, coberturas, toques/lote); idempotência; admin API + UI `/admin/integracoes`; catálogo `docs/business/integracoes.md` (BR-INTEG-001–007); guia `docs/integracoes/README.md`
- [x] **OpenAPI integrações M2M (2026-05-21)**: spec OpenAPI 3.0 embed + `docs/openapi/integracoes-v1.openapi.yaml`; rotas públicas `openapi.yaml`, Swagger UI `/docs`; teste `integracoes_docs_test.go`; Postman/README atualizados
- [x] **Listagens responsivas mobile (2026-05-22)**: `components/layout/list/` (`MobileListCard`, `ListRowActionsMenu`, `ResponsiveListContainer`, `DeleteRecordDialog`); todas as `*Table` com Ações ou só leitura migradas; `md+` inalterado; fix hidratação (`div` em title/subtitle do card)
- [x] **Coberturas — filtros na listagem (2026-05-24)**: `CoberturasListToolbar` + `lib/coberturas-filter.ts`; filtragem client-side por animal, tipo e período em `/gestao/coberturas`; contagem no título; empty state distinto com filtros ativos
- [x] **Toques — jornada operacional do curral (2026-05-24)**: migration `26_add_classificacao_operacional_toques`; `classificacao_operacional` + mapeamento para `resultado` (BR-TOQUES-006); UI planilha (`ToqueTable`, `ToquesListToolbar`, `ToqueFormFields`, `ToqueLoteEditor`); `POST /api/v1/toques/lote` (JWT); extensão M2M/OpenAPI (BR-INTEG-007); catálogo `docs/business/toques.md`

## 📋 Próximos Passos

### **Sprint Atual (Migração)**

- [x] Limpeza de código legado
- [x] Atualização de documentação
- [x] Estrutura monorepo
- [x] Backend Go básico
- [x] Frontend Next.js básico
- [x] Sistema de migrações (golang-migrate)
- [x] **Migração 19 — RLS em `public`**: Row Level Security em todas as tabelas de domínio (alertas PostgREST/Supabase); sem políticas para `anon`/`authenticated`; API Go com `DATABASE_URL` como dono das tabelas permanece equivalente
- [x] Autenticação (login, validate) + JWT
- [x] Backend Render configurado (render.yaml, Dockerfile, CI Docker build)
- [x] ✅ **Deploy Backend em produção** (Render - configuração manual com banco PostgreSQL e chaves JWT)
- [x] ✅ **Deploy Frontend em produção** (Vercel; `NEXT_PUBLIC_API_URL`; login, validate e CRUD validados)

### **Sprint 2 (Funcionalidades Core)**

- [x] Login + CRUD de Fazendas no frontend
- [x] Autenticação completa (registro, refresh tokens)
- [x] CRUD de Animais (backend + frontend)
- [x] CRUD de Produção de Leite (backend + frontend)
- [ ] Validações e tratamento de erros

### **Sprint 4 (Consolidação Módulo Agrícola)**

- [x] Migration 15 e estrutura de domínio agrícola no backend
- [x] Rotas de API agrícola registradas em `cmd/api/main.go`
- [x] Navegação e páginas agrícolas no frontend
- [ ] Validação integrada final (dados reais + permissões + cenários de erro)
- [ ] Testes automatizados dedicados ao módulo agrícola

### **Sprint 3 (Melhorias)**

- [ ] Testes unitários (Go)
- [ ] Testes de integração
- [ ] Observabilidade (Sentry, BetterStack)
- [ ] Otimizações de performance
- [x] **Documentação de API (integrações M2M)**: OpenAPI 3.0 + Swagger UI em `/api/v1/integracoes/docs` (JWT geral e admin integrações fora do escopo)
- [ ] Documentação OpenAPI da API JWT completa (futuro)

## 🎯 Metas de Curto Prazo

### **Meta 1: Fundação (concluída)**

- [x] CRUD fazendas, animais, produção, gestão pecuária modular, folgas, RBAC
- [x] Autenticação JWT; deploy Render + Vercel
- [x] Catálogo `docs/business/` iniciado

### **Meta 2: Ciclo integrado do rebanho** *(Fase 2 — concluída; ver `projectbrief.md`)*

- [x] Ficha do animal com timeline e estado (BR-CICLO-008)
- [x] Secagem encerra lactação ativa + uma lactação ativa (BR-CICLO-005/006)
- [x] Dashboard pecuário na home (BR-CICLO-009) com KPIs acionáveis / drill-down (BR-GESTACOES-004)
- [x] Produção exige lactação ativa (BR-CICLO-007)
- [x] API contexto enriquecido (`AnimalCicloService`)
- [x] Catálogo: partos, lactações, toques, secagens, gestações, produção (`docs/business/`)
- [x] Perfil FUNCIONARIO: POST toques + produção (BR-ACESSO-015)
- [x] Toque positivo vincula cobertura → gestação + PRENHE + UI/cache (BR-TOQUES-002)
- [x] Produção: combo e API só com lactação ativa (BR-CICLO-007 / BR-PRODUCAO-003)
- [x] BR-CICLO-002 completo (status por cio/toque negativo)
- [x] Auditoria utilizador (migrations 23–24): ciclo/leite + animais; assistente e API REST com `created_by`; BR-AUDIT-005
- [x] API conformidade (`GET .../auditoria/conformidade`)
- [x] UI conformidade na home + «Registado por» na ficha (BR-AUDIT-003/006)
- [x] Checklist regressão ciclo ([docs/tests/regressao-ciclo-fase2.md](../docs/tests/regressao-ciclo-fase2.md))
- [ ] Execução manual do checklist em staging (validação operacional)

### **Meta 2b: Integrações externas (M2M — concluída em código)**

- [x] Migration 25 + perfil `INTEGRACAO` + chaves `cmk_live_*`
- [x] Rotas M2M v1 (animais, coberturas, toques unitário/lote) + idempotência + auditoria `integracao_chamadas`
- [x] Admin CRUD clientes + UI `/admin/integracoes`
- [x] Catálogo `docs/business/integracoes.md` (BR-INTEG-001–011; saúde e alertas M2M 2026-05-30)
- [x] OpenAPI 3.0 + Swagger UI públicos (`/api/v1/integracoes/docs`)
- [x] M2M saúde e alertas: scopes `saude:read`, `saude:write`, `alertas:read`; rotas `/integracoes/saude`, `/integracoes/alertas`
- [ ] Validação operacional em staging (cliente real, lote de toques pós-vet)
- [ ] Escopos adicionais (produção, partos) — backlog

### **Meta 3: Saúde e inteligência** *(Fase 3 — `projectbrief.md`)*

- [x] Módulo saúde animal (CRUD, RBAC, UI, timeline, sync `status_saude`; catálogo `saude-animal.md`)
- [x] Assistente Live: tools saúde e alertas (2026-05-30)
- [x] Alertas automáticos de ciclo/saúde/conformidade (Onda 2.2 — ver progress Onda 2.2)
- [ ] Predições avançadas (reprodução, produção)
- [ ] Assistente por capacidades; integração IoT (opcional)
- [ ] Testes de integração cobrindo 70%+

## 📊 Métricas de Progresso Detalhadas

### **Desenvolvimento**

```progress
████████▄▄ 80%
```

### **Qualidade**

```progress
▄▄▄▄▄▄▄▄▄▄ 0%
```

### **Documentação**

```progress
█████████▄ 90%
```

### **Infraestrutura**

```progress
██████████ 90%
```

## 🔄 Histórico de Progresso

### **2026-05-07 - Restrições de leite: combo só com lactação ativa**

- ✅ **API**: `GET /api/v1/fazendas/:id/animais/em-lactacao` (lista animais com lactação aberta na fazenda); `POST .../restricoes-leite` rejeita animal sem lactação ativa (validação alinhada à UI).
- ✅ **Backend**: `AnimalRepository.ListEmLactacaoByFazendaID`, `LactacaoRepository.ExistsAtivaNaFazenda`, `RestricaoLeiteService` com `lactacaoRepo`; `perfil_access` estende `GET` em animais por fazenda para `/em-lactacao`.
- ✅ **Frontend**: `listEmLactacaoByFazenda` em `services/animais.ts`; `RestricoesLeiteHomePanel` usa essa lista no dialog de registro.
- ✅ **Negócio**: **BR-LEITE-005** em `docs/business/leite-restricoes.md`; `acessos-perfil.md` e `systemPatterns.md` ajustados.

### **2026-05-09 - Landing pública e header para visitantes**

- ✅ **Landing** (`frontend/src/components/landing/LandingPage.tsx`): badge e texto alinhados a leite/rebanho/equipe; H1 com **CeialMilk**; cards “Produção e registro leiteiro”, “Reprodução sob controle”, “Feito para o Curral” com copy honesta (PWA/mobile, evolução em campo); ilustração com descrição para leitores de tela; imports mortos removidos.
- ✅ **Header** (`frontend/src/components/layout/Header.tsx`): visitantes veem **Criar conta** + **Entrar** no desktop e no drawer mobile.

### **2026-05-09 - Home logada (Dashboard) menos poluída**

- ✅ **`Dashboard.tsx`**: secções com títulos de apoio (`sr-only` / “Acesso rápido”); atalhos em lista compacta (`md:hidden`) e grelha de cards clicáveis no desktop; ícone **Folgas** `CalendarDays`; gestão reprodutiva restrita com `ClipboardList`.
- ✅ **`RestricoesLeiteHomePanel.tsx`**: resumo curto no cabeçalho; explicação longa em `<details>`; lista/tabela com altura máxima e scroll quando há registros; `CardContent` oculto quando não há itens após carga.
- ✅ **`AnimalSearchHome.tsx`**: copy enxuto; painel de busca recolhível no mobile (`useMediaQuery` + botão Abrir/Recolher); desktop sempre expandido.

### **2026-05-09 - Mobile: busca animal (home + header + deep link)**

- ✅ **`Dashboard.tsx`**: `AnimalSearchHome` só em `md+`; lista mobile com atalho **Buscar animal** (evolução em **2026-05-10**: diálogo global alinhado à busca da home — ver secção seguinte); perfil restrito com **Folgas** primeiro; `safe-area` no padding inferior da home.
- ✅ **`Header.tsx`**: atalhos de busca para animais com RBAC (`isPathAllowedForPerfil` em `/animais`) — evolução **2026-05-10**: `openDialog()` em vez de só navegar à lista.
- ✅ **`/animais`**: `useSearchParams` + `Suspense`; foco e opcional `q` na identificação; limpeza da query na barra de endereços (`?focusSearch=1` continua útil para ir à lista com foco no filtro).

### **2026-05-10 - Lupa e atalho mobile: mesma UX que «Busca por identificação»**

- ✅ **`AnimalSearchPanel.tsx`** + **`AnimalSearchDialogContext.tsx`** + provider em **`Providers.tsx`**: diálogo global com resumo e «Abrir detalhes do animal».
- ✅ **`Header.tsx`**: lupa mobile/desktop e item do drawer chamam `openDialog()` (em vez de só ir à lista).
- ✅ **`Dashboard.tsx`**: primeira linha «Buscar animal» na lista mobile abre o mesmo diálogo (com `isPathAllowedForPerfil` em `/animais`).
- ✅ **`AnimalSearchHome.tsx`**: removido `useEffect` que sincronizava estado com breakpoint (lint `react-hooks/set-state-in-effect`).
- ✅ **`AnimalSearchPanel.tsx`**: busca por debounce (~400 ms) + sequência contra resposta atrasada; **Enter** força busca imediata; botão «Pesquisar» removido.

### **2026-05-11 - Documentação: zoom, reflow e UX em telas**

- ✅ **`memory-bank/systemPatterns.md`**: nova subsecção **Zoom do navegador, escala de texto do sistema e reflow** em **Padrões de UX e Acessibilidade** (premissa zoom/fonte SO, WCAG 1.4.4/reflow, layout fluido, flex/`min-h-0`, modais com scroll, truncamento, tabelas, checklist para IA); versão dos padrões **2.20**.
- ✅ **`AGENTS.md`**: bullet em Código TypeScript/Next.js apontando para `systemPatterns.md`.
- ✅ **`.cursor/rules/project-context.mdc`**: entrada em **Implementando nova funcionalidade** para aplicar zoom/reflow no frontend conforme `systemPatterns.md`.
- ✅ **Fluxo «Buscar por identificação» (código)**: `AnimalSearchDialogContext` — ancoragem ao topo + `translate-y-0`, `max-h` com `dvh`, cabeçalho fixo e corpo com `min-h-0` + `overflow-y-auto`; `AnimalSearchPanel` / `AnimalSearchHome` — `min-w-0`, `break-words` no resumo, botões de resultado multilinha.

### **2026-05-07 - Restrições de leite (descarte até laboratório)**

- ✅ **Banco**: migration V20 `restricoes_leite` com RLS, índices e único parcial (um `AGUARDANDO_LAB` por animal).
- ✅ **Backend**: handlers/services/repository/model; rotas por fazenda; `GET /api/v1/animais/:id/contexto` inclui `restricao_leite_ativa` quando aplicável; whitelist FUNCIONARIO em `perfil_access.go` para `GET|POST` em `/restricoes-leite` (sem `PATCH` liberar).
- ✅ **Frontend**: `RestricoesLeiteHomePanel` na home, `restricoesLeite.ts`, alerta na `AnimalSearchHome` quando há restrição ativa.
- ✅ **Documentação**: `docs/business/leite-restricoes.md`, `BR-ACESSO-005`, atualizações em `animais.md`, `README` do catálogo, `systemPatterns.md`.

### **2026-05-07 - RBAC FUNCIONARIO ampliado (home + gestão parcial + animais consulta)**

- ✅ **Frontend RBAC**: `appAccess.ts` passou a permitir `FUNCIONARIO` em `/`, `folgas`, `gestao` e `animais`, com whitelist de sub-rotas em `isPathAllowedForPerfil` (Gestão: Cios/Coberturas/Partos/Secagens; Animais: listagem e detalhe).
- ✅ **Home para perfil restrito**: página inicial (`/`) deixou de redirecionar automaticamente perfis restritos e passou a exibir atalhos permitidos para FUNCIONARIO (Animais consulta, Gestão parcial, Folgas).
- ✅ **UI de Animais (somente consulta)**: remoção de ações de criar/editar/excluir e de registrar produção para FUNCIONARIO em listagem e detalhe.
- ✅ **Backend RBAC por método**: `RequirePerfilAPIAccess` agora combina método HTTP + path para FUNCIONARIO (GET em `/api/v1/animais*`; whitelist de `/api/v1/cios*`, `/api/v1/coberturas*`, `/api/v1/partos*`, `/api/v1/secagens*`, `/api/v1/fazendas/:id/folgas/*` e `/api/v1/me/*`).
- ✅ **Catálogo de negócio**: novo módulo `docs/business/acessos-perfil.md` com regras `BR-ACESSO-001` até `BR-ACESSO-004`.

### **2026-05-07 - Login/landing por perfil + FUNCIONARIO sem fazenda → /onboarding**

- ✅ **Login respeita o perfil**: `LoginForm` deixou de mandar todo usuário autenticado para `/fazendas`. Perfis com áreas restritas (FUNCIONARIO) vão direto para `getDefaultLandingPath(perfil)`; perfis com acesso pleno mantêm o fluxo legado por `/fazendas`. `?redirect=` é validado contra o perfil via `isPathAllowedForPerfil`. `RegistroForm` segue a mesma regra.
- ✅ **`AuthContext.login` retorna `User | null`** para o caller decidir o destino sem esperar re-render.
- ✅ **`FazendaContext` recarrega após login (sem hard reload)**: o guard `hasLoaded` deixou de ser marcado no ramo deslogado, então a transição `isAuthenticated: false → true` dispara o carregamento das fazendas vinculadas; durante a carga autenticada, `isReady` volta a `false` para evitar UI vazia.
- ✅ **FUNCIONARIO sem fazenda vai para `/onboarding`**: `useFolgasPage` chama `useMinhasFazendas` para qualquer perfil, expõe `semFazendaVinculada` e a página `/folgas` redireciona automaticamente; `LoginForm.handleSubmit` faz pré-checagem (`maybeRedirectToOnboarding`) para evitar o flash. Para o cenário de **2+ fazendas sem ativa** (não-admin), a mensagem em `/folgas` foi reescrita para orientar o uso do seletor no header.

### **2026-03-25 - Folgas e fazenda ativa (UX)**

- ✅ **`/folgas` — filtro por funcionário**: Gestão (ADMIN/DEVELOPER/GESTAO) pode usar “Visualizar folgas de” para destacar apenas os dias de folga do usuário selecionado e esmaecer os demais; contagem de dias no mês.
- ✅ **`/folgas` — fazenda para ADMIN/DEVELOPER**: Passa a usar `GET /api/v1/me/fazendas` (vínculos), não a lista global de fazendas; seletor na página só quando há **mais de uma** fazenda vinculada; uma única fazenda é usada automaticamente; troca sincronizada com `setFazendaAtiva`.
- ✅ **`FazendaContext`**: Tratamento explícito de 0, 1 e N fazendas retornadas por `getMinhasFazendas`; com exatamente uma fazenda, sempre define como ativa e persiste (sobrescreve necessidade de `savedId` prévio).

### **2026-03-26 - Folgas (mensagens de erro amigáveis)**

- ✅ **`unique_violation` / “duplicate key”**: backend e frontend agora convertem mensagens genéricas de duplicidade para texto orientativo no fluxo de **alterar dia** da escala 5x1 (evita exibir “duplicate key” ao usuário).

### **2026-03-26 - Folgas: permissões de gestão para GERENTE**

- ✅ `GERENTE` agora é tratado como perfil com permissões de gestão na tela `/folgas` (front) e nas validações de API para gerar/alterar escala (back).
- ✅ Os combos de usuários continuam restringindo as opções para `FUNCIONARIO` e `GERENTE` (com `GESTAO` como compatibilidade).

### **2026-03-26 - Folgas: UX mobile com detalhes por dia**

- ✅ **Hierarquia mobile da página**: navegação de mês + ações em bloco compacto, com melhor priorização visual no topo.
- ✅ **Alertas e Equidade no mobile**: exibidos em seções colapsáveis para reduzir rolagem antes do calendário.
- ✅ **Células do calendário**: simplificadas para resumo visual (status do dia + indicadores), removendo excesso de texto no grid.
- ✅ **Interação touch-friendly**: novo dialog “Detalhes do dia” com previsão do rodízio, registros e ações contextuais (Alterar/Justificar).
- ✅ **Histórico responsivo**: cards no mobile e tabela mantida no desktop.

### **2026-04-01 - Folgas: polimento mobile e documentação de regras**

- ✅ **Célula sem poluição horizontal**: remoção do texto “Ver detalhes” em todas as células no mobile; toque na célula abre detalhes; teclado `Enter`/`Espaço` suportado.
- ✅ **Texto na grade**: rótulo curto do previsto (nome ou `#id`); sem “folga(s)” genérico duplicado; `—` quando não há folga; “Exceção” curto no grid; fora do rodízio como ponto âmbar no mobile e badge no desktop.
- ✅ **Regra de negócio documentada**: “Gerar mês automático” preenche o **mês visível** no calendário (intervalo início–fim do mês navegado), preservando registros `MANUAL`.
- ✅ **Memory bank**: `activeContext`, `progress`, `systemPatterns`, `techContext`, `productContext`, `projectbrief` atualizados.

### **2026-04-21 - TestSprite (testes de API / MCP)**

- ✅ **Plano e scripts**: `testsprite_tests/testsprite_backend_test_plan.json` alinhado a rotas e envelope `SuccessResponse`; `TC001`–`TC009` em Python; `testsprite_api_helpers.py` com `BASE_URL`/`TIMEOUT` e seed admin via env (`TESTSPRITE_ADMIN_*`).
- ✅ **TC006**: fluxo registo+login **FUNCIONARIO** + `GET /api/v1/me/fazendas` (coerente com `RequirePerfilAPIAccess`).
- ✅ **TC007 e MCP**: fixture canónico `testsprite_tests/fixtures/TC007_post_api_v1_animais_creates_animal.canonical.py` + `scripts/testsprite-restore-tc007.sh` para repor o ficheiro após `generateCodeAndExecute` (o gerador cloud tende a ignorar `data.access_token`).
- ✅ **Documentação**: `testsprite_tests/README_TESTSPRITE.md` (âmbito só API, frontend plan vazio, aviso de overwrite); relatórios MCP em `tmp/raw_report.md` e `testsprite-mcp-test-report.md`.
- ✅ **Execução local**: `cd testsprite_tests && for f in TC*.py; do python3 "$f"; done` valida os 9 cenários contra `http://localhost:8080` (API + migrações com seed admin).

### **2026-03-26 - Admin usuários: padrão UI + auto-vínculo de fazenda única**

- ✅ **UI da rota `/admin/usuarios` padronizada**: campo de perfil no formulário de usuário migrado de `<select>` nativo para `Select` Shadcn.
- ✅ **Perfis no admin alinhados**: inclusão de `GERENTE` no formulário de edição/criação e mapeamento completo de labels na tabela (USER, FUNCIONARIO, GERENTE, GESTAO, ADMIN, DEVELOPER).
- ✅ **Correção de edição de perfil**: usuários com perfil `GERENTE` deixam de sofrer fallback indevido para `USER` no estado inicial do formulário.
- ✅ **Provisão de utilizadores (segurança)**: registo público → perfil `USER` sem `usuarios_fazendas`; sem auto-vínculo em login/validate/admin create; catálogo global de fazendas na API só **ADMIN/DEVELOPER**; `USER` com API mínima e UI `pending` até elevação de perfil (`docs/business/acessos-perfil.md` BR-ACESSO-007/008).

### **2026-02-15 - Melhorias Módulo Gestão Pecuária**

- **Componentes reutilizáveis**: GestaoListLayout, GestaoFormLayout, useAnimaisMap
- **Tabelas**: CioTable, PartoTable, LactacaoTable, CoberturaTable, ToqueTable, SecagemTable, GestacaoTable — exibem identificação do animal
- **Formulários**: DatePicker, Select Shadcn, getApiErrorMessage
- **Cios CRUD completo**: PUT backend, página de edição, Excluir com Dialog

### **2026-02-12 - Assistente Live: prioridade de fala do usuário (barge-in)**

- ✅ **Frontend**: Detecção precoce de fala (interim) para interromper TTS antes do `isFinal`; envio de `interrupt` antes de novo `text`; prewarm do microfone com AEC/NS/AGC; reabertura do microfone no Live respeitando janela anti-eco (desktop/mobile).
- ✅ **Backend**: Sessão Live com controle de turno (`BeginTurn`, `InterruptTurn`, `FinishTurn`) e contexto cancelável por turno.
- ✅ **Respostas antigas bloqueadas**: Escritas no WebSocket condicionadas ao turno ativo (`WriteWSJSONForTurn`, `WriteWSMessageForTurn`) para impedir sobreposição/confusão após interrupção.

### **2026-02-10 - Assistente flutuante (FAB) e remoção do Header**

- ✅ **FAB e contexto**: Acesso ao assistente via botão flutuante (FAB) fixo no canto inferior direito; visível apenas em rotas autenticadas; um toque abre o modal. Estado compartilhado em `AssistenteContext` (AssistenteProvider em Providers).
- ✅ **Remoção do Header**: Botão e Dialog do assistente removidos do Header (desktop e mobile). Modal renderizado no layout via `AssistenteDialog`; FAB via `AssistenteFab` em ConditionalHeader.

### **2026-02-08 - Assistente Virtual Multimodal Live**

- ✅ **Implementação Completa**: Substituição da solução antiga por uma interface de voz em tempo real via WebSockets.
- ✅ **Function Calling**: Integração direta com os serviços de Fazenda, Animal e Produção.
- ✅ **Contexto Inteligente**: Suporte a usuário logado e fazenda ativa selecionada no sistema.
- ✅ **UI/UX**: Visualizador de ondas sonoras e transcrição em tempo real.
- ✅ **Correção de Erros**: Resolvidos problemas de compilação e tipos no Protocol Buffers.

### **2026-02-08 - Correção Assistente Live**

- ✅ **Correção de Erros de Compilação**: Resolvidos problemas no `assistente_live_handler.go` e `assistente_live_service.go` que impediam o build do backend.
  - Removido import `encoding/base64` não utilizado.
  - Exportados campos `UserID`, `Perfil`, `NomeUsuario` e `FazendaAtiva` na struct `Session` para acesso pelo handler.
  - Corrigida asserção de tipo em `processFunctionResponse` para garantir que o resultado seja `map[string]any` antes de enviar ao Gemini.

### **2026-02-08 - Assistente em qualquer navegador (incl. mobile)**

- ✅ **Compatibilidade cross-browser**: Assistente Live passa a funcionar em qualquer navegador, inclusive mobile (Safari iOS, Chrome Android, Firefox Android, etc.).
  - **Frontend**: Removida a captura de áudio bruto em `useGeminiLive` (ScriptProcessorNode/AudioContext falhavam em Safari e vários mobile). Entrada por voz continua via Web Speech API (transcrição no cliente → `sendText()`).
  - **Fallback texto**: Quando o navegador não suporta reconhecimento de voz, o modo Live permanece disponível em **apenas texto** (digitar e enviar com Enter ou botão Enviar); mensagem orienta o usuário.
  - **UI**: Botão do Assistente Live visível mesmo sem suporte a voz; no Live, botão Enviar envia o texto digitado via WebSocket quando em modo Live.
  - **Documentação**: `systemPatterns.md` e `activeContext.md` atualizados com o padrão de compatibilidade.
  - Ajustado `ExecuteFunction` para retornar `map[string]any` em vez de `map[string]string`.

### **2025-09-07 - Dia 1**

- ✅ **Setup inicial**: Estrutura do projeto criada (Java/Spring)
- ✅ **Docker compose**: Serviços configurados (PostgreSQL, Redis, App)
- ✅ **Maven setup**: Dependências configuradas com Spring WebFlux
- ✅ **Documentação**: README.md e memory bank inicializados
- ✅ **Schema DB**: Estrutura inicial do banco de dados

### **2025-09-08 - Dia 2**

- ✅ **Entidade Fazenda**: Implementação completa do CRUD reativo (Java)
- ✅ **Sistema de autenticação**: JWT com Spring Security 6 configurado
- ✅ **Controller de autenticação**: Endpoints de login e validação
- ✅ **API RESTful**: Endpoints funcionais para Fazenda

### **2026-01-24 - Migração Arquitetural**

- ✅ **Decisão de Stack**: Migração para Go + Next.js definida
- ✅ **Limpeza**: Remoção de código Java/Spring legado
- ✅ **Documentação**: Memory bank completamente atualizado
- ✅ **Estrutura Monorepo**: `/backend` e `/frontend` criados
- ✅ **Backend Go**: Estrutura básica implementada
  - Configuração, logger, modelos
  - Repository, Service, Handlers
  - CRUD Fazendas funcional
- ✅ **Frontend Next.js**: Setup inicial completo
  - Next.js 14+ configurado
  - Tailwind CSS configurado
  - Estrutura de pastas
- ✅ **Backend Render**: render.yaml e Dockerfile ajustados (JWT sync:false, PORT injetado, buildFilter, autoDeployTrigger); Dockerfile Go 1.24; CI com build Docker; deploy-notes atualizado

### **2026-01-25 - Deploy em Produção**

- ✅ **Deploy Backend**: Backend funcionando em produção no Render
  - Banco PostgreSQL criado e configurado
  - Variáveis de ambiente configuradas (DATABASE_URL, JWT_PRIVATE_KEY, JWT_PUBLIC_KEY, ENV, LOG_LEVEL, CORS_ORIGIN)
  - Chaves JWT geradas e configuradas (par RSA via openssl)
  - Health check e rotas de API operacionais
  - Migrações executadas automaticamente no startup
- ✅ **Deploy Frontend**: Frontend funcionando em produção na Vercel
  - Repositório conectado, Root Directory `frontend`, `NEXT_PUBLIC_API_URL` apontando para o backend
  - Correção 401 pós-login: cookies `SameSite=None` em produção cross-origin (Vercel + Render)
  - Login, validate e CRUD de fazendas validados no ar

### **Próximos Marcos**

- **2026-02-07**: Testes automatizados (E2E ou unitários) iniciados
- **2026-02-14**: Deploy completo em produção (Render + Vercel) ✅ concluído
- **2026-02-21**: Testes de integração implementados

## 🎯 Objetivos de Aprendizado

### **Técnicos**

- [x] Entender arquitetura Go e padrões
- [x] Dominar Gin framework
- [x] Aprender Next.js App Router
- [x] Implementar autenticação JWT RS256
- [x] Configurar backend para Render (render.yaml, Dockerfile, CI Docker build)
- [x] ✅ **Deploy Backend em produção** (Render - configuração manual com banco PostgreSQL e chaves JWT)
- [x] ✅ **Deploy Frontend em produção** (Vercel; `NEXT_PUBLIC_API_URL`; login, validate e CRUD validados)

### **Produto**

- [ ] Entender necessidades reais de fazendas leiteiras
- [ ] Coletar feedback constante dos usuários
- [ ] Iterar rapidamente baseado em métricas
- [ ] Desenvolver visão de produto clara

## 📈 Evolução das Decisões

### **Decisões Consolidadas**

- ✅ Stack técnica: Go (Gin) + Next.js 14+ + PostgreSQL
- ✅ Banco de dados: PostgreSQL com schema mantido
- ✅ Autenticação: JWT RS256 com refresh tokens
- ✅ Infraestrutura: Monorepo com Render (backend) + Vercel (frontend)
- ✅ Segurança: Cookies HttpOnly, Bcrypt, CORS estrito
- ✅ Observabilidade: Sentry, BetterStack, Prometheus
- ✅ Sistema de migrações: golang-migrate no startup

### **Decisões em Avaliação**

- 🔄 Estratégia de cache (Redis vs in-memory)
- 🔄 Estratégia de testes (table-driven vs outros padrões)

---

### **2026-01-26 - Dev Studio Fase 1**

- ✅ **Dev Studio Fase 1**: Automação de PRs via GitHub API implementada
  - GitHubService criado com integração completa à GitHub API REST
  - Endpoint `/api/v1/dev-studio/implement/:request_id` para criar PRs
  - Componente PRStatus no frontend para exibir informações do PR
  - Fluxo completo: validação → criação de PR → exibição de status
  - Migração 7_add_pr_fields_to_dev_studio para campos PR no banco
  - Documentação atualizada (QUICK_START.md, SETUP.md)

### **2026-01-26 - Dev Studio Fase 2**

- ✅ **Dev Studio Fase 2**: RAG dinâmico e monitoramento implementados
  - RAG dinâmico: `loadProjectContext` retorna mapa de arquivos; `selectRelevantContext` escolhe systemPatterns + techContext (fixos) + até 2 docs variáveis (activeContext, progress, productContext, projectbrief) por relevância ao prompt (keywords). Fallback activeContext se todos score 0.
  - API `GET /api/v1/dev-studio/usage`: retorna `used_last_hour`, `limit_per_hour`, `used_today`. **Não consome** rate limit.
  - Rate limit: `GET /api/v1/dev-studio/usage` excluído do limite de 5 req/hora.
  - Frontend: `UsageAlert` (métricas + alertas próximo/limite), integração na página Dev Studio, `ChatInterface` desabilita envio ao limite e exibe mensagem clara em 429.

### **2026-01-26 - Contexto tipo Cursor e contexto do repositório**

- ✅ **Contexto tipo Cursor**: `loadTargetFilesForPrompt` infere arquivos-alvo (menu, Header, rota, link, dev-studio) e inclui o estado atual no contexto. Instruções no prompt: usar como base, preservar o resto; trabalhar como IDE. Geração e refinamento usam o mesmo fluxo.
- ✅ **Contexto sempre do repositório**: Com `GITHUB_TOKEN` + `GITHUB_REPO` configurados, exemplos de código e arquivos-alvo vêm sempre da **branch de produção** (`GITHUB_CONTEXT_BRANCH`, default `main`) via `GitHubService.GetFileContent`. Config `GITHUB_CONTEXT_BRANCH`; fallback para disco local quando GitHub não está configurado. Solução validada em uso.

### **2026-01-26 - Dev Studio Fase 3 (Diff Viewer e Linter Automático)**

- ✅ **Diff Viewer**: Visualização de diferenças entre código gerado e código atual no repositório
  - Backend: `GetFileDiffs()` no `DevStudioService` que compara código gerado com conteúdo da branch `main` via `GitHubService.GetFileContent()`
  - Endpoint `GET /api/v1/dev-studio/diff/:request_id` com validação de perfil DEVELOPER
  - Frontend: componente `DiffViewer` customizado usando biblioteca `diff` para cálculo de diferenças
  - Integração no `CodePreview` com tabs "Preview" e "Diff" para alternar entre visualizações
  - Exibição linha por linha com cores (verde para adições, vermelho para remoções)
- ✅ **Linter Automático**: Validação sintática e de lint para Go e TypeScript
  - Backend: `LinterService` com validação básica de sintaxe (arquivos vazios, chaves balanceadas)
  - Integração no `ValidateCode()` do `DevStudioService` retornando `ValidationResult` com erros e avisos
  - Endpoint `POST /api/v1/dev-studio/validate/:request_id` atualizado para retornar resultados do linter
  - Frontend: exibição de erros e avisos do linter em boxes coloridos (amber para avisos, red para erros)
  - Botão "Criar PR" desabilitado quando `validationResult.has_errors` é true

### **2026-01-26 - Dev Studio - Cancelamento de Requisições**

- ✅ **Cancelamento de Requisições**: Funcionalidade completa para cancelar requisições geradas
  - Backend: método `CancelRequest()` no `DevStudioService` com validação de autorização (apenas dono pode cancelar) e proteção contra cancelamento de requisições já implementadas (com PR criado)
  - Endpoint `DELETE /api/v1/dev-studio/:request_id` com validação de perfil DEVELOPER
  - Auditoria de cancelamentos registrada em `dev_studio_audit`
  - Frontend: botão "Cancelar" no `CodePreview` (visível apenas quando status não é "cancelled" ou "implemented")
  - Dialog de confirmação moderno usando Shadcn/UI Dialog (substituindo `confirm()` nativo)
  - Atualização automática do histórico após cancelamento via `refreshTrigger` no `HistoryPanel`
  - Badge "Cancelado" no `HistoryPanel` e filtro por status "cancelled"
  - Status "cancelled" exibido no histórico e no preview de código

### **2026-01-27 - Assistente: persistência e feedback de erro**

- ✅ **Persistência na edição**: Repositório de fazendas valida ID no Update e verifica RowsAffected (erro se nenhuma linha atualizada); queryList corrigido (cópia por linha). Assistente valida ID da fazenda resolvida e log de debug.
- ✅ **Erro na confirmação**: Frontend exibe erro **dentro** do dialog de confirmação; getErrorMessage prioriza `error.details` (motivo real da API) sobre `error.message`; limpeza de erro ao cancelar e ao tentar confirmar novamente.

### **2026-02-01 - Assistente: buscar fazenda**

- ✅ **Intent buscar_fazenda**: Nova intent para pesquisar fazendas por nome via assistente (ex.: "buscar fazenda Sítio X", "pesquisar fazenda X")
- ✅ **Backend**: Prompt do Gemini atualizado; `executarBuscarFazenda` usa `SearchByNome`; retorna 1 fazenda ou lista; mensagens específicas no handler
- ✅ **Frontend**: `getRedirectPathFromResult` redireciona para `/fazendas/:id` quando 1 resultado; `lastRedirectPathRef` para fluxo de voz (Deseja mais? → não)

### **2026-02-01 - Assistente: consultar animais por fazenda**

- ✅ **Intent consultar_animais_fazenda**: Nova intent para perguntas como "quantas vacas tem na fazenda X" (ex.: "quantas vacas tem na fazenda Larissa")
- ✅ **Backend**: AssistenteService com AnimalService; prompt com intent e exemplos; `executarConsultarAnimaisFazenda` usa `resolveFazendaByPayload` + `CountByFazenda`; retorna message, count, fazenda_nome; handler coloca message no envelope para TTS
- ✅ **Frontend**: Sem alteração; getRedirectPathFromResult retorna /fazendas para objeto sem id; TTS usa message do envelope

### **2026-02-01 - Assistente: listar animais e detalhar animal**

- ✅ **Intent listar_animais_fazenda**: "quais animais tem na fazenda X", "me dá mais informações sobre os animais da fazenda Y"; retorna message + lista (identificação, raça, sexo, status) + fazenda_id; redireciona para /fazendas/:id/animais
- ✅ **Intent detalhar_animal**: "detalhes do animal 123", "informações sobre o animal identificação Y"; por id ou identificacao; retorna message + animal; redireciona para /animais/:id
- ✅ **Backend**: executarListarAnimaisFazenda, executarDetalharAnimal, formatAnimalMessage; handler coloca message no envelope
- ✅ **Frontend**: getRedirectPathFromResult trata data.animal → /animais/:id e data.fazenda_id → /fazendas/:id/animais

### **2026-02-01 - Página de detalhes do animal e operações**

- ✅ **Página /animais/[id]**: Detalhes do animal (identificação, raça, nascimento, sexo, status), fazenda (nome + link para animais da fazenda), resumo de produção (total, média, nº registros), ações Editar, Excluir, Registrar produção
- ✅ **Página /fazendas/[id]/animais**: Listagem de animais da fazenda; link "Novo Animal" com fazenda pré-selecionada
- ✅ **AnimalTable**: Botão "Ver" que leva para /animais/:id
- ✅ **animais/novo**: Invalidação de ['fazendas', fazenda_id, 'animais'] ao criar animal

### **2026-02-01 - Assistente: operações completas para animais**

- ✅ **cadastrar_animal**: Fazenda (nome ou id) + identificação + raça, data_nascimento, sexo, status_saude opcionais; retorna { message, animal }; redirect /animais/:id
- ✅ **editar_animal**: id ou identificação + identificacaoNovo, raca, data_nascimento, sexo, status_saude, fazenda_id; retorna { message, animal }; redirect /animais/:id
- ✅ **excluir_animal**: id ou identificação; retorna { message, id }; redirect /animais
- ✅ **registrar_producao_animal**: animal (id ou identificação) + quantidade (litros) + data_hora/qualidade opcionais; retorna { message, animal_id, producao }; redirect /animais/:animal_id
- ✅ **Backend**: ProducaoService no AssistenteService; resolveAnimalByPayload; ErrAnimalIdentificacaoDuplicada; handler com Conflict para identificação duplicada
- ✅ **Frontend**: getRedirectPathFromResult trata data.animal_id → /animais/:id

### **2026-02-16 - Ajustes Assistente e Gestão Pecuária**

- ✅ **useAnimaisMap**: Garantia de array iterável (`Array.isArray(data) ? data : []`) para evitar "animais is not iterable" em rotas como `/gestao/toques`
- ✅ **Assistente Virtual (modo Live)**: Resposta exibida como texto puro (sem ReactMarkdown), sem negrito a partir de `*`; usuário não precisa "falar" asterisco; TTS e visual consistentes

### **2026-05-06 - Animais: usabilidade de datas históricas**

- ✅ **DatePicker com entrada manual**: suporte a digitação com autoformatação `DD/MM/AAAA` (usuário pode focar em digitar os números), conversão para `YYYY-MM-DD`, validação de data inválida e manutenção de compatibilidade com `onChange`.
- ✅ **Navegação rápida de ano**: calendário do DatePicker configurado com dropdown de anos (faixa configurável), reduzindo cliques para datas antigas.
- ✅ **Formulário de Animal**: campos `data_nascimento`, `data_entrada` e `data_saida` em novo/editar animal usando modo manual (`manualInput`) para acelerar registros retroativos.
- ✅ **Correção de offset de fuso em data pura**: `formatDatePtBr` no frontend passou a tratar `YYYY-MM-DD` sem deslocamento de timezone (evita exibir/gravar um dia anterior em cenários como `01/01/2022` → `31/12/2021`).

### **2026-05-06 - Gestão Pecuária: animal automático da cria**

- ✅ **Backend `CriaService`**: animal gerado com `data_nascimento` = `parto.Data`, `origem_aquisicao` NASCIDO, `raca` opcional; identificação custom ou padrão automático com prefixo **FILHO** (macho) / **FILHA** (fêmea), identMae, data, parto e índice; `ExistsByIdentificacao`; duplicata → `ErrAnimalIdentificacaoDuplicada` / HTTP 409 no handler.
- ✅ **`models.Cria`**: `animal_identificacao`, `animal_raca` com `db:"-"` (só entrada JSON).
- ✅ **Frontend**: `CriaCreatePayload` + campos por linha em `PartoFormFields` e em `PartoEditCriasPanel`; placeholder de raça com raça da mãe.

### **2026-05-06 - Gestão Pecuária: crias no fluxo de parto**

- ✅ **`services/crias.ts`**: `create` + tipos alinhados ao handler (`sexo`, `condicao`, `peso`, `parto_id`).
- ✅ **Novo parto**: `PartoFormFields` com seção dinâmica por número de crias (`sexo` M/F, situação Vivo/Natimorto, peso opcional); envio ao backend passou a ser **um único** `POST /api/v1/partos` com `crias[]` (ver histórico “transações parto + crias”).
- ✅ **Editar parto**: `PartoEditCriasPanel` — listagem (`GET ?parto_id=`), alerta se quantidade ≠ `numero_crias`, formulário para registrar cria em falta; invalidação de queries `crias` e `animais`.
- ✅ **Constantes**: `components/gestao/cria-constants.ts` para enums exibidos em pt-BR.

### **2026-05-06 - Gestão Pecuária: transações parto + crias + animal**

- ✅ **`CriaService.Create`**: `pgxpool.Pool.Begin` + `INSERT crias` / `INSERT animais` / `UPDATE crias` na mesma transação para cria VIVO com animal automático; `PartoRepository.GetByIDForUpdateTx` para serializar por `parto_id`; variantes `*Tx` em repositórios de cria, animal, parto.
- ✅ **`POST /api/v1/partos`**: campo opcional `crias[]` (mesmo tamanho que `numero_crias`) → `PartoService.CreateWithCrias` — parto, efeitos na matriz (categoria/status/gestação) e lactação + todas as crias na **mesma** transação.
- ✅ **Frontend `novo/page.tsx`**: `createParto` com `crias` no payload; tipo `PartoCriaInput` em `services/partos.ts`.
- ✅ **`DELETE /api/v1/partos/:id`**: numa transação, remove animais ligados a crias vivas (regra: não COMPRADO; `mae_id` nil ou matriz do parto) e em seguida o parto; `CriaRepository.GetByPartoIDTx`, `AnimalRepository.DeleteTx`, `CriaService.DeleteAnimaisGeradosPorCriasDoPartoTx`.

### **2026-05-06 - Gestão Pecuária: UX «animais na cria» e cache**

- ✅ **Copy**: campo **Número de animais na cria** (`PartoFormFields`); listagem coluna **Animais na cria** (`PartoTable`); textos de alerta em `PartoEditCriasPanel`.
- ✅ **TanStack Query**: ao excluir parto, invalidar `animais` (fazenda + global), `crias`, `fazendas/:id/animais` além de `partos` — evita animal removido no backend ainda aparecer na UI.
- ✅ **Ident automática macho**: prefixo provisório **FILHO-** (fêmea mantém **FILHA-**) em `CriaService.resolveIdentificacaoCriaVivaTx`.

### **2026-05-06 - Gestão Pecuária: edição de partos**

- ✅ **Backend Partos**: adicionados `GET /api/v1/partos/:id` e `PUT /api/v1/partos/:id` nas rotas, com atualização completa do registro no repositório (`animal_id`, `gestacao_id`, `data`, `tipo`, `numero_crias`, `complicacoes`, `observacoes`, `fazenda_id`) e tratamento de não encontrado.
- ✅ **Validações de domínio no update**: `PartoService.Update` passou a validar obrigatórios, número mínimo de crias, compatibilidade animal↔fazenda, sexo fêmea e tipo de parto válido.
- ✅ **Frontend Gestão/Partos**: listagem agora exibe ação **Editar** e nova página `/gestao/partos/[id]/editar` com formulário de manutenção (animal, data/hora, número de crias, tipo, gestação opcional, complicações e observações), com invalidação de cache TanStack Query após salvar.

### **2026-05-06 - Gestão Pecuária: CRUD completo de partos**

- ✅ **`DELETE /api/v1/partos/:id`**: verificação de acesso à fazenda; `PartoService.Delete` transacional (remoção de animais gerados + `DeleteTx` do parto) — detalhe no histórico «transações parto + crias + animal».
- ✅ **Cadastro alinhado à edição**: `/gestao/partos/novo` usa os mesmos campos opcionais (`tipo`, `gestacao_id`, `complicações`, `observações`) via componente compartilhado `PartoFormFields`.
- ✅ **Listagem**: botão **Excluir** com confirmação (Dialog), seguindo o padrão de Cios; serviço `remove(id)` no frontend.

### **2026-05-07 - Gestão Pecuária: CRUD coberturas e formularios cios**

- ✅ **Backend coberturas**: `PUT|DELETE /api/v1/coberturas/:id`; exclusão com checagem de vínculos (`gestacoes` / `diagnosticos_gestacao`) → `ErrCoberturaTemVinculos` (409); `Update` com validação de tipo e matriz fêmea alinhada ao create.
- ✅ **Frontend coberturas**: `update`/`remove` em `services/coberturas.ts`; `CoberturaFormFields` + páginas novo/editar; `CoberturaTable` com Editar/Excluir.
- ✅ **Frontend cios**: `CioFormFields` compartilhado (`DateTimePickerPtBr`); edição com validação de fazenda ativa.
- ✅ **Documentação**: `docs/business/coberturas.md`, `docs/business/cios.md` e índice atualizado.

### **2026-05-07 - Animais: busca inteligente na home**

- ✅ **Backend animais**: novo endpoint `GET /api/v1/animais/:id/contexto` (dados do animal + `resumo_producao`) e ajuste de segurança em `GET /api/v1/animais/search/by-identificacao` para filtrar resultados apenas das fazendas vinculadas ao usuário logado.
- ✅ **Frontend home**: componente `AnimalSearchHome` adicionado à página inicial (`/`) com pesquisa por identificação, seleção de resultado e exibição contextual (saúde, status reprodutivo, nascimento e indicadores de produção).
- ✅ **Regra de UX da busca**: lista de resultados da pesquisa inteligente não exibe nome/ID da fazenda, pois o usuário já opera no contexto da fazenda ativa.
- ✅ **Serviços frontend**: `services/animais.ts` expandido com `searchByIdentificacao` e `getContexto`.
- ✅ **Catálogo de negócio**: novo módulo `docs/business/animais.md` com regras `BR-ANIMAIS-001` e `BR-ANIMAIS-002`; índice atualizado em `docs/business/README.md`.

### **2026-05-08 - Animais: UX da toolbar de filtros na listagem**

- ✅ **`AnimaisListToolbar`**: busca principal sempre visível; filtros avançados em **`Popover`** (`md+`) ou **`Dialog`** (viewport estreita); hook **`useMediaQuery`** (`frontend/src/hooks/useMediaQuery.ts`); chips «Filtros aplicados» + limpar avançados / limpar tudo.
- ✅ **Total após filtro só no mobile**: props **`resultCount`** e **`listLoading`** nas páginas `/animais` e `/fazendas/[id]/animais`; componente **`FilterResultSummary`** apenas no rodapé do **Dialog** — desktop não duplica o total no Popover.
- ✅ **Popover desktop**: `max-h` + scroll na zona do formulário + `collisionPadding` para evitar conteúdo cortado.
- ✅ **Mobile**: rótulo da busca **`max-sm:sr-only`** (acessível a leitores de ecrã), placeholder «Identificação ou brinco…» na vista.

### **2026-05-30 - Assistente Live: function calling saúde e alertas**

- ✅ **Tools Live**: `consultar_saude`, `registrar_saude` (`AnimalSaudeService` — BR-SAUDE-002); `listar_alertas`, `resolver_alerta` (`AlertaService` + `perfil` — BR-ALERTA-007).
- ✅ **Wiring**: `NewAssistenteLiveService` recebe `animalSaudeSvc` e `alertaSvc`; `ExecuteFunction` com parâmetro `perfil`.
- ✅ **Testes**: `assistente_live_saude_alertas_test.go` (validação domínio, listagem por severidade, RBAC resolver alerta).
- ✅ **Escopo**: GERENTE+ no assistente; `FUNCIONARIO` permanece bloqueado (API + FAB).

### **2026-05-08 - Assistente: bloqueio de FUNCIONARIO + base para liberação por capacidades**

- ✅ **Frontend RBAC do assistente**: `showAssistenteForPerfil` passa a bloquear explicitamente `FUNCIONARIO` (FAB/modal não renderizam); criada base `isAssistenteEnabledForPerfil` + `PERFIL_ASSISTENTE_CAPABILITIES` para liberar funcionalidades específicas futuramente.
- ✅ **Backend RBAC do assistente**: bloqueio explícito de `/api/v1/assistente/*` para `FUNCIONARIO` em `requestAllowedForFuncionario` (`funcionarioAssistentePath`), com gancho inicial para evolução capability-based.
- ✅ **UX de erro**: mensagem de falha de reconexão no Live ajustada para texto neutro/orientativo (sem afirmar internet como causa única).
- ✅ **Catálogo de negócio**: nova regra BR-ACESSO-006 em `docs/business/acessos-perfil.md` formaliza bloqueio atual e evolução incremental por capacidades.

### **2026-05-12 - Header: identidade do utilizador e fazenda ativa**

- ✅ **`UserIdentitySummary`** (`frontend/src/components/layout/UserIdentitySummary.tsx`): avatar de iniciais, nome, e-mail secundário quando há nome, badge RBAC (`perfilLabels`); `userIdentityAriaLabel` e `userIdentityInitials` para reutilização no header mobile.
- ✅ **`FazendaSelector`**: com **uma** fazenda, cartão só leitura «Fazenda ativa» + nome; com **várias**, `Select` com `sr-only`, `aria-label` no trigger e altura confortável; estado «A carregar fazendas…»; prop `density="drawer"`; não renderiza para **ADMIN**/**DEVELOPER**; `useMinhasFazendas` com `enabled` coerente.
- ✅ **`Header.tsx`**: `useFazendaAtiva`; desktop com resumo compact + fazenda no `aria-label`; drawer com secção **Conta e fazenda** no topo (antes de tema/busca/links); avatar de iniciais na barra mobile entre busca e menu.

### **2026-05-07 - Animais: listagem global e fazenda ativa**

- ✅ **`/animais`**: `listPaginated` com `fazenda_id` implícito da fazenda ativa (`useFazendaAtiva`); removido filtro explícito de fazenda na `AnimaisListToolbar`; query habilitada só com fazenda pronta; mensagens distintas para “nenhuma fazenda vinculada” vs “escolher fazenda no header” quando há várias.
- ✅ **`/fazendas/[id]/animais`**: escopo continua sendo o `id` da rota; toolbar sem prop de filtro de fazenda.

### **2026-02-03 - Assistente: contexto fazendas do usuário e fallback uma fazenda**

- ✅ **Interpretar**: Fazendas vinculadas ao usuário (GetByUsuarioID) em vez de GetAll; prompt com regra para cadastrar_animal, listar_animais_fazenda e consultar_animais_fazenda: quando o usuário tem apenas UMA fazenda e não menciona fazenda, incluir fazenda_id no payload
- ✅ **Executar**: userID passado a executarCadastrarAnimal, executarConsultarAnimaisFazenda, executarListarAnimaisFazenda
- ✅ **resolveFazendaForUser**: Nova função (keyID/keyNome) para resolver fazenda validando que pertence ao usuário; fallback quando o usuário tem exatamente uma fazenda; validação de acesso (erro "fazenda não encontrada ou você não tem acesso a ela")
- ✅ Cadastrar animal sem informar fazenda passa a funcionar para usuário com uma fazenda vinculada

### **2026-01-31 - Sprint 2 Concluída**

- ✅ **CRUD de Animais**: Model, repository, service, handler, migração + Frontend completo
- ✅ **CRUD de Produção de Leite**: Model, repository, service, handler, migração + Frontend completo
- ✅ **Registro de Usuários**: Endpoint `POST /api/auth/register` + Página de registro no frontend
- ✅ **Prometheus Metrics**: Middleware de métricas + endpoint `/metrics`
- ✅ **Testes Unitários Backend**: Testes table-driven para models e services
- ✅ **Testes E2E Frontend**: Configuração Playwright + testes de autenticação e navegação

### **2026-05-30 — AnimalSelect filtro por ciclo (BR-CICLO-015)**

- ✅ **Backend**: `GET .../animais/para-cobertura|para-toque|para-parto|para-abertura-lactacao`; RBAC FUNCIONARIO estendido.
- ✅ **Frontend**: `AnimalSelect` + `useAnimaisCicloContext`; forms cobertura/toque/parto/lactação/secagem; merge em edição.

### **2026-05-19 — Fase 2 ciclo integrado + refinamentos**

- ✅ **Entregas BR-CICLO-005 a 009**: secagem↔lactação, ficha/timeline (`AnimalFichaCiclo`), resumo pecuário na home, produção↔lactação, RBAC FUNCIONARIO toques/produção; catálogo `docs/business/` por módulo.
- ✅ **Toque positivo**: `resolveCoberturaIDForPositivo` + UI com cobertura obrigatória; propaga `PRENHE`, gestação confirmada, busca, ficha e dashboard.
- ✅ **Produção**: `ProducaoForm` lista só `em-lactacao`; validação server-side mantida.

### **2026-05-20 — Fase 2 fechada: qualidade e visibilidade**

- ✅ **BR-CICLO-002** e auditoria migrations 23–24 (`created_by` ciclo/leite/animais).
- ✅ **Conformidade**: `ConformidadeHomePanel` + `GET .../auditoria/conformidade`; BR-AUDIT-003/006 em `docs/business/auditoria.md`.
- ✅ **Registado por**: timeline e cadastro na ficha; repositórios `GetByAnimalID` com `created_by`.
- ✅ **Checklist**: [docs/tests/regressao-ciclo-fase2.md](../docs/tests/regressao-ciclo-fase2.md).
- ⏸️ **Recuperação de senha**: adiada — SMTP não definido (`deploy-notes.md`).

### **2026-05-21 — Integrações M2M + OpenAPI**

- ✅ **API externa**: migration 25; `IntegrationAuthMiddleware`; 6 rotas M2M; lote de toques com sucesso parcial; idempotência; rate limit; admin + UI.
- ✅ **Documentação**: `docs/business/integracoes.md`; `docs/integracoes/README.md`; OpenAPI embed + `docs/openapi/`; Swagger UI pública; Postman/README.
- 📋 **Pendente**: teste ponta-a-ponta em staging com integrador real; rotação de chaves expostas em testes manuais.

### **2026-05-30 — Exclusão em listagens (erro no diálogo + toast)**

- ✅ **`DeleteRecordDialog`**: `error` + `conformidadeCode` opcional; `FormValidationAlert` «Não foi possível excluir».
- ✅ **Padrão nas `*Table`**: estado `deleteError`, `onError` com `getApiErrorMessage` + `toast.error`, `onSuccess` com `toast.success`, limpar erro ao fechar/confirmar; diálogo não fecha em erro de API.
- ✅ **Consumidores**: coberturas, cios, partos, animais, produção, fazendas, saúde (`AnimalSaudeList`), alertas.
- ✅ **Cobertura 409**: mensagem de vínculo gestação/toque visível (BR-COBERTURAS-004).

### **2026-05-24 — Coberturas: filtros na listagem**

- ✅ **`CoberturasListToolbar`**: filtros por animal (fêmea), tipo (IA/IATF/Monta natural/TE) e intervalo de datas; botão «Limpar filtros»; grid responsivo alinhado a `/producao`.
- ✅ **`lib/coberturas-filter.ts`**: `filterCoberturas`, `hasActiveCoberturaFilters` — filtragem client-side sobre `listByFazenda` (sem alteração na API).
- ✅ **`/gestao/coberturas`**: contagem `(N de M)` no título quando filtrado; `CoberturaTable` com mensagem específica para zero resultados com filtros ativos.

### **2026-05-22 — Listagens mobile (card clicável + menu ⋮)**

- ✅ **Componentes**: `frontend/src/components/layout/list/` — `MobileListCard`, `ListRowActionsMenu`, `ResponsiveListContainer`, `DeleteRecordDialog`.
- ✅ **Tabelas migradas**: animais, gestão pecuária (partos, cios, coberturas, gestações, secagens, toques, lactações), produção, fazendas, admin (usuários, integrações).
- ✅ **UX**: mobile sem scroll horizontal para coluna Ações; exclusão só via ⋮ + dialog; perfis (`canManage`, admin) respeitados nos menus.
- ✅ **Correção**: `MobileListCard` — `title`/`subtitle` em `<div>` para evitar erro de hidratação (`<p>` não pode conter `Badge`/`<div>`).
- ✅ **Documentação**: `systemPatterns.md` v2.22; `activeContext.md`.

---

**Última atualização**: 2026-06-01 (t_ds_007 — scroll infinito mobile nas listagens principais)
**Status**: Produção Render+Vercel ✅ | **Fase 2 concluída** | **Fase 3** saúde + alertas + Web Push + timeline + `lactacao_id` | **M2M** BR-INTEG-001–011 | **UX exclusão** padronizada nas tabelas | Checklist staging pendente | Senha aguarda SMTP
**Próxima revisão**: após validação integrações em staging + execução checklist Fase 2
