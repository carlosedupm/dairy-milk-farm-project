# Backend — CeialMilk

Instruções específicas do API Go. Contexto global: [`../AGENTS.md`](../AGENTS.md).

## Stack

Go 1.24+, Gin, PostgreSQL 15, pgx/v5, golang-migrate, JWT RS256, slog.

## Estrutura

```
backend/
├── cmd/api/          # Entrypoint
├── internal/
│   ├── handlers/     # HTTP (Gin)
│   ├── service/      # Lógica de negócio
│   ├── repository/   # SQL + pgx
│   ├── models/
│   ├── middleware/
│   ├── auth/
│   └── response/     # Respostas HTTP padronizadas
└── migrations/
```

## Convenções

- Erros explícitos; respostas via `internal/response`
- Endpoints versionados: `/api/v1/{recurso}`
- Dois modos de auth: JWT (UI) e API key M2M (`/api/v1/integracoes/*`)
- Novo domínio: handler → service → repository; regras em `docs/business/`
- Integrações M2M: atualizar OpenAPI embed (`internal/openapi/`) e `docs/openapi/integracoes-v1.openapi.yaml`

## Comandos

```bash
go run ./cmd/api                        # dev (:8080)
go test ./internal/service/... -count=1 # validação rápida
go test ./...                           # suite completa
```

Detalhe: [`../memory-bank/systemPatterns.md`](../memory-bank/systemPatterns.md).
