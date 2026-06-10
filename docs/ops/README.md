# Operações (Ops) — CeialMilk

Runbook mínimo de operação e resposta a incidentes. Complementa [`memory-bank/deploy-notes.md`](../../memory-bank/deploy-notes.md).

## Índice

| Documento | Conteúdo |
|-----------|----------|
| [runbook.md](runbook.md) | Rollback (Render/Vercel), dirty migration, incidentes |
| [security-checklist.md](security-checklist.md) | Checklist de segurança pré-deploy |
| [testing-strategy.md](testing-strategy.md) | Estratégia de testes unificada (backend, frontend, e2e) |
| [code-review.md](code-review.md) | Guia de code review (gate G2 dos briefings) |

## Arquitetura de deploy

- **Backend**: Render (Docker, `render.yaml` na raiz; `autoDeployTrigger: checksPass`)
- **Frontend**: Vercel (deploy automático da `main`)
- **Banco**: PostgreSQL (Render); migrações via golang-migrate embutidas no boot da API

**Última atualização**: 2026-06-10
