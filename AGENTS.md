# CeialMilk — Instruções para Agentes

Instruções **portáveis** (Cursor, CLI e outras ferramentas de IA). Regras Cursor-specific com escopo condicional ficam em [`.cursor/rules/`](.cursor/rules/); workflows repetíveis, em [`.cursor/skills/`](.cursor/skills/) e [`.cursor/commands/`](.cursor/commands/).

## Visão Geral

CeialMilk é gestão para **fazendas leiteiras**, centrado no **ciclo de vida de cada animal** (reprodução, lactação, produção, restrições, equipe). Stack **Go + Next.js**; requisitos versionados em `docs/business/` (IDs `BR-*`).

Consulte [`memory-bank/projectbrief.md`](memory-bank/projectbrief.md) e [`docs/business/ciclo-rebanho.md`](docs/business/ciclo-rebanho.md).

## Documentação — o que ler, por tipo de tarefa

Leitura **dirigida**, não exaustiva: abra o que a tarefa exige. Prefira `Grep` por seção a ler arquivos inteiros.

| Sua tarefa | Leia |
|------------|------|
| Qualquer uma (30s de orientação) | `memory-bank/activeContext.md` — é curto de propósito |
| Endpoint, service ou repository novo | `memory-bank/patterns/api.md` + `patterns/security.md` + `backend/AGENTS.md` (índice: `systemPatterns.md`) |
| Página, formulário ou listagem | `frontend/AGENTS.md` (checklist UI) — a regra `frontend-ui-patterns.mdc` já carrega ao editar `frontend/src/` |
| Regra de negócio / comportamento de produto | `docs/business/<modulo>.md` + `docs/business/README.md` |
| Requisito novo ainda não especificado | `docs/briefings/README.md` (gates G1–G3, `BR-*` + `BRF-NNN`) |
| Dependência, versão ou setup local | `memory-bank/techContext.md` |
| Deploy, env vars, migração | `memory-bank/deploy-notes.md` (índice) → `deploy/*` + `docs/ops/runbook.md` |
| Por que o produto existe / prioridades | `memory-bank/projectbrief.md`, `memory-bank/productContext.md` |
| Completude e marcos | `memory-bank/progress.md` (fonte única de métricas) |
| Mapa do harness multi-tool | `docs/harness/README.md` |

`systemPatterns.md` é só o **índice** — abra o módulo em `memory-bank/patterns/` indicado na tabela (não leia a pasta inteira).

### Outros

- **Harness multi-tool**: [`docs/harness/README.md`](docs/harness/README.md) — Cursor / Claude Code / Copilot / AGENTS.md
- **Regras de domínio**: [`docs/business/README.md`](docs/business/README.md) — atualizar no mesmo PR quando mudar comportamento de produto; use `@docs/business/...` no chat
- **Índice de IDs**: [`docs/business/INDEX.md`](docs/business/INDEX.md) (gerar com `node scripts/generate-br-index.mjs`)
- **Fluxo de briefings (analista funcional → implementador)**: [`docs/briefings/README.md`](docs/briefings/README.md) — papéis, gates de aprovação G1–G3 e template; requisito novo nasce como `BR-*` `planejado` + briefing `BRF-NNN`; validador `node scripts/validate-br-refs.mjs` (CI)
- **API M2M**: [`docs/integracoes/README.md`](docs/integracoes/README.md) · [`docs/business/integracoes.md`](docs/business/integracoes.md) · OpenAPI em `docs/openapi/integracoes-v1.openapi.yaml`
- **API JWT (Postman)**: [`docs/postman/`](docs/postman/)
- **Baixa do rebanho**: [`docs/business/baixa-rebanho.md`](docs/business/baixa-rebanho.md)
- **Operações e segurança**: [`docs/ops/README.md`](docs/ops/README.md) — runbook (rollback, dirty migration, incidentes), checklist de segurança pré-deploy, estratégia de testes e guia de code review (G2)

## Comandos Essenciais

Detalhes em [`README.md`](README.md) e [`memory-bank/techContext.md`](memory-bank/techContext.md):

```bash
# PostgreSQL
docker-compose up -d db

# Backend (porta 8080)
cd backend && go mod download && go run ./cmd/api

# Frontend (porta 3000)
cd frontend && npm install && npm run dev
```

Validação antes de PR — **estes são gates de merge**, rode todos:

```bash
node scripts/validate-br-refs.mjs                     # referências BR-*/BRF-*
node scripts/validate-docs.mjs                        # links, ponteiros, teto do memory bank, códigos TMP
cd backend  && go test ./... -count=1 && go build -o /tmp/api ./cmd/api
cd frontend && npm run test:unit && npm run typecheck && npm run lint:ci && npm run validate:tokens
```

Atalho: comando `/validar` (ver [`.cursor/commands/`](.cursor/commands/)).

O CI (`.github/workflows/ci-cd.yml`) tem 5 jobs, todos bloqueantes:

| Job | Executa |
|-----|---------|
| `docs-validate` | `validate-br-refs.mjs`, `validate-docs.mjs` |
| `backend-lint-build` | `go mod verify`, golangci-lint, govulncheck, `go test ./... -count=1`, `go build` |
| `frontend-lint` | `npm audit --audit-level=high`, `test:unit`, `typecheck`, `lint:ci`, `validate:tokens` |
| `frontend-build` | `npm run build` |
| `docker-build` | `docker build` da imagem do backend |

`codeql.yml` roda CodeQL (Go + JS/TS) em paralelo. `npm run test:e2e` (Playwright) **não** está no CI — é validação local.

DevContainer: `.devcontainer/` — Reopen in Container sobe Go, Node e PostgreSQL.

## Arquitetura

Monorepo: `backend/` (Go/Gin) + `frontend/` (Next.js App Router).

```
Backend:  internal/handlers → internal/service → internal/repository → PostgreSQL (pgx)
Frontend: app → components → services → API (TanStack Query + Axios)
```

Pastas do backend são **singulares** (`service/`, `repository/`), exceto `handlers/`.

Deploy: backend Render (Docker), frontend Vercel. Auth UI: JWT RS256; integrações M2M: API key em `/api/v1/integracoes/*`.

Padrões completos: [`memory-bank/systemPatterns.md`](memory-bank/systemPatterns.md). Instruções por pasta: [`backend/AGENTS.md`](backend/AGENTS.md), [`frontend/AGENTS.md`](frontend/AGENTS.md).

## Fluxo de Trabalho

1. **Antes**: `memory-bank/activeContext.md` + o que a tabela de roteamento acima indicar para a tarefa
2. **Durante**: consistência com código existente; TypeScript strict; erros explícitos em Go
3. **Depois**: rodar os gates de merge e atualizar a documentação — skill [`atualizar-documentacao`](.cursor/skills/atualizar-documentacao/SKILL.md)

Estado e métricas **vivos** — consulte `memory-bank/activeContext.md` e `memory-bank/progress.md` (não confiar em resumos estáticos neste arquivo).

## Regras Importantes

- Nunca contradizer padrões documentados sem atualizar a doc primeiro
- Mudança de **comportamento de produto** → atualizar `docs/business/` no mesmo trabalho
- Frontend: zoom/reflow a11y conforme `memory-bank/patterns/ui.md`; UI nova/alterada → checklist em [`frontend/AGENTS.md`](frontend/AGENTS.md) e regra Cursor [`.cursor/rules/frontend-ui-patterns.mdc`](.cursor/rules/frontend-ui-patterns.mdc)
- Testes M2M contra backend `:8080`, não Next.js `:3000`

## Skills e comandos

Workflows repetíveis vivem em [`.cursor/skills/`](.cursor/skills/) (carregadas sob demanda) e [`.cursor/commands/`](.cursor/commands/) (invocadas com `/`):

| Quando | Onde |
|--------|------|
| Terminou uma tarefa e precisa sincronizar docs | skill `atualizar-documentacao` |
| Requisito novo → `BR-*` + briefing `BRF-NNN` | skill `nova-regra-negocio` · comando `/briefing` |
| Endpoint novo (handler → service → repository + docs) | skill `novo-endpoint` |
| Página/listagem/formulário novo | skill `nova-pagina-ui` |
| Migration SQL nova | skill `nova-migration` |
| Corrigir bug com regressão | skill `corrigir-bug` |
| Rodar todos os gates de merge | comando `/validar` |
| Revisar estado do projeto antes de decidir | comando `/contexto` |

## Fora de Escopo Atual

OpenAPI da API JWT completa; admin de integrações no OpenAPI; upload PDF; webhooks; OAuth2 M2M.

## Referências Rápidas

- Catálogo de negócio: `docs/business/README.md`
- Integrações Swagger: `GET /api/v1/integracoes/docs`
- Regressão ciclo: `docs/tests/regressao-ciclo-fase2.md`
- **TestSprite** (MCP em `.cursor/mcp.json`, local/gitignored): suites em `testsprite_tests/`; testes da API M2M contra o backend em **`:8080`**, não Next.js `:3000`. Requer `TESTSPRITE_API_KEY` no ambiente.

**Última atualização**: 2026-08-25
