# Regras de negócio — Integrações externas (API M2M)

Acesso **máquina-a-máquina** para sistemas externos ou agentes de IA registarem dados no CeialMilk com rastreabilidade.

**Implementação principal**

- Backend: `backend/internal/auth/integration.go`, `backend/internal/handlers/integracao_handler.go`, `backend/internal/service/integracao_service.go`
- Admin: `GET|POST|PATCH /api/v1/admin/integracoes`, rotação e revogação de chave
- API M2M: prefixo `/api/v1/integracoes/*` com `Authorization: Bearer cmk_live_...`
- UI: `frontend/src/app/admin/integracoes/*`
- Guia técnico: [docs/integracoes/README.md](../integracoes/README.md)

---

### BR-INTEG-001 — Escrita identifica o ator técnico

- **Enunciado**: Registos criados via integração gravam `created_by` com o `actor_user_id` (utilizador `INTEGRACAO`, sem login). O cliente **não** envia `created_by` no body.
- **Efeito**: rastreio em banco; «Registado por» na ficha do animal mostra o nome da integração (ex.: «Integração — Clínica Vet ABC»).
- **Estado**: implementado.

### BR-INTEG-002 — Escopo por fazenda

- **Enunciado**: Cada cliente só opera nas fazendas listadas em `integracao_cliente_fazendas`.
- **Efeito**: bloqueio 403 se `fazenda_id` não estiver autorizado.
- **Estado**: implementado.

### BR-INTEG-003 — Escopo por permissão

- **Enunciado**: Cada operação exige scope declarado (`animais:read`, `toques:write`, `coberturas:read`, `coberturas:write`, `saude:read`, `saude:write`, `alertas:read`).
- **Efeito**: bloqueio 403 sem scope.
- **Estado**: implementado.

### BR-INTEG-004 — Chave revogada ou inativa

- **Enunciado**: Cliente com `ativo=false` ou `revogado_em` preenchido não autentica.
- **Efeito**: 401 na API M2M.
- **Estado**: implementado.

### BR-INTEG-005 — Idempotência

- **Enunciado**: Header `Idempotency-Key` (ou campo `idempotency_key` no body do lote) com o mesmo hash de body devolve a resposta armazenada; hash diferente → 409.
- **Efeito**: evita duplicar toques, coberturas ou casos de saúde em reenvio do mesmo relatório/importação.
- **Implementação**: `POST /api/v1/integracoes/toques`, `POST /toques/lote`, `POST /coberturas`, `POST /coberturas/lote`, `POST /saude`.
- **Estado**: implementado.

### BR-INTEG-006 — Lote com sucesso parcial

- **Enunciado**: `POST /api/v1/integracoes/toques/lote` e `POST /api/v1/integracoes/coberturas/lote` processam linha a linha; falhas numa linha não revertem linhas já gravadas na mesma requisição.
- **Efeito**: resposta com `total`, `sucesso`, `falhas[]` e lista de registos criados (`toques_criados[]` ou `coberturas_criadas[]`); HTTP 200 quando a requisição foi processada.
- **Estado**: implementado.

### BR-INTEG-008 — Busca de animais exclui baixados por defeito

- **Enunciado**: `GET /api/v1/integracoes/animais` (busca por `identificacao` + `fazenda_id`) devolve apenas animais **no rebanho** (`data_saida` nula ou futura), alinhado a BR-BAIXA-002.
- **Efeito**: integradores não sugerem animal fora do rebanho em fluxos operacionais; detalhe por `GET .../animais/:id` continua a expor `data_saida`, `motivo_saida`, `observacao_saida` quando existirem.
- **Implementação**: `IntegracaoHandler.SearchAnimais` → `SearchByIdentificacaoForFazendas(..., somenteNoRebanho=true)`; schema OpenAPI `Animal`.
- **Estado**: implementado.

### BR-INTEG-007 — Classificação operacional em toques M2M

- **Enunciado**: Toques unitários e em lote aceitam `classificacao_operacional` (`PRENHA`, `VAZIA`, `VAZIA_PEV`, `CLOE`, `CL`, `RETOQUE`) e campos opcionais `dias_gestacao_estimados`, `metodo`, `observacoes`; o servidor deriva `resultado` canônico conforme [toques.md](./toques.md) (BR-TOQUES-006).
- **Escopo**: `POST /api/v1/integracoes/toques`, `POST /api/v1/integracoes/toques/lote`; espelhado na UI JWT por `POST /api/v1/toques/lote`.
- **Implementação**: `NormalizeDiagnosticoGestacao`; OpenAPI `integracoes-v1.openapi.yaml`.
- **Estado**: implementado.

### BR-INTEG-009 — Listagem M2M de saúde por animal

- **Enunciado**: `GET /api/v1/integracoes/saude` exige `fazenda_id` e `animal_id` na query; o animal deve pertencer à fazenda autorizada e estar **no rebanho** (BR-SAUDE-003).
- **Escopo**: fazenda vinculada ao cliente M2M; scope `saude:read`.
- **Efeito**: bloqueio 403 (fazenda/animal) ou 400 `ANIMAL_FORA_REBANHO` (animal baixado).
- **Implementação**: `IntegracaoHandler.ListSaude` → `AnimalSaudeService.ListByAnimalID`; OpenAPI `integracoes-v1.openapi.yaml`.
- **Estado**: implementado.

### BR-INTEG-010 — Registo M2M de caso de saúde

- **Enunciado**: laboratórios/veterinários registam casos via `POST /api/v1/integracoes/saude` (scope `saude:write`); `created_by` = actor da integração (BR-INTEG-001); domínio conforme [saude-animal.md](./saude-animal.md) (BR-SAUDE-002/003).
- **Escopo**: `animal_id` + `fazenda_id` no body; animal no rebanho.
- **Efeito**: bloqueio no servidor; idempotência via `Idempotency-Key` (BR-INTEG-005).
- **Implementação**: `IntegracaoHandler.CreateSaude` → `AnimalSaudeService.Create`.
- **Estado**: implementado.

### BR-INTEG-011 — Listagem M2M de alertas da fazenda

- **Enunciado**: `GET /api/v1/integracoes/alertas?fazenda_id=` lista alertas da fazenda; filtro opcional `status` (e `tipo`, `severidade`, paginação); scope `alertas:read`.
- **Escopo**: fazenda vinculada ao cliente; regra de vínculo conforme [alertas.md](./alertas.md) (BR-ALERTA-001).
- **Efeito**: bloqueio 403 sem scope ou fazenda não autorizada; leitura apenas (sem write M2M de alertas).
- **Implementação**: `IntegracaoHandler.ListAlertas` → `AlertaService.ListByFazenda`.
- **Estado**: implementado.

---

**Última atualização**: 2026-05-30 (BR-INTEG-009–011 — scopes saude e alertas M2M)
