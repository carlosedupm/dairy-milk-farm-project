# CeialMilk — Instruções para Agentes

Instruções **portáveis** (Cursor, CLI e outras ferramentas de IA). Regras Cursor-specific com escopo condicional ficam em [`.cursor/rules/`](.cursor/rules/) — em especial [`documentation-maintenance.mdc`](.cursor/rules/documentation-maintenance.mdc) para **quando atualizar documentação**.

## Visão Geral

CeialMilk é gestão para **fazendas leiteiras**, centrado no **ciclo de vida de cada animal** (reprodução, lactação, produção, restrições, equipe). Stack **Go + Next.js**; requisitos versionados em `docs/business/` (IDs `BR-*`).

Consulte [`memory-bank/projectbrief.md`](memory-bank/projectbrief.md) e [`docs/business/ciclo-rebanho.md`](docs/business/ciclo-rebanho.md).

## Documentação — onde consultar

### Memory Bank (`memory-bank/`)

**SEMPRE consulte antes de decisões técnicas ou mudanças significativas:**

| Arquivo | Conteúdo |
|---------|----------|
| `activeContext.md` | Estado atual, em andamento, próximos passos, problemas |
| `systemPatterns.md` | Padrões arquiteturais, API, segurança, UX/a11y |
| `progress.md` | Completude e marcos |
| `techContext.md` | Stack, dependências, dev/deploy |
| `projectbrief.md` | Objetivos e fases |
| `productContext.md` | Visão de produto |
| `deploy-notes.md` | Deploy e variáveis de ambiente |

### Outros

- **Regras de domínio**: [`docs/business/README.md`](docs/business/README.md) — atualizar no mesmo PR quando mudar comportamento de produto; use `@docs/business/...` no chat
- **API M2M**: [`docs/integracoes/README.md`](docs/integracoes/README.md) · [`docs/business/integracoes.md`](docs/business/integracoes.md) · OpenAPI em `docs/openapi/integracoes-v1.openapi.yaml`
- **API JWT (Postman)**: [`docs/postman/`](docs/postman/)
- **Baixa do rebanho**: [`docs/business/baixa-rebanho.md`](docs/business/baixa-rebanho.md)

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

Validação antes de PR:

```bash
cd backend && go test ./internal/service/... -count=1
cd frontend && npm run lint && npx tsc --noEmit
```

DevContainer: `.devcontainer/` — Reopen in Container sobe Go, Node e PostgreSQL.

## Arquitetura

Monorepo: `backend/` (Go/Gin) + `frontend/` (Next.js App Router).

```
Backend:  Handlers → Services → Repositories → PostgreSQL (pgx)
Frontend: App → Components → Services → API (TanStack Query + Axios)
```

Deploy: backend Render (Docker), frontend Vercel. Auth UI: JWT RS256; integrações M2M: API key em `/api/v1/integracoes/*`.

Padrões completos: [`memory-bank/systemPatterns.md`](memory-bank/systemPatterns.md). Instruções por pasta: [`backend/AGENTS.md`](backend/AGENTS.md), [`frontend/AGENTS.md`](frontend/AGENTS.md).

## Fluxo de Trabalho

1. **Antes**: `activeContext.md` + `systemPatterns.md` + módulo em `docs/business/` se aplicável
2. **Durante**: consistência com código existente; TypeScript strict; erros explícitos em Go
3. **Depois**: atualizar memory-bank e `docs/business/` conforme [`.cursor/rules/documentation-maintenance.mdc`](.cursor/rules/documentation-maintenance.mdc)

Estado e métricas **vivos** — consulte `activeContext.md` e `progress.md` (não confiar em resumos estáticos neste arquivo).

## Regras Importantes

- Nunca contradizer padrões documentados sem atualizar a doc primeiro
- Mudança de **comportamento de produto** → atualizar `docs/business/` no mesmo trabalho
- Frontend: zoom/reflow a11y conforme `systemPatterns.md`; UI nova/alterada → checklist em [`frontend/AGENTS.md`](frontend/AGENTS.md) e regra Cursor [`.cursor/rules/frontend-ui-patterns.mdc`](.cursor/rules/frontend-ui-patterns.mdc)
- Testes M2M contra backend `:8080`, não Next.js `:3000`

## Fora de Escopo Atual

OpenAPI da API JWT completa; admin de integrações no OpenAPI; upload PDF; webhooks; OAuth2 M2M.

## Referências Rápidas

- Catálogo de negócio: `docs/business/README.md`
- Integrações Swagger: `GET /api/v1/integracoes/docs`
- Regressão ciclo: `docs/tests/regressao-ciclo-fase2.md`

**Última atualização**: 2026-05-29
