# 🛠️ Technical Context - CeialMilk

## Stack Tecnológica

### Backend

- **Linguagem**: Go 1.24+
- **Framework Web**: Gin (HTTP router e middleware)
- **Banco de Dados**: PostgreSQL 15
- **Acesso a Dados**: pgx/v5 (driver PostgreSQL nativo com type safety)
- **Migrações**: golang-migrate
- **Autenticação**: JWT (golang-jwt/jwt/v5) com algoritmo RS256
- **Segurança**: Bcrypt (golang.org/x/crypto/bcrypt)
- **Logging**: slog (nativo Go) para logs estruturados JSON
- **Observabilidade**: Sentry (getsentry/sentry-go) para captura de erros
- **Container**: Docker (multi-stage build com imagem Alpine final)
- **RBAC (perfis em `usuarios.perfil`)**: inclui `PROPRIETARIO` (titular da exploração); `POST /api/v1/me/fazendas` cria fazenda + vínculo **só** para **PROPRIETARIO** — ver `docs/business/acessos-perfil.md` (BR-ACESSO-011 a 013).

### Frontend

- **Framework**: Next.js 16.2.2 (App Router, Turbopack como bundler padrão)
- **React**: 19.2.3 (compatível com Next.js 16)
- **Linguagem**: TypeScript 5.7.2
- **Estilização**: Tailwind CSS 3.4.17
- **Tailwind `content`**: `frontend/tailwind.config.ts` inclui `src/app`, `src/components`, `src/pages` e **`src/contexts`** — ficheiros em `contexts/` com `className` (ex.: `AnimalSearchDialogContext`) devem estar no scan; caso contrário utilitários arbitrários não entram no CSS e `tailwind-merge` pode deixar o DOM sem `width`/`max-height` efetivos (diálogo “invisível” por cima do overlay).
- **Componentes**: Shadcn/UI (compatível com React 19); `@radix-ui/react-tabs` para tabs acessíveis (`components/ui/tabs.tsx`)
- **Gerenciamento de Estado**: TanStack Query 5.x
- **Cliente HTTP**: Axios 1.7.9
- **Toast (feedback)**: Sonner (`sonner`) — `hooks/use-toast.ts`, `components/ui/sonner.tsx`, `<Toaster />` em `Providers` (canto superior direito)
- **Datas**: `date-fns` v4 — tipos embutidos via campo `exports` do pacote; imports como `date-fns` e `date-fns/locale`
- **TypeScript (resolução de módulos)**: `tsconfig.json` usa `"moduleResolution": "bundler"` — **obrigatório** para resolver `exports` de `date-fns` v4, `sonner` v2 e `@radix-ui/*`. **Não** instalar `@types/sonner` (pacote inexistente no npm; sonner traz `.d.ts` próprio). Se `tsc` falhar com "Cannot find module", confirmar `npm ci` e que `moduleResolution` não foi alterado para `"node"`.
- **Logging**: logs do runtime do Next.js e `console` no app (sem logger estruturado dedicado no frontend)

### Infraestrutura

- **Backend Deploy**: Render (Docker)
- **Frontend Deploy**: Vercel (otimizado para Next.js)
- **Banco de Dados**: PostgreSQL (Render Managed ou Neon.tech)
- **Observabilidade**: Sentry (erros), BetterStack (logs), Prometheus (métricas)

## Configurações de Produção

### Backend (Render)

- **Imagem Base**: `golang:1.24-alpine` (build) → `alpine:latest` (runtime)
- **Porta**: 8080 (configurável via `PORT` env var)
- **Health Check**: `/health` endpoint
- **Variáveis de Ambiente**:
  - `DATABASE_URL`: URL completa de conexão PostgreSQL
  - `JWT_PRIVATE_KEY`: Chave privada para assinar tokens (RS256)
  - `JWT_PUBLIC_KEY`: Chave pública para verificar tokens
  - `PORT`: Porta do servidor (padrão: 8080)
  - `SENTRY_DSN`: DSN do Sentry para captura de erros (opcional)
  - `LOG_LEVEL`: Nível de log (DEBUG, INFO, WARN, ERROR) - padrão: INFO
  - `ENV`: Ambiente (development, production) - padrão: development
  - `INTEGRATION_RATE_LIMIT_PER_HOUR`: Rate limit por cliente M2M (default: 300) — rotas `/api/v1/integracoes/*`
  - **Scopes M2M** (por cliente): `animais:read`, `toques:write`, `coberturas:read`, `coberturas:write`, `saude:read`, `saude:write`, `alertas:read` — ver `docs/business/integracoes.md` (BR-INTEG-009–011)
  - `AUTH_LOGIN_RATE_LIMIT` (default: 10), `AUTH_LOGIN_RATE_WINDOW_MINUTES` (default: 15): rate limit por IP em `POST /api/auth/login`
  - `AUTH_REGISTER_RATE_LIMIT` (default: 5): rate limit por IP/hora em `POST /api/auth/register`
  - `AUTH_REFRESH_RATE_LIMIT` (default: 30): rate limit por IP/hora em `POST /api/auth/refresh`
  - **Web Push (alertas)**: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (ex.: `mailto:suporte@ceialmilk.com`) — ver `deploy-notes.md`; lib `github.com/SherClockHolmes/webpush-go`
  - **Docs OpenAPI integrações** (públicas): `GET /api/v1/integracoes/openapi.yaml`, `GET /api/v1/integracoes/docs` (Swagger UI); spec embed em `backend/internal/openapi/`
  - **Dev Studio e Assistente** (opcional): `GEMINI_API_KEY`; `GEMINI_MODEL` (default `gemini-2.0-flash`) para Dev Studio; `GEMINI_MODEL_ASSISTENTE` (opcional, se vazio usa `GEMINI_MODEL`; recomendado `gemini-2.5-flash-lite` para custo menor). GitHub: `GITHUB_TOKEN`, `GITHUB_REPO`, `GITHUB_CONTEXT_BRANCH` (default `main`). Ver `docs/dev-studio/SETUP.md`.

### Frontend (Vercel)

- **Framework**: Next.js (detectado automaticamente)
- **Build Command**: `npm run build` (automático)
- **Variáveis de Ambiente**:
  - `NEXT_PUBLIC_API_URL`: URL do backend no Render

### Banco de Dados

- **Tipo**: PostgreSQL 15
- **SSL**: Obrigatório (`sslmode=require`)
- **Connection Pooling**: Gerenciado pelo driver pgx

## Dependências Principais (Backend Go)

### go.mod (exemplo)

```go
module github.com/ceialmilk/api

go 1.24.0

require (
    github.com/getsentry/sentry-go v0.41.0
    github.com/gin-gonic/gin v1.10.0
    github.com/golang-jwt/jwt/v5 v5.2.0
    github.com/golang-migrate/migrate/v4 v4.19.1
    github.com/google/uuid v1.6.0
    github.com/google/generative-ai-go v0.20.1
    github.com/gorilla/websocket v1.5.3
    github.com/jackc/pgx/v5 v5.5.4
    github.com/SherClockHolmes/webpush-go v1.3.0
    golang.org/x/crypto v0.45.0
)
```

## Estratégia de Deploy

### Backend (Go)

1. **Build**: `go build -o bin/api ./cmd/api` (multi-stage Docker)
2. **Migrações**: `golang-migrate` executa antes do servidor iniciar (inclui **19**: RLS em tabelas `public` de domínio, sem políticas PostgREST)
3. **Startup**: `./bin/api` (binário único, startup instantâneo)

### Frontend (Next.js)

1. **Build**: Vercel detecta Next.js 16 e faz build automático com Turbopack
2. **Deploy**: Distribuição global via CDN da Vercel
3. **SSR/SSG**: Next.js gerencia renderização server-side
4. **Bundler**: Turbopack é o padrão no Next.js 16 (mais rápido que Webpack)

## Ambiente de Desenvolvimento (Dev Container)

O projeto inclui um **Dev Container** (`.devcontainer/`) alinhado à stack Go + Next.js para desenvolvimento local consistente.

### Estrutura

```
.devcontainer/
├── devcontainer.json   # Configuração (extensões, features, comandos, portas)
└── Dockerfile          # Opcional (referência); uso padrão: image + features
```

### Stack do Container

- **Base**: `mcr.microsoft.com/devcontainers/base:ubuntu-22.04`
- **Features**: `go` (1.24) e `node` (LTS) via Dev Container features
- **Ferramentas**: `postgresql-client` (instalado no postCreateCommand), git, curl

### Uso

1. Abrir o projeto no VS Code/Cursor.
2. **Reopen in Container** (ou "Dev Containers: Reopen in Container").
3. O `docker-compose` sobe o serviço `ceialmilk-dev` e o `db` (PostgreSQL).

### Portas encaminhadas

| Porta | Serviço       |
| ----- | ------------- |
| 8080  | Backend Go    |
| 3000  | Next.js (dev) |
| 5432  | PostgreSQL    |

### Comandos no container

- **Backend**: `cd backend && go run ./cmd/api` (porta 8080).
- **Frontend**: `cd frontend && npm run dev` ou `npm run dev --prefix frontend` (porta 3000); testes unitários lib: `npm run test:unit` (vitest).
- **Post-create** (automático): `apt-get install postgresql-client`, `go mod download -C backend` e `npm install --prefix frontend`.

### Variáveis de ambiente (ceialmilk-dev)

Definidas no `docker-compose` para o serviço `ceialmilk-dev`:

- `DATABASE_URL`: `postgres://ceialmilk:password@db:5432/ceialmilk?sslmode=disable`
- `PORT`: `8080`

O frontend usa `NEXT_PUBLIC_API_URL` (ex.: `http://localhost:8080`); configurar localmente se necessário.

## Estrutura de pastas atual

- **Backend**: `backend/cmd/api`, `backend/internal/{handlers,service,repository,models,response,auth,middleware,config,observability}`, `backend/migrations`.
- **Frontend**: `frontend/src/app`, `frontend/src/components/{fazendas,agricultura,dev-studio,layout,ui}`, `frontend/src/services`, `frontend/src/contexts`, `frontend/src/lib`.
- **Referência de CRUD**: Fazenda (handler → service → repository → model). Ver `memory-bank/systemPatterns.md` para padrões e estrutura detalhada.
- **Dev Studio**: `GitHubService.GetFileContent(ctx, branch, path)` obtém conteúdo de arquivos na branch de produção (GitHub Contents API). Usado para contexto da IA quando `GITHUB_*` configurados.

## Testes de API (TestSprite / MCP)

- **Pasta**: `testsprite_tests/` — plano `testsprite_backend_test_plan.json`, scripts `TC001_*.py` … `TC009_*.py`, `testsprite_api_helpers.py`, relatórios em `tmp/raw_report.md` e `testsprite-mcp-test-report.md`.
- **Config MCP**: `.testsprite/config.json` (`type: backend`, `localEndpoint` típico `http://localhost:8080/`).
- **Variáveis opcionais** (local e scripts): `TESTSPRITE_BASE_URL`, `TESTSPRITE_TIMEOUT`, `TESTSPRITE_ADMIN_EMAIL`, `TESTSPRITE_ADMIN_PASSWORD` — ver `.env.example` e `README_TESTSPRITE.md`.
- **Execução local**: `cd testsprite_tests && for f in TC*.py; do python3 "$f"; done` (requer API na porta configurada + Postgres com migrações, incl. seed admin `admin@ceialmilk.com` / `password`).
- **MCP Cursor**: ferramenta TestSprite `testsprite_generate_code_and_execute`; o CLI pode sobrescrever `TC*.py` — após a run usar `scripts/testsprite-restore-tc007.sh` ou excluir `TC007` de `testIds` se se quiser evitar regressão gerada.
- **Frontend TestSprite**: `testsprite_frontend_test_plan.json` mantido vazio (`[]`); âmbito TestSprite neste repo é a API Go.

## Módulo Folgas (escala 5x1)

- **Migração**: `backend/migrations/16_add_folgas_escala.up.sql` — `folgas_escala_config`, `escala_folgas`, `folgas_justificativas`, `folgas_excecoes_dia`, `folgas_alteracoes`.
- **Backend**: `folgas_repository.go`, `folgas_service.go`, `folgas_handler.go`; `auth.RequireGestaoFolgas()`; `ValidateFazendaAccessOrGestao` em `handlers/access_helper.go`; escala com `excecao_motivo_dia` (JOIN `folgas_excecoes_dia`).
- **Frontend**: `frontend/src/app/folgas/page.tsx`, `frontend/src/services/folgas.ts`, `frontend/src/components/folgas/*` (`FolgasCalendarioDia`, `FolgasDiaDetalhesDialog`, `FolgasHistoricoTable`, utilitários); `useMinhasFazendas` para ADMIN/DEVELOPER/GERENTE na página (não usar lista global de fazendas); filtro opcional por funcionário para gestão; **`FazendaContext`** com regras 0 / 1 / N fazendas. **Gerar mês automático**: envia `inicio`/`fim` do **mês exibido** no estado `month` da página (primeiro e último dia desse mês), não o mês calendário do sistema.

## Restrições de leite (laboratório / descarte)

- **Migração**: `backend/migrations/21_usuarios_fazendas_papel.up.sql` — coluna `papel` (`TITULAR`|`OPERACIONAL`) em `usuarios_fazendas`; backfill heurístico para `PROPRIETARIO`.
- **Backend**: `restricao_leite_repository.go`, `restricao_leite_service.go`, `restricao_leite_handler.go`; rotas `GET/POST /api/v1/fazendas/:id/restricoes-leite`, `GET .../ativas`, `PATCH .../:restricaoId/liberar`; `GET /api/v1/fazendas/:id/animais/em-lactacao` em `animal_handler.go` + `AnimalRepository.ListEmLactacaoByFazendaID`; validação de lactação ativa com `LactacaoRepository.ExistsAtivaNaFazenda`; contexto animal enriquecido em `animal_handler.go`.
- **Frontend**: `frontend/src/services/restricoesLeite.ts`, `frontend/src/services/animais.ts` (`listEmLactacaoByFazenda`), `frontend/src/components/leite/RestricoesLeiteHomePanel.tsx`, integração na home (`app/page.tsx`).
- **Negócio**: `docs/business/leite-restricoes.md` (BR-LEITE-005).

## Ciclo integrado do rebanho (Fase 2 — concluída)

- **Migrações**: `22_close_lactacao_on_seca_animals`; `23_add_auditoria_usuario_ciclo`; `24_add_auditoria_animais`; **`26_add_classificacao_operacional_toques`** (`diagnosticos_gestacao.classificacao_operacional`).
- **Backend**: `animal_ciclo_service.go` (timeline com `registrado_por`, classificação operacional + OBS); `conformidade_service.go` + `GET /api/v1/fazendas/:id/auditoria/conformidade`; `secagem_service.go`, `lactacao_service.go`, `producao_service.go`, `diagnostico_gestacao_service.go`, `diagnostico_gestacao_normalize.go`, `resumo_pecuario_service.go`; `IntegracaoToqueLoteService` reutilizado por `POST /api/v1/toques/lote` (JWT); filtros `data_de`/`data_ate` em `GET /api/v1/toques`; `usuario_repository.GetNamesByIDs`; repositórios de ciclo com `created_by` em `GetByAnimalID`.
- **Frontend**: `AnimalFichaCiclo.tsx`, `PecuarioResumoHomePanel.tsx`, `ConformidadeHomePanel.tsx`, `services/auditoria.ts`, `showConformidadePanelForPerfil` em `appAccess.ts`, `ProducaoForm`; toques: `ToqueFormFields`, `ToquesListToolbar`, `ToqueTable`, `ToqueLoteEditor`, `lib/toquesUtils.ts` (`/gestao/toques*).
- **Negócio**: `docs/business/ciclo-rebanho.md`, `auditoria.md` (BR-AUDIT-003/006), `toques.md` (BR-TOQUES-006), `integracoes.md` (BR-INTEG-007).
- **Regressão**: [docs/tests/regressao-ciclo-fase2.md](../docs/tests/regressao-ciclo-fase2.md).

## Módulo Agrícola (Contexto Técnico)

### Backend (Go)

- **Migração**: `backend/migrations/15_add_modulo_agricola.up.sql` e `.down.sql`.
- **Domínio**:
  - `fornecedores`
  - `areas`
  - `analises_solo`
  - `safras_culturas`
  - `custos_agricolas`
  - `producoes_agricolas`
  - `receitas_agricolas`
- **Camadas implementadas**:
  - **Models**: `backend/internal/models/*` (entidades agrícolas)
  - **Repositories**: `backend/internal/repository/*_repository.go`
  - **Services**: `backend/internal/service/*_service.go`
  - **Handlers**: `backend/internal/handlers/*_handler.go`
- **Registro de rotas**: centralizado em `backend/cmd/api/main.go` no grupo `/api/v1`.

### Rotas principais do módulo

- **Fornecedores por fazenda**:
  - `GET /api/v1/fazendas/:id/fornecedores`
  - `POST /api/v1/fazendas/:id/fornecedores`
  - `GET|PUT|DELETE /api/v1/fornecedores/:id`
- **Áreas por fazenda**:
  - `GET /api/v1/fazendas/:id/areas`
  - `POST /api/v1/fazendas/:id/areas`
  - `GET|PUT|DELETE /api/v1/areas/:id`
- **Análises de solo**:
  - `GET /api/v1/areas/:id/analises-solo`
  - `POST /api/v1/areas/:id/analises-solo`
- **Safras/Culturas**:
  - `GET /api/v1/areas/:id/safras/:ano`
  - `POST|GET|PUT|DELETE /api/v1/safras-culturas`
- **Custos / Produções / Receitas por safra-cultura**:
  - `GET|POST /api/v1/safras-culturas/:id/custos`
  - `GET|POST /api/v1/safras-culturas/:id/producoes`
  - `GET|POST /api/v1/safras-culturas/:id/receitas`
- **Resultados e comparativos**:
  - `GET /api/v1/areas/:id/resultado/:ano`
  - `GET /api/v1/fazendas/:id/resultado-agricola/:ano`
  - `GET /api/v1/fazendas/:id/fornecedores/comparativo/:ano`

### Frontend (Next.js)

- **Páginas App Router**: `frontend/src/app/agricultura/**`
  - Dashboard do módulo
  - CRUD de fornecedores
  - CRUD de áreas
  - Análises de solo por área
  - Safras/culturas por área/ano
  - Detalhe de safra/cultura com custos, produções e receitas
  - Resultado agrícola por fazenda/ano
  - Comparativo de fornecedores
- **Componentes dedicados**: `frontend/src/components/agricultura/**`
- **Service dedicado**: `frontend/src/services/agricultura.ts`
- **Navegação**: acesso via item "Agricultura" no Header (desktop e mobile).

## Migrações recentes (pecuário / Fase 3)

| # | Ficheiro | Conteúdo |
|---|----------|----------|
| 30 | `30_add_animal_saude` | Tabela `animal_saude` |
| 31–32 | `31_add_alertas`, `32_alertas_geracao_automatica` | Alertas + geração diária |
| 33 | `33_push_subscriptions_fazenda_ativa` | Web Push + `fazenda_ativa_id` |
| 34 | `34_add_lactacao_id_producao_leite` | FK `lactacao_id` em `producao_leite` (nullable; legado preservado) |

## Vantagens da Nova Stack

### Performance

- **Memória**: Go consome ~30MB vs ~300MB do Java
- **Startup**: < 1 segundo vs 15-30 segundos do Java
- **Binário**: Único arquivo executável vs JAR + JVM

### Desenvolvimento

- **Simplicidade**: Código Go mais direto que Spring WebFlux
- **Type Safety**: TypeScript no frontend garante tipos seguros
- **Hot Reload**: Desenvolvimento rápido com ferramentas modernas

### Deploy

- **Simplicidade**: Binário único, sem necessidade de JVM
- **Tamanho**: Imagem Docker final ~20MB vs ~200MB do Java
- **Conectividade**: Driver pgx mais robusto que R2DBC em ambientes cloud

---

**Última atualização**: 2026-06-09 (vitest + BRF-002 validação temporal saúde)
**Stack**: Go + Next.js 16 — Fase 2 concluída; Fase 3 saúde/alertas/Web Push; timeline paginada; M2M BR-INTEG-001–011; Folgas 5x1; Dev Studio; TestSprite (`testsprite_tests/`)
