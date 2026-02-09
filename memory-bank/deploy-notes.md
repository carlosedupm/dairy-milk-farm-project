# Notas de Deploy - Ambiente de Produção

## Arquitetura de Deploy

O projeto utiliza uma arquitetura **monorepo** com deploy separado para backend e frontend:

- **Backend (Go)**: Deploy no **Render** via Docker
- **Frontend (Next.js)**: Deploy na **Vercel** (otimizado para Next.js)
- **Banco de Dados**: PostgreSQL gerenciado (Render ou Neon.tech)

## Deploy do Backend (Render)

### Configuração no Render

O arquivo `render.yaml` define:

- **Serviço Web**: Aplicação Docker na branch `main` (`buildFilter: backend/**` — build só em mudanças em `backend/`)
- **Banco de Dados**: PostgreSQL gerenciado (`ceialmilk-db`)
- **Health Check**: `/health` endpoint
- **Auto Deploy**: `autoDeployTrigger: commit` (deploy a cada push na `main`)

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

#### Opcionais (Dev Studio)

- `GEMINI_API_KEY` - Chave da API Gemini (geração de código).
- `GITHUB_TOKEN`, `GITHUB_REPO` - Para PRs automáticos e **contexto da IA** (exemplos + arquivos-alvo) sempre da branch de produção.
- `GITHUB_CONTEXT_BRANCH` - Branch de referência para contexto (default: `main`). Quando GitHub está configurado, a IA usa o estado do repositório nessa branch. Ver `docs/dev-studio/SETUP.md`.

### Migrações de Banco de Dados

**Estratégia**: Migrações executadas automaticamente no startup do servidor Go usando `golang-migrate`.

**Fluxo**:

1. Servidor inicia
2. Verifica versão atual do banco
3. Executa migrações pendentes
4. Inicia servidor HTTP

**Localização**: `/backend/migrations/`

**Formato**: `{version}_{descrição}.up.sql` e `{version}_{descrição}.down.sql` (ex.: `1_add_remaining_tables.up.sql`, `2_add_indexes_to_fazendas.up.sql`, `3_seed_admin.up.sql`, `4_add_refresh_tokens.up.sql`)

### Dockerfile

O `Dockerfile` na **raiz do repositório** é usado pelo Render (`dockerfilePath: ./Dockerfile`, `dockerContext: .`). Utiliza multi-stage build:

1. **Build Stage**: Compila o binário Go
2. **Runtime Stage**: Imagem Alpine mínima com apenas o binário

**Vantagens**:

- Imagem final ~20MB (vs ~200MB do Java)
- Startup instantâneo (< 1 segundo)
- Sem necessidade de JVM ou runtime pesado

## Deploy do Frontend (Vercel)

### Configuração na Vercel

1. **Conectar Repositório**: Vercel detecta automaticamente Next.js
2. **Root Directory**: `/frontend`
3. **Build Command**: Automático (`npm run build`)
4. **Output Directory**: `.next` (automático)

### Variáveis de Ambiente

- `NEXT_PUBLIC_API_URL` - URL do backend no Render (ex: `https://ceialmilk-api.onrender.com`)

### Otimizações Automáticas

A Vercel oferece:

- **CDN Global**: Distribuição automática via CDN
- **Image Optimization**: Otimização automática de imagens
- **Edge Functions**: Execução na edge quando necessário
- **Analytics**: Métricas de performance automáticas

## Conexões Necessárias

### PostgreSQL (Obrigatório)

- **Banco Gerenciado**: `ceialmilk-db` (definido no `render.yaml`)
- **Plano**: `free` (pode ser atualizado conforme necessário)
- **SSL**: Obrigatório (`sslmode=require`)

### Alternativa: Neon.tech

Se preferir usar Neon.tech:

1. Criar banco no Neon.tech
2. Configurar `DATABASE_URL` no Render com a URL do Neon
3. Migrações funcionam da mesma forma

## Checklist de Deploy

### Backend (Render)

- [x] `render.yaml` configurado corretamente
- [x] Build Docker local: `docker build -f Dockerfile .` (e, se possível, `docker run` com `DATABASE_URL`, `PORT`, `JWT_*`, `CORS_ORIGIN`)
- [x] Banco de dados PostgreSQL criado no Render (configuração manual - Blueprint requer plano pago)
- [x] Variáveis de ambiente configuradas:
  - [x] `DATABASE_URL` (configurada manualmente com "Internal Database URL" do banco)
  - [x] `JWT_PRIVATE_KEY` e `JWT_PUBLIC_KEY` — **obrigatórias**, definidas **manualmente** (par RSA gerado com `openssl`)
  - [x] `ENV`, `LOG_LEVEL`, `CORS_ORIGIN` configuradas
  - [x] `PORT` **não** definida — o Render injeta automaticamente
- [x] Health check endpoint funcionando (`/health`)
- [x] Migrações executadas automaticamente no startup
- [x] **Deploy em produção funcionando** ✅

### Frontend (Vercel) — deploy manual via Dashboard

- [x] Repositório conectado na Vercel (Add New → Project)
- [x] Root Directory configurado para `frontend`
- [x] Variável de ambiente `NEXT_PUBLIC_API_URL` = `https://ceialmilk-api.onrender.com` (ou URL do backend)
- [x] Build testado localmente (`npm run build`)
- [x] **Deploy de produção concluído** ✅ — login, validate e CRUD validados no ar (Vercel + Render)

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
5. **Usar HTTPS** sempre (Render e Vercel fornecem automaticamente)

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
- **Postman**: Login (`admin@ceialmilk.com` / `password`) → Farms. Base URL: `http://localhost:8080`.

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

---

**Última atualização**: 2026-02-08 (CORS_ORIGIN usada no WebSocket do Assistente Live)
**Stack**: Go + Next.js (Render + Vercel)
**Backend Render**: ✅ Deploy em produção — PostgreSQL, JWT, CORS, health e API operacionais.
**Frontend Vercel**: ✅ Deploy em produção — login, validate e CRUD validados no ar.
