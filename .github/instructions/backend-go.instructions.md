---
applyTo: "backend/**/*.go"
---

# Backend Go — CeialMilk (Copilot)

Detalhe: `backend/AGENTS.md`. Skill: `novo-endpoint`.

- Camadas: `handlers` → `service` → `repository` → pgx. Pastas singulares (`service/`, `repository/`).
- Respostas: `internal/response` (`SuccessOK`, `ErrorValidation`, …).
- Rotas: `/api/v1/{recurso}` em `cmd/api/main.go`.
- SQL parametrizado; filtrar por `fazenda_id` em dados de fazenda.
- Auth UI: JWT RS256; M2M: API key em `/api/v1/integracoes/*`.
- Migrations: skill `nova-migration` — não editar SQL já aplicado em produção.
