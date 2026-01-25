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
- `CORS_ORIGIN` - URL do frontend na Vercel (ex.: `https://ceialmilk.vercel.app`)

#### Obrigatórias e definidas manualmente (`sync: false`)

- `JWT_PRIVATE_KEY` - Chave privada RSA (PEM) para assinar tokens JWT (RS256). **Obrigatória.** Gerar com `openssl` (ver seção "Geração de Chaves JWT") e informar na criação do Blueprint ou no Dashboard do serviço.
- `JWT_PUBLIC_KEY` - Chave pública RSA (PEM) para verificar tokens. **Obrigatória.** Mesmo par da privada; definir no Blueprint ou no Dashboard.

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

### Frontend (Vercel)

- [ ] Repositório conectado na Vercel
- [ ] Root directory configurado para `/frontend`
- [ ] Variável de ambiente `NEXT_PUBLIC_API_URL` configurada
- [ ] Build testado localmente (`npm run build`)
- [ ] Deploy de preview funcionando

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

**Última atualização**: 2026-01-25
**Stack**: Go + Next.js (Render + Vercel)
**Backend Render**: ✅ **Deploy em produção funcionando** - Configuração manual (sem Blueprint) com banco PostgreSQL, variáveis de ambiente e chaves JWT configuradas. Health check e rotas de API operacionais.
