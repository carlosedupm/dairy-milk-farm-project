# Runbook rápido de deploy

Detalhe operacional completo: [`docs/ops/runbook.md`](../../docs/ops/runbook.md).

## Comandos Úteis

### Backend

```bash
# Build local
cd backend
go build -o bin/api ./cmd/api

# Build Docker (validar antes do deploy no Render; usa Dockerfile na raiz)
docker build -f Dockerfile .

# Testar localmente (migrações rodam no startup)
./bin/api
# ou: go run ./cmd/api
```

### Frontend

```bash
# Desenvolvimento local
cd frontend
npm run dev

# Build de produção
npm run build

# Preview de produção
npm run start
```

### Verificação de Deploy

```bash
# Verificar health do backend
curl https://ceialmilk-api.onrender.com/health

# Verificar API
curl https://ceialmilk-api.onrender.com/api/v1/fazendas
```

**Frontend (após deploy na Vercel)**:

1. Abrir a URL de produção (ex.: `https://dairy-milk-farm-project.vercel.app`).
2. Acessar `/login` e fazer login (`admin@ceialmilk.com` / `password`).
3. Navegar para `/fazendas`, listar, criar e editar uma fazenda para validar integração com a API.

### PWA (instalação em produção)

Para o banner "Instale o CeialMilk" e a opção de instalação funcionarem em produção (Chrome/Edge):

- **Manifest, SW e ícones via Route Handlers**: Na Vercel com Root Directory `frontend`, arquivos em `public/` podem retornar 404. Por isso o manifest, o service worker e os ícones são servidos por **Route Handlers** do App Router (`/manifest.json`, `/sw.js`, `/icons/icon-192.svg`, `/icons/icon-512.svg`), garantindo resposta 200 em produção.
- **Service worker**: Registrado cedo via `ServiceWorkerRegistration` (em `Providers`) e também no `PWAInstallPrompt`.
- Se o botão "Instalar" não disparar o prompt nativo, o dialog mostra instruções manuais (menu do navegador → "Instalar aplicativo" / "Adicionar à tela inicial"). A opção no menu só aparece quando os [critérios de instalabilidade](https://developer.chrome.com/blog/update-install-criteria) do Chrome são atendidos (HTTPS, manifest válido, SW registrado com fetch).

### Web Push (alertas CRÍTICA/ALTA)

Variáveis obrigatórias no **backend (Render)** para push em produção:

| Variável | Descrição |
|----------|-----------|
| `VAPID_PUBLIC_KEY` | Chave pública VAPID (base64url) |
| `VAPID_PRIVATE_KEY` | Chave privada VAPID |
| `VAPID_SUBJECT` | Contact URI (ex.: `mailto:suporte@ceialmilk.com`) |

Gerar par de chaves (local):

```bash
npx web-push generate-vapid-keys
```

- Migration **33**: `push_subscriptions`, `usuarios.fazenda_ativa_id`.
- Sem `VAPID_*` configuradas, o backend sobe normalmente mas push fica desabilitado (log warn); o banner de permissão no frontend não aparece.
- **Safari/iOS**: Web Push exige PWA instalado (iOS 16.4+); fora do escopo DoD atual (Chrome/Firefox desktop + Android).

## Segurança

### Credenciais

- ✅ **Credenciais hardcoded removidas** do código
- ✅ Todas as credenciais vêm de variáveis de ambiente
- ✅ Chaves JWT geradas e armazenadas de forma segura
- ✅ Senha do banco gerenciada automaticamente pelo Render

### Recomendações

1. **Nunca commitar credenciais** no código
2. **Usar sempre variáveis de ambiente** para informações sensíveis
3. **Rotacionar chaves JWT** periodicamente em produção
4. **Configurar backups automáticos** do banco de dados

## Troubleshooting

### Problema: Backend não conecta ao banco

**Sintomas**:

- Erro de conexão no startup
- Health check falha

**Solução**:

1. Verificar `DATABASE_URL` no Render Dashboard
2. Verificar se banco está ativo
3. Verificar logs do container no Render
4. Testar conexão localmente com as mesmas credenciais
5. Se usar conexão **externa** ao Postgres (ex.: Neon.tech), adicionar `?sslmode=require` à URL se necessário. A conexão **interna** (`fromDatabase`) geralmente não exige.

### Problema: Migrações falham

**Sintomas**:

- Erro ao executar migrações no startup

**Solução**:

1. Verificar logs do servidor no startup
2. Verificar se arquivos de migração estão corretos
3. Verificar permissões do usuário do banco
4. Executar migrações manualmente para debug

### Problema: Frontend não conecta ao backend

**Sintomas**:

- Erro CORS
- 404 ao chamar API

**Solução**:

1. Verificar `NEXT_PUBLIC_API_URL` na Vercel
2. Verificar CORS configurado no backend
3. Verificar se backend está online
4. Verificar logs do browser (F12 → Console)

### Problema: 404 ao fazer login (ou 503 com "service_unavailable")

**Sintomas**: Ao submeter o formulário de login, a requisição retorna 404 (ou 503 após a alteração que retorna 503 em modo degradado).

**Causas possíveis**:

1. **Backend em modo degradado**: As rotas `/api/auth/*` só são registradas quando DATABASE_URL está definida, a conexão com o banco funciona, as migrações rodam e as chaves JWT estão configuradas. Se algum desses falhar, apenas `/health` (e `/metrics`) ficam disponíveis; requisições a `/api/auth/login` passam a retornar **503** com corpo `{"error":"service_unavailable","message":"..."}` em vez de 404.
2. **URL do backend errada**: Em produção, `NEXT_PUBLIC_API_URL` no frontend (Vercel) deve apontar para a URL do backend (ex.: `https://ceialmilk-api.onrender.com`). Se estiver vazia ou incorreta, o login pode ir para outro host e retornar 404.

**Solução**:

1. Verificar logs do backend ao subir: se aparecer "apenas /health disponível", conferir DATABASE_URL, conexão com o banco, migrações e (em produção) JWT_PRIVATE_KEY e JWT_PUBLIC_KEY.
2. Em desenvolvimento local: garantir que o backend está rodando (ex.: `go run ./cmd/api`) e que `NEXT_PUBLIC_API_URL` (ou o fallback) aponta para onde o backend escuta (ex.: `http://localhost:8080`).
3. Em produção: conferir `NEXT_PUBLIC_API_URL` na Vercel e variáveis do backend no Render (DATABASE*URL, JWT*\*).

### Problema: "Falha ao executar migrações" ou "Dirty database version N"

**Sintomas**: Logs mostram "Falha ao executar migrações; apenas /health disponível" (ex.: `null value in column "fazenda_id"` na migração 11, ou "Dirty database version 11. Fix and force version."). A API fica em modo degradado (503 em /api/\*).

**Causas**:

- Migração 11 (usuarios_fazendas) tentava vincular ADMIN/DEVELOPER à primeira fazenda; se não houver nenhuma fazenda no banco, o seed falhava. Isso foi corrigido (seed só roda se existir ao menos uma fazenda).
- Se uma migração falhou no meio, o golang-migrate marca o banco como "dirty" e não tenta rodar migrações de novo até ser corrigido.

**Solução**:

1. **Limpar estado dirty**: Com a ferramenta `migrate` (golang-migrate), forçar a versão para a migração anterior à que falhou (ex.: 10) para limpar o dirty e permitir nova tentativa:
   ```bash
   migrate -path backend/migrations -database "$DATABASE_URL" force 10
   ```
2. Reiniciar o backend. Na próxima subida, a migração 11 rodará de novo (agora com o seed que não falha quando não há fazendas).
3. Se o banco estiver zerado e você quiser ter uma fazenda para o seed da 11 vincular: criar uma fazenda (via API após as migrações rodarem, ou inserir manualmente) ou garantir que alguma migração/seed anterior crie ao menos uma fazenda antes da 11.

### Problema: 401 em `/api/auth/validate` após login (produção)

**Sintomas**: Login parece OK, mas ao validar sessão ou acessar rotas protegidas retorna 401.

**Causa**: Frontend (Vercel) e backend (Render) estão em origens diferentes. Cookies com `SameSite=Strict` não são enviados em requisições cross-origin.

**Solução**:

1. Garantir que `CORS_ORIGIN` no Render seja a URL **exata** do frontend (ex.: `https://ceialmilk.vercel.app`). O backend usa `SameSite=None` nos cookies quando `CORS_ORIGIN` não contém `localhost`.
2. Fazer **redeploy** do backend no Render após alterar `CORS_ORIGIN`.
3. Confirmar que o frontend usa `withCredentials: true` nas chamadas à API (já configurado no `api.ts`).

### Problema: Health check falha

**Solução**:

1. Verificar se servidor está rodando: `curl https://ceialmilk-api.onrender.com/health`
2. Verificar logs da aplicação no dashboard do Render
3. Verificar se banco de dados está acessível
4. Verificar se todas as variáveis de ambiente estão configuradas

## Comandos de Desenvolvimento (atualizados)

### Backend

```bash
cd backend
go build -o bin/api ./cmd/api   # build
go run ./cmd/api                # run (migrações rodam no startup)
```

As migrações são executadas **automaticamente no startup** do servidor (golang-migrate). Não há comando `cmd/migrate` separado.

### Problema: Login 404 ou backend só com /health (devcontainer)

Com a configuração atual (Postgres **trust** + **tmpfs**), isso não deve ocorrer. Se ocorrer:

- Confira os logs do backend: `cat /tmp/ceialmilk-backend.log`.
- Reinicie o backend: `pkill -f 'go run ./cmd/api'`; depois `nohup bash -c 'cd /workspace/backend && go run ./cmd/api' > /tmp/ceialmilk-backend.log 2>&1 &`.

Os scripts `scripts/fix-pg-hba-now.sh` e `scripts/ensure-ceialmilk-db.sh` são apenas para setups manuais (ex.: Postgres com volume persistente no host).

### Migration 26 — classificação operacional de toques

- **Arquivo**: `backend/migrations/26_add_classificacao_operacional_toques.up.sql`
- **Efeito**: coluna `classificacao_operacional` em `diagnosticos_gestacao` (valores `PRENHA`, `VAZIA`, `VAZIA_PEV`, `CLOE`, `CL`, `RETOQUE`).
- **Deploy**: migração roda no startup do backend (golang-migrate); sem variáveis de ambiente adicionais.
- **Rollback**: `.down.sql` remove a coluna (apenas se necessário em ambiente de teste).

### Assistente Live — microfone no frontend (dev e Vercel)

- O header `Permissions-Policy` em `frontend/next.config.js` deve incluir `microphone=(self)` para o assistente por voz. Com `microphone=()`, o Chrome pode mostrar permissão **ligada** no cadeado e mesmo assim bloquear `getUserMedia` / Speech Recognition.
- Após alterar `next.config.js`, **reinicie** `npm run dev` (headers não atualizam só com hot reload).

---

Runbook de operações (rollback, dirty migration, incidentes): **`docs/ops/runbook.md`**; checklist pré-deploy: **`docs/ops/security-checklist.md`**.

**Última atualização**: 2026-06-28 (Dependabot: `frontend/.npmrc` registry público; troubleshooting `npm.pkg.github.com`)
**Stack**: Go + Next.js (Render + Vercel)
**Backend Render**: ✅ Deploy em produção — PostgreSQL, JWT, CORS, health e API operacionais.
**Frontend Vercel**: ✅ Deploy em produção — login, validate e CRUD validados no ar.
