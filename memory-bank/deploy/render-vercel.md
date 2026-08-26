# Deploy Render + Vercel

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
- **Auto Deploy**: `autoDeployTrigger: checksPass` (deploy só após os checks do GitHub passarem na `main`)

### Gate de deploy (CI → produção)

#### Camada principal (ativa)

**`autoDeployTrigger: checksPass`** no `render.yaml`: o Render aguarda os checks do GitHub (workflow `ci-cd.yml`) concluírem com sucesso no commit da `main` antes de iniciar o deploy do backend. Se o CI falhar, **não há deploy** — mesmo com push direto na `main`.

Fluxo atual (dev solo, projeto em desenvolvimento ativo):

- Push direto na `main` é **permitido** e intencional (velocidade de iteração).
- O CI roda a cada push; falhas geram notificações do GitHub Actions, mas **não bloqueiam** o push.
- Produção no Render só sobe quando o CI daquele commit estiver verde.

#### Ruleset GitHub — `Protect main` (ativa, mínima)

Configurado em **Settings → Rules → Rulesets** (UI atual do GitHub; o caminho antigo “Settings → Branches” pode não aparecer).

| Regra | Estado | Motivo |
|-------|--------|--------|
| Target: **Include default branch** | ✅ Ativo | Cobre a `main` |
| **Block force pushes** | ✅ Ativo | Evita `git push --force` acidental |
| **Restrict deletions** | ✅ Ativo | Evita apagar a branch `main` |
| Require pull request | ❌ Desligado | Push direto na `main` mantido em dev |
| Require status checks | ❌ Desligado | Gate de CI fica no Render (`checksPass`), não no merge |

**Decisão (2026-06-10):** ruleset **completo** (PR obrigatório + todos os status checks) **adiado** até o projeto sair do ritmo de push direto frequente ou entrar mais gente no repo — evita atrito e excesso de e-mails de CI falho sem ganho proporcional nesta fase.

#### Ruleset completo (futuro — opcional)

Quando fizer sentido (time maior, `main` sempre estável, fluxo branch → PR), acrescentar ao ruleset:

- Exigir pull request antes de merge
- Exigir status checks: `Docs - Validate BR references`, `Backend - Lint and Build`, `Frontend - Lint`, `Frontend - Build`, `Backend - Docker build (smoke test)` + `Analyze (go)` e `Analyze (javascript-typescript)` (CodeQL)
- Bypass list com admin do repo para hotfixes de emergência

### Dependabot (`.github/dependabot.yml`)

Configurado para **não acumular PRs** nem abrir majors arriscados automaticamente (decisão 2026-06-10, após fechar PRs pendentes no GitHub).

| Ecossistema | Limite de PRs abertos | O que recebe |
|-------------|----------------------|--------------|
| **gomod** (`/backend`) | 2 | Grupo `go-minor-patch` (minor + patch); **majors ignorados** |
| **npm** (`/frontend`) | 2 | Grupo `npm-minor-patch`; **majors ignorados** (incl. `tailwindcss`, `tailwind-merge`, `lucide-react`, `eslint` ≥ 10) |
| **github-actions** | 3 | Bumps de `actions/*` e CodeQL — costumam ser seguros |

**Fluxo recomendado (dev solo, push direto na `main`):**

1. **Render:** PRs não deployam produção — só push/merge na `main` (com CI verde via `checksPass`).
2. **Vercel:** cada push em branch conectada ao GitHub gera **Preview** por padrão — branches `dependabot/**` enchiam a fila. Bloqueio em `frontend/vercel.json` (`git.deploymentEnabled`: `dependabot/**` → `false`; `main` → `true`).
3. **Fechar** PRs de major breaking sem merge (não afeta produção).
4. **Mergear** PRs de GitHub Actions e grupos patch/minor quando o CI do PR estiver verde.
5. **Security updates** do Dependabot ainda podem abrir PRs fora dessas regras — priorizar merge se `npm audit`/`govulncheck` apontarem CVE.

Para pausar Dependabot temporariamente: `open-pull-requests-limit: 0` no ecossistema desejado.

**Fila Vercel cheia (Dependabot):** no Dashboard → Deployments, cancelar builds `dependabot/*` em **Queued**/**Building**; o deploy de **Production** (`main`) segue na fila — após o `vercel.json` na `main`, novos pushes Dependabot não entram mais. Branches remotas órfãs (`dependabot/*`) podem ser apagadas no GitHub (Settings → branches ou `git push origin --delete <branch>`).

**Erro Dependabot `private_registry_config_not_found` (`npm.pkg.github.com`):** o CeialMilk **não usa** pacotes npm privados do GitHub Packages — só `registry.npmjs.org`. Esse erro aparece quando a conta/org `@carlosedupm` tem npm ligado ao GitHub Packages e o Dependabot tenta resolver credenciais de registry privado. Correção no repo: `frontend/.npmrc` com `registry=https://registry.npmjs.org/`. Se persistir após push: (1) GitHub → Settings da conta/org → Packages → verificar se npm está ligado ao GitHub Packages sem uso neste projeto; (2) **ou** adicionar em `.github/dependabot.yml` um bloco `registries` para `https://npm.pkg.github.com` com secret Dependabot (`packages:read`) — só necessário se passar a consumir pacotes `@carlosedupm/*` privados.


### Graceful shutdown (containers)

O binário `./api` trata **SIGTERM** e **SIGINT** (Render envia SIGTERM ao parar o container):

1. Para de aceitar novas conexões (`http.Server.Shutdown`, timeout **5 segundos**).
2. Flush do Sentry.
3. Fecho do pool PostgreSQL (`defer pool.Close()` no arranque).

Não é necessária configuração extra no `render.yaml` para este comportamento.

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
5. **Preview Dependabot**: `frontend/vercel.json` — `dependabot/**` com `deploymentEnabled: false` (não consome fila nem quota de build); `github.silent: true` reduz checks/comentários do bot em PRs

**Dev solo (opcional no Dashboard):** Settings → Git → desligar **Automatic Preview Deployments** se não usar previews de feature branches — só `main` em produção.


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

