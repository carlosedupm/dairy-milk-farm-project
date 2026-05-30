# Regras de negócio — Lactações

Ciclo de **lactação** por animal, normalmente aberto automaticamente no parto.

**Implementação principal**

- Backend: `backend/internal/service/lactacao_service.go`, `backend/internal/repository/lactacao_repository.go`, abertura automática em `backend/internal/service/parto_service.go`.
- Frontend: `frontend/src/services/lactacoes.ts`, `/gestao/lactacoes/*`.
- Persistência: tabela `lactacoes` em `backend/migrations/12_add_gestao_pecuaria.up.sql`.

---

### BR-LACTACAO-001 — Abertura no parto

- **Enunciado**: Ao registrar parto, cria-se lactação com `status = EM_ANDAMENTO`, `data_inicio` = data do parto e `numero_lactacao` sequencial.
- **Implementação**: `PartoService.applyAfterPartoCreate`.
- **Estado**: implementado.

### BR-LACTACAO-002 — Uma lactação ativa por animal

- **Enunciado**: Não é permitido criar manualmente nova lactação em andamento se já existir lactação ativa na fazenda (`data_fim` nula; status nulo ou `EM_ANDAMENTO`).
- **Efeito**: erro `ErrLactacaoAtivaJaExiste` no servidor.
- **Implementação**: `LactacaoService.Create` + `ExistsAtivaNaFazenda`.
- **Estado**: implementado.

### BR-LACTACAO-003 — Encerramento na secagem

- **Enunciado**: Secagem encerra a lactação ativa; ver [secagens.md](./secagens.md) BR-SECAGENS-002.
- **Estado**: implementado.

### BR-LACTACAO-004 — Lactação ativa para restrição e produção

- **Enunciado**: Restrições de leite e (Fase 2) registro de produção exigem lactação ativa; ver [leite-restricoes.md](./leite-restricoes.md) e [producao-leite.md](./producao-leite.md).
- **Estado**: implementado (restrição); produção na entrega BR-CICLO-007.

### BR-LACTACAO-005 — Data de início (temporal)

- **Enunciado**: `data_inicio` não futura nem anterior à entrada/nascimento — BR-CICLO-012–013 (TMP-001, TMP-002).
- **Efeito**: bloqueio no servidor (400).
- **Implementação**: `LactacaoService` + `ciclo_integridade_temporal.go`; `/gestao/lactacoes/novo` com `maxDate=hoje`.
- **Estado**: implementado.

### BR-LACTACAO-006 — Lista elegível para abertura manual

- **Enunciado**: `GET /api/v1/fazendas/:id/animais/para-abertura-lactacao` retorna fêmeas no rebanho **sem** lactação ativa; UI usa `AnimalSelect` com `cicloContext="lactacao"`.
- **Efeito**: alinhado a BR-LACTACAO-002 na listagem do formulário `/gestao/lactacoes/novo`.
- **Implementação**: `AnimalRepository.ListParaAberturaLactacaoByFazendaID`.
- **Estado**: implementado (ver [ciclo-rebanho.md](./ciclo-rebanho.md) BR-CICLO-015).

---

**Última atualização**: 2026-05-30 (BR-LACTACAO-006 — lista elegível)
