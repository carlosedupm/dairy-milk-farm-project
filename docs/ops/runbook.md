# Runbook de Operações — CeialMilk

## 1. Rollback

### 1.1 Backend (Render)

1. Dashboard Render → serviço `ceialmilk-api` → aba **Events/Deploys**.
2. Localizar o último deploy saudável e clicar em **Rollback to this deploy**.
3. Validar: `GET https://<host>/health` deve retornar `{"status":"ok"}`.
4. Atenção: rollback de código **não** desfaz migrações de banco já aplicadas. Se a migração nova for incompatível com o código antigo, ver §2 (migrações são *forward-only* por padrão; avalie hotfix em vez de rollback).

### 1.2 Frontend (Vercel)

1. Dashboard Vercel → projeto → **Deployments**.
2. Selecionar o deployment anterior estável → menu **⋯** → **Promote to Production** (ou **Instant Rollback**).
3. Validar login e uma rota autenticada (ex.: `/animais`).

## 2. Migração "dirty" (golang-migrate)

Sintoma: API não sobe; log com `Dirty database version N`.

1. Conectar ao banco (string em `DATABASE_URL` no Render):

```bash
psql "$DATABASE_URL" -c "SELECT version, dirty FROM schema_migrations;"
```

2. Inspecionar o que a migração `N` aplicou parcialmente; corrigir manualmente o schema OU reverter os efeitos parciais.
3. Forçar a versão para o último estado consistente:

```bash
# se a migração N falhou e foi revertida manualmente:
migrate -path backend/migrations -database "$DATABASE_URL" force N-1
# se a migração N foi concluída manualmente:
migrate -path backend/migrations -database "$DATABASE_URL" force N
```

4. Redeploy/restart do serviço e validar `/health`.

Nunca usar `force` sem antes confirmar o estado real do schema.

## 3. Incidentes

### 3.1 Triagem rápida

| Sintoma | Primeiro passo |
|---------|----------------|
| 5xx generalizado | Logs do Render + Sentry (panics/erros capturados) |
| Login falhando | Verificar `JWT_PRIVATE_KEY`/`JWT_PUBLIC_KEY` e relógio do serviço |
| CORS no browser | `CORS_ORIGIN` no Render = origem exata do frontend |
| Latência alta | `/metrics` (Prometheus) + plano do banco no Render |
| Assistente fora do ar | `GEMINI_API_KEY` válida e quota da API Gemini |

### 3.2 Vazamento de secret

1. **Rotacionar imediatamente** a credencial no provedor (não esperar limpeza do git).
2. Remover dos arquivos versionados; conferir `.gitignore`.
3. Avaliar limpeza de histórico (BFG/git-filter-repo) e forçar push coordenado.
4. Auditar uso indevido (logs do provedor) durante a janela de exposição.

### 3.3 Suspeita de acesso indevido (multi-tenant)

1. Identificar usuário/fazenda afetados nos logs estruturados (correlation ID).
2. Conferir a tabela `usuarios_fazendas` para vínculos inesperados.
3. Revogar sessões: deletar refresh tokens do usuário na tabela de refresh tokens.
4. Registrar o incidente e abrir correção com teste de regressão cross-tenant.

## 4. Variáveis de ambiente críticas (produção)

Ver lista completa em [`memory-bank/deploy-notes.md`](../../memory-bank/deploy-notes.md). Destaques de segurança:

- `METRICS_TOKEN` — obrigatório em produção; sem ele `/metrics` responde 404
- `TRUSTED_PROXIES` — CSV de CIDRs; default cobre ranges privados (LB Render)
- `CORS_ORIGIN` — origem exata do frontend (sem `*`)

**Última atualização**: 2026-06-10
