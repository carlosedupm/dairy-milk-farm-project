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

- **Enunciado**: Cada operação exige scope declarado (`animais:read`, `toques:write`, `coberturas:read`, `coberturas:write`).
- **Efeito**: bloqueio 403 sem scope.
- **Estado**: implementado.

### BR-INTEG-004 — Chave revogada ou inativa

- **Enunciado**: Cliente com `ativo=false` ou `revogado_em` preenchido não autentica.
- **Efeito**: 401 na API M2M.
- **Estado**: implementado.

### BR-INTEG-005 — Idempotência

- **Enunciado**: Header `Idempotency-Key` (ou campo `idempotency_key` no body do lote) com o mesmo hash de body devolve a resposta armazenada; hash diferente → 409.
- **Efeito**: evita duplicar toques ou coberturas em reenvio do mesmo relatório/importação.
- **Implementação**: `POST /api/v1/integracoes/toques`, `POST /toques/lote`, `POST /coberturas`, `POST /coberturas/lote`.
- **Estado**: implementado.

### BR-INTEG-006 — Lote com sucesso parcial

- **Enunciado**: `POST /api/v1/integracoes/toques/lote` e `POST /api/v1/integracoes/coberturas/lote` processam linha a linha; falhas numa linha não revertem linhas já gravadas na mesma requisição.
- **Efeito**: resposta com `total`, `sucesso`, `falhas[]` e lista de registos criados (`toques_criados[]` ou `coberturas_criadas[]`); HTTP 200 quando a requisição foi processada.
- **Estado**: implementado.

---

**Última atualização**: 2026-05-23
