# Regras de negócio — Produção de leite

Registro diário de **volume de leite** por animal na fazenda.

**Implementação principal**

- Backend: `backend/internal/service/producao_service.go`, `backend/internal/handlers/producao_handler.go`.
- API: `POST /api/v1/producao` (entre outras rotas de consulta/edição para perfis autorizados).
- Listagens globais (`GET /api/v1/producao`, `/count`, `/filter/by-date`): apenas registros de animais das fazendas do usuário; query `fazenda_id` restringe à fazenda ativa (validada em `ResolveFazendaIDsForList`).
- Frontend: `frontend/src/app/producao/*`, `ProducaoForm.tsx`, `ProducaoTable.tsx` — listagem usa `useFazendaAtiva()` + `fazenda_id` na API.
- RBAC: FUNCIONARIO com `POST` — [acessos-perfil.md](./acessos-perfil.md) BR-ACESSO-015.

---

### BR-PRODUCAO-001 — Animal existente na fazenda

- **Enunciado**: `animal_id` obrigatório; animal deve existir e o utilizador deve ter acesso à fazenda do animal.
- **Efeito**: bloqueio no servidor.
- **Estado**: implementado.

### BR-PRODUCAO-002 — Quantidade e qualidade

- **Enunciado**: `quantidade` > 0; `qualidade` opcional entre 1 e 10.
- **Efeito**: bloqueio no servidor.
- **Estado**: implementado.

### BR-PRODUCAO-003 — Produção exige lactação ativa na data do registo

- **Enunciado**: Não é permitido registrar ou editar produção sem lactação ativa na **data** do registo (`data_inicio` da lactação ≤ data da produção; lactação com `data_fim` nula e status nulo ou `EM_ANDAMENTO`). Alinhado a INT-002 / BR-AUDIT-010.
- **Escopo**: `POST` e `PUT` produção; alinhado a [leite-restricoes.md](./leite-restricoes.md) BR-LEITE-005.
- **Efeito**: bloqueio no servidor (400, `details.conformidade`: `INT-002`); aviso na UI antes do envio.
- **Implementação**: `ValidateLactacaoAtivaParaProducao`, `LactacaoRepository.ExistsAtivaNaFazendaNaData`; `ProducaoForm` lista apenas animais de `GET .../animais/em-lactacao`; [ciclo-rebanho.md](./ciclo-rebanho.md) BR-CICLO-007.
- **Estado**: implementado.

### BR-PRODUCAO-005 — Data/hora da produção (temporal)

- **Enunciado**: `data_hora` não futura; ≥ entrada/nascimento; lactação na data (INT-002); se lactação encerrada, produção ≤ `data_fim` — BR-CICLO-012–014 (TMP-001, TMP-002, TMP-006).
- **Efeito**: bloqueio no servidor (400, `details.conformidade` TMP-* ou INT-002).
- **Implementação**: `ProducaoService` + `ciclo_integridade_temporal.go`; `ProducaoForm` com `maxDate` agora.
- **Estado**: implementado.

---

### BR-PRODUCAO-004 — Listagem por escopo de fazenda

- **Enunciado**: Consultas globais de produção retornam apenas registros de animais pertencentes às fazendas vinculadas ao utilizador; com `fazenda_id` na query, apenas essa fazenda (se o utilizador tiver acesso).
- **Efeito**: bloqueio no servidor (403 se `fazenda_id` sem vínculo); UI alinhada à fazenda ativa do header.
- **Implementação**: `ResolveFazendaIDsForList`, `ProducaoRepository.GetByFazendaIDs*`; `frontend/src/app/producao/page.tsx`.
- **Estado**: implementado.

---

**Última atualização**: 2026-05-25 (BR-PRODUCAO-005 — validação temporal)
