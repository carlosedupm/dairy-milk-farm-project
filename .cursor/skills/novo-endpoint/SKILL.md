---
name: novo-endpoint
description: Cria um endpoint no backend Go do CeialMilk seguindo as camadas handler/service/repository, com respostas padronizadas, RBAC e documentação. Use ao adicionar rota na API, criar um recurso ou domínio novo no backend, expor um dado que ainda não tem endpoint, ou estender a API M2M de integrações.
---

# Novo endpoint — backend Go

## Antes de escrever código

Se o endpoint materializa uma **regra de domínio** que não existe em `docs/business/`, pare e use a skill `nova-regra-negocio`. Implementador não cria regra de negócio.

## Camadas

Fluxo obrigatório, sem atalhos. Handler não fala com o banco; repository não decide regra.

```
internal/handlers/<dominio>_handler.go   HTTP: bind, validação de forma, resposta
internal/service/<dominio>_service.go    regra de domínio, orquestração
internal/repository/<dominio>_repo.go    SQL com pgx
internal/models/<dominio>.go             structs de request/response e entidade
```

Pastas são **singulares** (`service/`, `repository/`), exceto `handlers/`. Rotas são registradas em `cmd/api/main.go`.

## Passos

**1. Model** em `internal/models/`: entidade + structs de request com tags `json` e `binding`.

**2. Repository**: SQL parametrizado com pgx. Nunca interpole valores na query. Todo `SELECT` de dado de fazenda filtra por `fazenda_id`.

**3. Service**: valida a regra de domínio e retorna erro tipado que o handler traduz em HTTP. Cite o ID da regra em comentário só quando o código não deixa claro qual `BR-*` está sendo aplicada.

**4. Handler**: bind → chama service → responde via `internal/response`. Não monte JSON à mão.

| Situação | Helper |
|----------|--------|
| Leitura bem-sucedida | `response.SuccessOK` |
| Criação | `response.SuccessCreated` |
| Payload malformado | `response.ErrorBadRequest` |
| Regra de domínio violada | `response.ErrorValidation` ou `response.ErrorConflict` |
| Sem permissão | `response.ErrorForbidden` |
| Recurso inexistente | `response.ErrorNotFound` |
| Falha inesperada | `response.ErrorInternal` |

Formato garantido pelos helpers: sucesso `{data, message, timestamp}`, erro `{error: {code, message, details?}, timestamp}`.

**5. Rota** em `cmd/api/main.go`, versionada como `/api/v1/{recurso}`, no grupo com o middleware de auth correto. Endpoints de UI usam JWT RS256; `/api/v1/integracoes/*` usa API key M2M.

**6. RBAC**: confira o perfil exigido em `docs/business/acessos-perfil.md` e aplique com os helpers de `internal/handlers/access_helper.go`.

**7. Teste** em `internal/service/`: cubra o caminho felizinho e cada regra que bloqueia.

**8. Documentar**:
- Coleção em `docs/postman/`
- Padrão novo de API → `memory-bank/patterns/api.md`
- Se M2M: OpenAPI embed em `internal/openapi/` **e** `docs/openapi/integracoes-v1.openapi.yaml`
- Regra afetada → estado `implementado` em `docs/business/<modulo>.md` com ponteiro ao código

## Validar

```bash
cd backend && go test ./... -count=1 && go build -o /tmp/api ./cmd/api
node ../scripts/validate-br-refs.mjs
```

Teste manual de M2M vai contra `:8080` (backend), nunca `:3000` (Next.js).

Ao terminar, use a skill `atualizar-documentacao`.
