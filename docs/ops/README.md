# Operações (Ops) — CeialMilk

Runbook mínimo de operação e resposta a incidentes. Complementa [`memory-bank/deploy-notes.md`](../../memory-bank/deploy-notes.md).

## Índice

| Documento | Conteúdo |
|-----------|----------|
| [runbook.md](runbook.md) | Rollback (Render/Vercel), dirty migration, incidentes |
| [security-checklist.md](security-checklist.md) | Checklist de segurança pré-deploy |
| [testing-strategy.md](testing-strategy.md) | Estratégia de testes unificada (backend, frontend, e2e) |
| [code-review.md](code-review.md) | Guia de code review (gate G2 dos briefings) |
| [assistente-funcionario-fases.md](assistente-funcionario-fases.md) | Plano de liberação incremental do assistente para FUNCIONARIO (BR-ACESSO-006) |

## Validação staging

| Documento | Conteúdo |
|-----------|----------|
| [../tests/staging-validation-tier0.md](../tests/staging-validation-tier0.md) | Checklist Tier 0 (ciclo, vacinas, M2M, segurança) |
| [../tests/regressao-fase3-checklist.md](../tests/regressao-fase3-checklist.md) | Regressão manual Fase 3 (saúde, alertas, vacinas, hormônios) |

**Última atualização**: 2026-06-14

- **Backend**: Render (Docker, `render.yaml` na raiz; `autoDeployTrigger: checksPass`)
- **Frontend**: Vercel (deploy automático da `main`)
- **Banco**: PostgreSQL (Render); migrações via golang-migrate embutidas no boot da API

**Última atualização**: 2026-06-10
