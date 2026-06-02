# Regras de negócio — Produção de leite

Registro diário de **volume de leite** por animal na fazenda.

**Implementação principal**

- Backend: `backend/internal/service/producao_service.go`, `backend/internal/handlers/producao_handler.go`.
- API: `POST /api/v1/producao` (entre outras rotas de consulta/edição para perfis autorizados).
- Listagens globais (`GET /api/v1/producao`, `/count`, `/filter/by-date`): apenas registros de animais das fazendas do usuário; query `fazenda_id` restringe à fazenda ativa (validada em `ResolveFazendaIDsForList`).
- Frontend: `frontend/src/app/producao/*`, `ProducaoForm.tsx`, `ProducaoTable.tsx` — listagem usa `useFazendaAtiva()` + `fazenda_id` na API; filtro de período via `PeriodFilter` + `GET .../filter/by-date` com **últimos 30 dias** por defeito quando `start`/`end` não estão na URL (`lib/period-filter.ts`).
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

### BR-PRODUCAO-006 — Vínculo automático à lactação (`lactacao_id`)

- **Enunciado**: Ao registrar produção (`POST`), o servidor preenche `lactacao_id` com a lactação da fazenda cujo intervalo (`data_inicio` … `data_fim`) cobre a **data civil** do registo. O cliente **não** envia `lactacao_id`. Em `PUT`, o campo não é aceito no body; o servidor **preserva** o vínculo existente salvo alteração de `animal_id` ou `data_hora`, quando recalcula. Registos legados permanecem com `lactacao_id` NULL.
- **Escopo**: `producao_leite` + `lactacoes`; listagens `GET /api/v1/producao` e `GET .../filter/by-date` aceitam filtro opcional `lactacao_id`; tab **Produção** da ficha (`/animais/:id?tab=producao`) agrupa produção por lactação (total, média diária, duração); rota `/animais/:id/producao` redireciona para a tab.
- **Efeito**: bloqueio implícito via validações INT-002/TMP-006 se não houver lactação cobrindo a data; filtro GET restringe resultados; UI informativa no formulário.
- **Implementação**: migration `34_add_lactacao_id_producao_leite`; `FindLactacaoForProducaoDate`, `ProducaoService`, `ProducaoHandler`; frontend `producao.ts`, `/producao`, `/animais/[id]/producao`; alinhado a [ciclo-rebanho.md](./ciclo-rebanho.md) BR-CICLO-007.
- **Estado**: implementado.

---

**Última atualização**: 2026-06-02 (listagem — default 30d + PeriodFilter)
