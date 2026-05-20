# Regras de negócio — Secagens

Registro de **secagem** da matriz (período seco antes do parto ou por baixa produção/tratamento).

**Implementação principal**

- Backend: `backend/internal/service/secagem_service.go`, `backend/internal/repository/secagem_repository.go`, handler em `backend/internal/handlers/gestao_pecuaria_handlers.go` (`SecagemHandler`).
- Frontend: `frontend/src/services/secagens.ts`, páginas `/gestao/secagens/*`.
- Persistência: tabela `secagens` em `backend/migrations/12_add_gestao_pecuaria.up.sql`.

---

### BR-SECAGENS-001 — Somente fêmeas

- **Enunciado**: Apenas animais do sexo **fêmea** podem ter secagem.
- **Efeito**: bloqueio no servidor (`SecagemService.Create`).
- **Estado**: implementado.

### BR-SECAGENS-002 — Secagem encerra lactação ativa

- **Enunciado**: Ao registrar secagem, se existir lactação ativa (`data_fim` nula e status nulo ou `EM_ANDAMENTO`), o sistema encerra essa lactação com `data_fim = data_secagem`, `status = ENCERRADA` e `dias_lactacao` calculado (dias civis inclusivos).
- **Escopo**: Mesma transação do insert da secagem e atualização de `status_reprodutivo` para `SECA`.
- **Efeito**: bloqueio/consistência no servidor; se não houver lactação ativa (ex.: secagem pré-parto), a secagem é gravada normalmente.
- **Implementação**: `SecagemService.Create` + `encerrarLactacaoAtivaSeExistirTx`; ver também [ciclo-rebanho.md](./ciclo-rebanho.md) BR-CICLO-006.
- **Estado**: implementado.

### BR-SECAGENS-003 — Motivo validado

- **Enunciado**: Quando informado, `motivo` deve ser `GESTACAO`, `BAIXA_PRODUCAO` ou `TRATAMENTO`.
- **Efeito**: bloqueio no servidor.
- **Estado**: implementado.

---

**Última atualização**: 2026-05-19
