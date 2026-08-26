# Variáveis de ambiente (deploy)

### Variáveis de Ambiente

#### Injetadas pelo Render (não definir no Blueprint)

- `PORT` - Porta em que o app deve escutar. O Render define automaticamente; o backend usa `getEnv("PORT", "8080")`.

#### Configuradas no `render.yaml` (Blueprint)

- `DATABASE_URL` - Proveniente de `fromDatabase` (Postgres `ceialmilk-db`). URL no formato `postgresql://user:pass@host:port/db`.
- `ENV` - `production`
- `LOG_LEVEL` - `INFO` (ou DEBUG, WARN, ERROR)
- `CORS_ORIGIN` - URL do frontend na Vercel (ex.: `https://ceialmilk.vercel.app`). Quando **não** for localhost, os cookies de auth usam `SameSite=None` para requisições cross-origin (frontend Vercel ↔ backend Render). **Também usada** pelo WebSocket do Assistente Live (`/api/v1/assistente/live`): o upgrade do WebSocket valida o header `Origin` contra `CORS_ORIGIN`; em produção defina o domínio exato do frontend para evitar conexões de origens não autorizadas.

#### Obrigatórias e definidas manualmente (`sync: false`)

- `JWT_PRIVATE_KEY` - Chave privada RSA (PEM) para assinar tokens JWT (RS256). **Obrigatória.** Gerar com `openssl` (ver seção "Geração de Chaves JWT") e informar na criação do Blueprint ou no Dashboard do serviço.
- `JWT_PUBLIC_KEY` - Chave pública RSA (PEM) para verificar tokens. **Obrigatória.** Mesmo par da privada; definir no Blueprint ou no Dashboard.

#### Recuperação de senha (planejado — SMTP não definido)

Fluxo `forgot-password` / `reset-password` **não implementado** até escolha do provedor de e-mail transacional (ex.: Resend, SendGrid, Amazon SES, SMTP do Render). Quando definido, documentar aqui: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, e URL base do frontend para links de reset.

#### Segurança (recomendadas em produção)

- `METRICS_TOKEN` - Token Bearer para `GET /metrics`. **Em produção, sem esse token o endpoint responde 404** (não expõe métricas). Scraping: `Authorization: Bearer <token>`.
- `TRUSTED_PROXIES` - CSV de CIDRs confiáveis para `X-Forwarded-For` (default: ranges privados RFC1918 + loopback, cobrindo o LB do Render). Só alterar se a infra de proxy mudar.

#### Opcionais (auth — rate limit por IP)

- `AUTH_LOGIN_RATE_LIMIT` - Tentativas de login por IP por janela (default: **10**).
- `AUTH_LOGIN_RATE_WINDOW_MINUTES` - Janela do login em minutos (default: **15**).
- `AUTH_REGISTER_RATE_LIMIT` - Registos públicos por IP por hora (default: **5**).
- `AUTH_REFRESH_RATE_LIMIT` - Refresh tokens por IP por hora (default: **30**).

Em produção (`ENV=production`), o Gin confia em proxies (`SetTrustedProxies`) para obter o IP real do cliente via `X-Forwarded-For` (Render). Em desenvolvimento, proxies não são confiados — `ClientIP()` usa `RemoteAddr`.

#### Opcionais (alertas automáticos)

- `ALERTAS_CRON_ENABLED` - Ativa goroutine diária de geração de alertas (default: **true**).
- `ALERTAS_CRON_HOUR` - Hora local do disparo, 0–23 (default: **6**; timezone abaixo).
- `ALERTAS_TZ` - Timezone IANA do cron (default: **America/Sao_Paulo**).
- Disparo manual (staging): `POST /api/v1/admin/alertas/gerar` com JWT ADMIN/DEVELOPER.

#### Opcionais (integrações M2M)

- `INTEGRATION_RATE_LIMIT_PER_HOUR` - Limite de requisições por cliente de integração (default: **300**). Aplica-se a rotas autenticadas em `/api/v1/integracoes/*` (não às rotas públicas de documentação).
- **Docs em produção** (sem API key): `https://<backend>/api/v1/integracoes/openapi.yaml`, `https://<backend>/api/v1/integracoes/docs`. Chaves `cmk_live_*` criadas apenas via admin (`/admin/integracoes`).

#### Opcionais (Dev Studio)

- `GEMINI_API_KEY` - Chave da API Gemini (geração de código).
- `GITHUB_TOKEN`, `GITHUB_REPO` - Para PRs automáticos e **contexto da IA** (exemplos + arquivos-alvo) sempre da branch de produção.
- `GITHUB_CONTEXT_BRANCH` - Branch de referência para contexto (default: `main`). Quando GitHub está configurado, a IA usa o estado do repositório nessa branch. Ver `docs/dev-studio/SETUP.md`.


### Variáveis de Ambiente

- `NEXT_PUBLIC_API_URL` - URL do backend no Render (ex: `https://ceialmilk-api.onrender.com`)

## Geração de Chaves JWT (RS256)

As chaves JWT estão definidas no `render.yaml` com `sync: false`. O Render solicita os valores **na criação do Blueprint** ou você pode defini-los depois no **Dashboard** do serviço (Environment).

Para gerar o par de chaves RSA:

```bash
# Gerar chave privada
openssl genrsa -out private.pem 2048

# Gerar chave pública
openssl rsa -in private.pem -pubout -out public.pem
```

**Importante**: Usar o **conteúdo completo** dos arquivos PEM como valor das variáveis no Render:

- `JWT_PRIVATE_KEY`: Conteúdo do arquivo `private.pem` (incluindo `-----BEGIN ... -----` e `-----END ... -----`)
- `JWT_PUBLIC_KEY`: Conteúdo do arquivo `public.pem`

### Desenvolvimento (Devcontainer)

Ao **abrir o devcontainer**:

- **Postgres**: `db` sobe com `POSTGRES_HOST_AUTH_METHOD=trust` e **tmpfs** (sem volume persistente). Toda inicialização = banco zerado, init roda, `ceialmilk` criado. Conexão em `db:5432`.
- **Backend**: Inicia automaticamente via `postStartCommand` em http://localhost:8080. Logs em `/tmp/ceialmilk-backend.log`.
- **JWT**: Chaves de desenvolvimento embutidas (`internal/config/dev_jwt.go`) quando `JWT_*` não definidas.
- **Seed operacional**: com `ENV=development`, após migrations o API executa `backend/scripts/seed_dev.sql` (idempotente: lote + animais `DEV-001`…`DEV-005` + lactações ativas). Opt-out: `SEED_DEV=false`. **Não definir `SEED_DEV` em produção** — o runner só dispara quando `ENV=development`.
- **Postman**: Login (`admin@ceialmilk.com` / `password`) → Farms. Base URL: `http://localhost:8080`.

**Última atualização**: 2026-08-25
