# Regras de negócio — Lotes

Agrupamento operacional de animais por fazenda (piquetes, grupos de manejo) com histórico de movimentações.

**Implementação principal**

- Banco: migration `12_add_gestao_pecuaria.up.sql` — tabelas `lotes`, `movimentacoes_lote`; coluna `animais.lote_id`.
- Backend: `backend/internal/models/lote.go`, `backend/internal/service/lote_service.go`, `backend/internal/handlers/lote_handler.go`; movimentação em `movimentacao_lote_service.go`, `movimentacao_lote_handler.go`.
- Frontend: `frontend/src/app/lotes/page.tsx`, `frontend/src/app/lotes/novo/page.tsx`, `frontend/src/services/lotes.ts`; filtro `lote_id` em listagem de animais (`AnimaisListToolbar`).
- Assistente Live (GERENTE+): function `movimentar_animal_lote` em `assistente_live_service.go`.

---

## Regras

### BR-LOTE-001 — CRUD de lotes por fazenda

- **Enunciado**: cada lote pertence a uma fazenda; nome obrigatório; tipo opcional do catálogo fixo.
- **Escopo**: fazenda do utilizador com acesso válido.
- **Perfis / permissões**: perfis com acesso à área `lotes` na UI (`GERENTE`, `GESTAO`, `PROPRIETARIO`, `ADMIN`, `DEVELOPER`); `FUNCIONARIO` e `USER` sem rota `/lotes`.
- **Efeito**: bloqueio 403 sem acesso à fazenda; validação de `fazenda_id` no create.
- **Tipos permitidos** (`CHECK` implícito no service): `LACTACAO`, `SECAS`, `MATERNIDADE`, `PRE_PARTO`, `BEZERROS`, `RECRIA`, `ENGORDA`.
- **Implementação**:
  - Rotas: `POST /api/v1/lotes`, `GET /api/v1/lotes/:id`, `GET /api/v1/lotes?fazenda_id=`, `PUT /api/v1/lotes/:id`, `DELETE /api/v1/lotes/:id`
  - `LoteService.Create/Update`; `ValidateFazendaAccess` nos handlers.
- **Estado**: implementado.

### BR-LOTE-002 — Movimentação de animal entre lotes

- **Enunciado**: ao movimentar, o sistema regista `movimentacoes_lote` (origem opcional, destino, data, utilizador, motivo) e atualiza `animais.lote_id` para o lote de destino.
- **Escopo**: animal e lote de destino na **mesma fazenda**.
- **Perfis / permissões**: quem pode editar animal na API (não `FUNCIONARIO` em escrita genérica de animal — verificar RBAC atual em `perfil_access.go` para `POST .../movimentar-lote`).
- **Efeito**: bloqueio se lote destino de outra fazenda; 404 se animal ou lote inexistente.
- **Implementação**:
  - `POST /api/v1/animais/:id/movimentar-lote` — body `{ lote_destino_id, motivo? }`
  - `MovimentacaoLoteService.Create` → `UpdateLoteID` no animal.
- **Estado**: implementado.

### BR-LOTE-003 — Filtro de animais por lote

- **Enunciado**: listagem paginada de animais aceita `lote_id` para restringir ao grupo; endpoint auxiliar `GET /api/v1/animais/filter/by-lote?lote_id=`.
- **Escopo**: fazendas do utilizador.
- **Efeito**: filtro server-side na listagem operacional.
- **Implementação**: `AnimalRepository` + `frontend/src/services/animais.ts` (`listPaginated`, `listByLote`).
- **Estado**: implementado.

### BR-LOTE-004 — Lote inativo

- **Enunciado**: campo `ativo` (default `true` no create) permite marcar lote como inativo sem apagar histórico; UI de listagem ainda não distingue visualmente lotes inativos (melhoria futura).
- **Escopo**: update de lote.
- **Efeito**: informativo; não remove `animais.lote_id` automaticamente.
- **Implementação**: coluna `lotes.ativo`; `LoteHandler.Update`.
- **Estado**: implementado (UI parcial).

---

## Referências cruzadas

| Regra | Relação |
|-------|---------|
| [BR-CICLO-001](./ciclo-rebanho.md) | Animal como unidade; lote é agrupamento operacional, não altera ciclo reprodutivo |
| [BR-BAIXA-002](./baixa-rebanho.md) | Baixa não remove histórico de movimentações |
| [BR-ANIMAIS-008](./animais.md) | Ficha do animal pode exibir lote atual na sidebar quando preenchido |

---

**Última atualização**: 2026-06-14 (catálogo inicial — documentação de comportamento existente)
