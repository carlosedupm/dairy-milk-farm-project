# Backend — CeialMilk

Instruções específicas do API Go. Contexto global: [`../AGENTS.md`](../AGENTS.md).

## Stack

Go 1.25+ (versão exata em `go.mod`), Gin, PostgreSQL 15, pgx/v5, golang-migrate, JWT RS256, slog. Métricas Prometheus em `internal/middleware/metrics.go`.

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
```

Gates de merge que o CI aplica ao backend:

```bash
go mod verify
golangci-lint run
go test ./... -count=1
go build -o /tmp/api ./cmd/api
```

O CI roda também `govulncheck ./...`. Migrações são aplicadas por `cmd/api/main.go` — não existe `cmd/migrate/`.

Detalhe: [`../memory-bank/systemPatterns.md`](../memory-bank/systemPatterns.md). Workflow completo: skill `novo-endpoint`.
