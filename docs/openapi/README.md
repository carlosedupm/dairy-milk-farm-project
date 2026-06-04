# OpenAPI — CeialMilk

Existem **dois contratos OpenAPI distintos** nesta pasta. Não confundir os ficheiros — têm APIs, autenticação e paths diferentes. Tamanhos similares (~32KB) são coincidência, não duplicação.

## API JWT (parcial)

| Ficheiro | Descrição |
|----------|-----------|
| [`openapi.yaml`](openapi.yaml) | Spec OpenAPI 3.0 — saúde animal, alertas e push (`/api/v1/animais/.../saude`, `/api/v1/fazendas/.../alertas`, `/api/v1/me/...`) |

**Fonte de verdade:** [`backend/internal/openapi/openapi.yaml`](../../backend/internal/openapi/openapi.yaml).

Autenticação JWT (cookie `ceialmilk_token` ou `Authorization: Bearer <jwt>`). Distinto da API M2M abaixo.

## Integrações M2M (v1)

| Ficheiro | Descrição |
|----------|-----------|
| [`integracoes-v1.openapi.yaml`](integracoes-v1.openapi.yaml) | Spec OpenAPI 3.0 das rotas `/api/v1/integracoes/*` |

**Fonte de verdade para o servidor:** [`backend/internal/openapi/integracoes-v1.openapi.yaml`](../../backend/internal/openapi/integracoes-v1.openapi.yaml) (embed no binário Go).

## Manutenção

1. Alterar primeiro o ficheiro em `backend/internal/openapi/`.
2. Copiar para `docs/openapi/` (cópia versionada para documentação e import Postman).
3. Testes de embed: `jwt_openapi_test.go`, `integracoes_docs_test.go`.

**Última atualização**: 2026-06-03
