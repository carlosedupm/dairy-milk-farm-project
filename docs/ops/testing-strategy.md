# Estratégia de Testes — CeialMilk

Estratégia unificada para backend, frontend e e2e. O CI executa todos os gates antes do deploy (`autoDeployTrigger: checksPass`).

## Pirâmide

| Camada | Ferramenta | Onde | Quando roda |
|--------|-----------|------|-------------|
| Unit/integração backend | `go test` | `backend/internal/**/*_test.go` | CI (`go test ./... -count=1`) |
| Lint/segurança backend | golangci-lint, govulncheck | `.golangci.yml` | CI |
| Unit frontend | Vitest | `frontend/src/**/*.test.ts(x)` | CI (`npm run test:unit`) |
| Lint/types frontend | ESLint, tsc | — | CI (`lint:ci`, `typecheck`) |
| Auditoria deps | `npm audit --audit-level=high` | — | CI |
| E2E | Playwright | `frontend/tests/e2e/` | Local/manual (`npm run test:e2e`) |
| Análise estática | CodeQL (Go + JS/TS) | `.github/workflows/codeql.yml` | CI + semanal |
| Regressão manual | Roteiro | `docs/tests/regressao-ciclo-fase2.md` | Antes de releases do ciclo |

## Convenções backend (Go)

- Testes ao lado do código (`*_test.go`), sem banco real: services testados com stubs/fakes de repositórios.
- Cobrir obrigatoriamente: regras de domínio (BR-*), validação de acesso multi-tenant (cross-tenant negado), normalização de datas.
- Rodar com `-count=1` (sem cache) e, em dev, `TZ=UTC` para evitar falsos negativos de timezone.

## Convenções frontend

- Vitest para lógica pura (`src/lib/`, validações de formulário). Componentes complexos: considerar Testing Library quando houver lógica condicional relevante.
- Playwright para fluxos críticos (auth, navegação). Requer backend `:8080` ativo.

## Testes M2M / API

- Coleções Postman em `docs/postman/`; testes de integração M2M contra o backend `:8080` (nunca contra o Next `:3000`).

## Critério para novos PRs

1. Mudança de comportamento → teste novo ou atualizado no mesmo PR.
2. Bug corrigido → teste de regressão que falharia antes do fix.
3. Endpoint novo → teste de handler/service incluindo caso de acesso negado (403/404 cross-tenant).

**Última atualização**: 2026-06-10
