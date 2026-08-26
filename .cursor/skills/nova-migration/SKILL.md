---
name: nova-migration
description: Cria migration SQL up/down numerada em backend/migrations/ no CeialMilk. Use ao alterar schema PostgreSQL, adicionar tabela/coluna/índice/constraint, backfill de dados, ou quando um BR-* exigir mudança de persistência.
---

# Nova migration — PostgreSQL

## Antes

1. Confirme o **próximo número** em `backend/migrations/` (`N_descricao.up.sql` / `.down.sql`). A sequência salta **28 → 30** (não existe 29) — ver [`memory-bank/deploy/migrations.md`](../../../memory-bank/deploy/migrations.md).
2. Se a mudança materializa regra de domínio nova, use antes a skill `nova-regra-negocio` (estado `planejado` + BRF).
3. Não edite migrations já aplicadas em produção — crie uma **nova** versão.

## Passos

1. Crie o par:
   - `backend/migrations/{N}_{snake_case_descricao}.up.sql`
   - `backend/migrations/{N}_{snake_case_descricao}.down.sql`
2. `up` deve ser idempotente quando possível (`IF NOT EXISTS`); `down` deve reverter o `up` de forma segura.
3. Preferir constraints e índices nomeados; evitar `SELECT *` em backfills longos sem `WHERE`.
4. As migrations correm no **startup** do API (`golang-migrate`). Teste local: `cd backend && go run ./cmd/api` (ou Docker) e confirme versão.
5. Se o schema afeta comportamento de produto → atualize `docs/business/<modulo>.md` (campo migration/constraint) no mesmo trabalho.
6. Atualize `memory-bank/deploy/migrations.md` só se mudar a **estratégia** (não a cada N).

## Checklist

- [ ] Par up/down com o mesmo N e descrição
- [ ] Sem editar migrations antigas
- [ ] BR-* / docs de negócio se o produto mudou
- [ ] Rodar API local e verificar migração aplicada
- [ ] Dirty migration: ver [`docs/ops/runbook.md`](../../../docs/ops/runbook.md)

## Não fazer

- Inventar número no meio da sequência sem motivo
- Colocar DML destrutivo sem `down` correspondente
- Assumir que o CI aplica migrations em staging por si — deploy Render aplica no boot
