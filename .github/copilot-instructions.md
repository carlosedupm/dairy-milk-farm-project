# CeialMilk — instruções GitHub Copilot

Siga **[`AGENTS.md`](../AGENTS.md)** na raiz como fonte de política e roteamento.

## Invariantes

- Backend: `handlers` → `service` → `repository` (pastas singulares, exceto `handlers/`).
- Frontend: TypeScript strict; TanStack Query; HTTP só em `frontend/src/services/`.
- Comportamento de produto → atualizar `docs/business/` (`BR-*`) no mesmo trabalho. Não inventar IDs.
- Requisito novo: skill/fluxo `nova-regra-negocio` + briefing `BRF-NNN` (G1 humano) antes de implementar.
- Leitura dirigida: `memory-bank/activeContext.md` primeiro; padrões em `memory-bank/patterns/` via índice `systemPatterns.md` — não carregar o memory-bank inteiro.

## Gates antes de PR

```bash
node scripts/validate-br-refs.mjs
node scripts/validate-docs.mjs
cd backend  && go test ./... -count=1 && go build -o /tmp/api ./cmd/api
cd frontend && npm run test:unit && npm run typecheck && npm run lint:ci && npm run validate:tokens
```

Instructions path-scoped: [`.github/instructions/`](instructions/).
