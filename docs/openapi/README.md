# OpenAPI — CeialMilk

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

Ao alterar a API de integrações, atualize **ambos** os ficheiros (ou copie de `backend/internal/openapi/` para aqui).

**Última atualização**: 2026-05-29
