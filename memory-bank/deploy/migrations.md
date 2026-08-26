# Migrações de banco (deploy)

### Migrações de Banco de Dados

**Estratégia**: Migrações executadas automaticamente no startup do servidor Go usando `golang-migrate`.

**Fluxo**:

1. Servidor inicia
2. Verifica versão atual do banco
3. Executa migrações pendentes
4. Inicia servidor HTTP

**Localização**: `/backend/migrations/`

**Formato**: `{version}_{descrição}.up.sql` e `{version}_{descrição}.down.sql` (ex.: `1_add_remaining_tables.up.sql`, `2_add_indexes_to_fazendas.up.sql`, `3_seed_admin.up.sql`, `4_add_refresh_tokens.up.sql`)

**Seed operacional de dev** (animais/lactações): **não** entra em `migrations/`. Fica em `backend/scripts/seed_dev.sql` e só corre no startup com `ENV=development` (ver [`env-vars.md`](env-vars.md)). Seeds mínimos em migrations (admin, fazenda Dev) continuam a aplicar em todos os ambientes.

**Numeração de migrations**: a sequência salta de **28 → 30** (não existe `29_*.sql`). Lacuna numérica acidental — nunca houve migration 29 no histórico git. O `golang-migrate` usa o prefixo numérico do ficheiro; ambientes existentes **não são afetados**. Se no futuro houver alteração de schema reservada para V29, usar o número 29 normalmente.

**Última atualização**: 2026-08-25

**Row Level Security (RLS)**: A migração `19_enable_row_level_security_public_tables` ativa RLS em todas as tabelas de domínio em `public`, sem políticas para `anon`/`authenticated`. Isso alinha com linters de ambientes que expõem `public` ao PostgREST (ex.: Supabase). O backend CeialMilk usa `DATABASE_URL` com usuário que **é dono das tabelas**: no PostgreSQL, o dono ignora RLS por padrão (salvo `FORCE ROW LEVEL SECURITY`), portanto a API Go/sqlx segue inalterada. Se no futuro um cliente usar papel não-dono com menos privilégios, será preciso criar políticas RLS ou `GRANT` adequados.


## Troubleshooting relacionado

Ver [`runbook-pointers.md`](runbook-pointers.md) (secções de migração dirty) e [`docs/ops/runbook.md`](../../docs/ops/runbook.md).
