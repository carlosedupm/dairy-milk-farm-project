---
# always loaded (no paths)
---
# Contexto CeialMilk

Gestão para fazendas leiteiras, centrada no ciclo de vida do animal. Monorepo **Go/Gin** (`backend/`) + **Next.js App Router** (`frontend/`).

Mapa completo, comandos e gates de merge: **[`AGENTS.md`](../../AGENTS.md)** na raiz.

## Invariantes

- Backend em camadas: `internal/handlers` → `internal/service` → `internal/repository` → PostgreSQL (pgx). Pastas **singulares** (`service/`, `repository/`), exceto `handlers/`.
- Respostas HTTP via `internal/response`; endpoints versionados `/api/v1/{recurso}`.
- Frontend: TypeScript strict; estado servidor com TanStack Query; chamadas API em `src/services/`.
- Mudança de **comportamento de produto** exige atualizar `docs/business/<modulo>.md` no mesmo trabalho (IDs `BR-*`, validados no CI por `scripts/validate-br-refs.mjs`).

## Leitura dirigida, não exaustiva

Não leia o `memory-bank/` inteiro — são ~200 KB. Abra só o que a tarefa exige (tabela de roteamento em `AGENTS.md`):

- Orientação inicial em qualquer tarefa: `memory-bank/activeContext.md` (curto de propósito)
- Padrões de API, segurança, dados: índice `memory-bank/systemPatterns.md` → abra só `memory-bank/patterns/<modulo>.md`
- Stack e versões: `memory-bank/techContext.md`
- Deploy e env vars: índice `memory-bank/deploy-notes.md` → `memory-bank/deploy/`

## Workflows

Use as skills em `.cursor/skills/` em vez de improvisar:

- Fim de tarefa, sincronizar docs → **`atualizar-documentacao`**
- Requisito novo (`BR-*` + `BRF-NNN`) → **`nova-regra-negocio`**
- Endpoint novo → **`novo-endpoint`**
- Página, listagem ou formulário → **`nova-pagina-ui`**
- Migration SQL → **`nova-migration`**
- Correção de bug → **`corrigir-bug`**

Regras com escopo automático (Claude `.claude/rules/`):
- [`frontend-ui-patterns.md`](frontend-ui-patterns.md) e [`design-tokens.md`](design-tokens.md) — ao editar `frontend/src/`
- [`dominio-pecuaria.md`](dominio-pecuaria.md) — ao editar services/handlers Go, `docs/business/`, gestão/produção no frontend; também peça a regra em qualquer tarefa de ciclo, saúde, produção ou `BR-*`
