# Padrões de segurança

**Autenticação**

- **JWT RS256**: Tokens assinados com chave privada, verificados com chave pública
- **Access Tokens**: Vida curta (15 minutos), armazenados em cookies HttpOnly
- **Refresh Tokens**: Vida longa (7 dias), em cookies HttpOnly; no banco fica apenas o **hash SHA-256** (`refresh_token_service.go`), nunca o token em claro
- **Rotação de refresh token**: cada `POST /api/auth/refresh` revoga o token usado e emite um novo (`RefreshTokenService.Rotate`) — token roubado expira no primeiro uso legítimo
- **Tokens fora do JSON**: login/refresh **não** retornam `access_token`/`refresh_token` no corpo; somente cookies HttpOnly (reduz superfície XSS)
- **Password Hashing**: BCrypt com custo 10; senha mínima **8 caracteres** validada front+back (BR-ACESSO-024)
- **Token Refresh**: Endpoint `/api/auth/refresh` para renovar access tokens usando refresh tokens
- **Bootstrap de sessão (frontend)**: `AuthContext` usa `authService.ensureSession()` (`validate` → se 401, `refresh` → `validate`) no mount e ao voltar ao app (`visibilitychange`). Evita forçar login quando o access (15 min) expirou mas o refresh (7 dias) ainda é válido — crítico na ordenha com pausas entre vacas. O interceptor Axios em `services/api.ts` continua a renovar em 401 nas chamadas de API.
- **Navegação com reload (frontend)**: quando for preciso reiniciar estado em memória (logout, 401 após refresh falho, redirects pós-login/fazenda), usar `hardNavigate` em `lib/navigation.ts` (URL absoluta via `new URL`) em vez de `window.location.href = '/…'` — evita a regra ESLint `@next/next/no-location-assign-relative-destination` (Next 16.3+). Para navegação in-app sem reload, preferir `useRouter().push/replace`.
- **Modo ordenha (BR-PRODUCAO-008)**: UI `/producao/ordenha` — sessão cliente (`sessionStorage`); turno Manhã/Tarde classificado por `data_hora` (`lib/ordenha-turno.ts`); `POST /producao` unitário sem `data_hora` (servidor = now); bloqueio de duplicata no turno só nesta UI; badge restrição via `restricoes-leite/ativas`.

### **Autorização**

- **Role-Based**: Controle de acesso baseado em roles (`USER`, `FUNCIONARIO`, `GERENTE`, `GESTAO`, `PROPRIETARIO`, `ADMIN`, `DEVELOPER`)
- **USER**: Perfil **pendente de provisão** após registo público: na UI só rotas utilitárias (`/`, `/onboarding`, `/fazendas`, `/fazendas/selecionar/*`) até ter fazenda e perfil adequados. **Não** cria fazenda via `POST /api/v1/me/fazendas` (bloqueado em `requestAllowedForUser` e no serviço). Na API, `RequirePerfilAPIAccess` permite `GET /api/v1/me` e prefixo `/api/v1/me/` com exceção explícita desse `POST`; demais `/api/v1/*` retornam 403 enquanto `perfil` for `USER`.
- **PROPRIETARIO**: Titular da exploração; acesso operacional completo na UI alinhado a `GERENTE`/`GESTAO` para navegação, **sempre** filtrado por `usuarios_fazendas`. Não acede a `/api/v1/admin/*` nem à listagem global de fazendas.
- **FUNCIONARIO**: Pode acessar a home (`/`), visualizar Folgas da fazenda vinculada e registrar **justificativa** apenas no próprio dia de folga (`POST .../folgas/justificativas`); também acessa Gestão parcial (Cios/Coberturas/Partos/Secagens) e Animais em modo consulta; na home pode **registrar** restrição de leite (`POST .../restricoes-leite`) e listar ativas, mas **não** liberar após laboratório (`PATCH .../liberar` → 403). Em saúde animal: `GET|POST` em `/api/v1/animais/:id/saude` (`funcionarioAnimaisSaudePath`); `PUT|DELETE` → 403. Em vacinas: `GET` + `POST` (só aplicada — sem `data_aplicacao` → 403 no service) + `PATCH .../aplicar` (`funcionarioAnimaisVacinasPath`); `PUT|DELETE` → 403 (BR-ACESSO-022). Escritas genéricas de Animais seguem bloqueadas por matriz configurável (ver abaixo).
- **GESTAO**: Pode **configurar**, **gerar** e **alterar** escala de folgas (`RequireGestaoFolgas` inclui `PROPRIETARIO` e `GERENTE`), com **atalho sem vínculo** a qualquer fazenda existente apenas para **GESTAO**, **ADMIN** e **DEVELOPER** (`PodeAcessarFazendaSemVinculoGestao` em `ValidateFazendaAccessOrGestao` e `validarAcessoFazenda`).
- **GERENTE**: Gere escala de folgas nas fazendas **vinculadas**; **não** utiliza atalho sem vínculo (isolamento por fazenda).
- **ADMIN**: Perfil para acesso à área administrativa (`/api/v1/admin/*`); requer `auth.RequireAdmin()` (ADMIN ou DEVELOPER).
- **DEVELOPER**: Perfil único no sistema (constraint no banco garante 1 apenas); acesso ao Dev Studio (`/api/v1/dev-studio/*`) e área Admin; requer `auth.RequireDeveloper()` para Dev Studio, `auth.RequireAdmin()` para Admin.
- **Resource Ownership**: Verificação de propriedade de recursos
- **Middleware de Autenticação**: Verificação de token em todas as rotas protegidas
- **Frontend (controle por perfil)**:
  - **USER**: modo `pending` em `appAccess.ts` — sem módulos operacionais nem assistente até elevação de perfil; `/fazendas` como gateway (onboarding/seleção); **sem** `/fazendas/criar-minha` na whitelist.
  - **ADMIN/DEVELOPER**: acesso completo às páginas de fazendas (listar/detalhar/criar/editar); em **`/folgas`** a fazenda efetiva vem das **fazendas vinculadas** (`GET /api/v1/me/fazendas` / `useMinhasFazendas`): uma única → sem seletor na página; várias → seletor na página + `setFazendaAtiva` (alinhado ao `FazendaSelector` no header).
  - **PROPRIETARIO** / **GERENTE** / **GESTAO**: em `/folgas`, uso de fazendas vinculadas + seletor quando aplicável; **PROPRIETARIO** e **GERENTE** sem listagem global de fazendas.
  - **FUNCIONARIO**: acesso a `/`, `/folgas`, Gestão parcial (`/gestao/cios*`, `/gestao/coberturas*`, `/gestao/partos*`, `/gestao/secagens*`) e Animais em consulta (`/animais`, `/animais/:id`); UI oculta ações de criar/editar/excluir em Animais e rotas fora da whitelist são redirecionadas pelo `RouteAccessGuard`.

### **Matriz de acesso por perfil (configurável)**

- **Frontend**: `frontend/src/config/appAccess.ts` — mapa `PERFIL_AREAS` (FUNCIONARIO com `animais`, `gestao`, `folgas`); modo **`pending`** para `USER` (sem áreas de menu, caminhos mínimos: `/` e `/fazendas`, sem criar-minha). `isPathAllowedForPerfil` inclui whitelist para FUNCIONARIO e para USER (`/`, `/fazendas`, utilitários). Helpers: `getNavAreasForPerfil`, `getDefaultLandingPath`, `showAssistenteForPerfil`. `RouteAccessGuard` (`Providers.tsx`) redireciona utilizadores autenticados quando a rota não está autorizada. Rotas utilitárias: `/login`, `/registro`, `/onboarding`, `/fazendas/selecionar`.
- **Backend**: `backend/internal/auth/perfil_access.go` — `PerfilTemAcessoAPICompleta` é falso para **FUNCIONARIO** e **USER**. `RequirePerfilAPIAccess()` aplica whitelist: para **USER**, `GET /api/v1/me` e prefixo `/api/v1/me/`; para **FUNCIONARIO**, conjunto documentado em `requestAllowedForFuncionario` (incl. `GET /api/v1/me`, folgas, restricões de leite, animais GET, gestão, etc.); demais endpoints retornam 403. Manter regras alinhadas ao TypeScript.

### **Pós-login (resolução de destino por perfil)**

- **Frontend**: `frontend/src/app/login/page.tsx` (`resolvePostLoginTarget` + `maybeRedirectToOnboarding`):
  - `?redirect=` é honrado **apenas** quando passa em `isPathAllowedForPerfil`.
  - **`USER`**: `getAreasMode === 'pending'` → destino padrão `/onboarding` (aguarda vínculos e perfil operacional).
  - Perfis com **acesso pleno** (`getAreasMode === 'full'`: **GERENTE**, **GESTAO**, **PROPRIETARIO**, **ADMIN**, **DEVELOPER**) seguem o fluxo legado por `/fazendas`, que decide entre `/`, `/onboarding` e `/fazendas/selecionar` conforme vínculos.
  - Perfis com **áreas restritas** (ex.: FUNCIONARIO: lista explícita em `PERFIL_AREAS`) vão direto para `getDefaultLandingPath(perfil)` (FUNCIONARIO → `/`). Antes de redirecionar, é feita uma pré-checagem: se `getMinhasFazendas()` devolver 0, vai direto para `/onboarding`, evitando o flash `landing → onboarding`. Falhas da pré-checagem caem no fluxo padrão.
- **Defesa em segunda camada**: a página `/folgas` (via `useFolgasPage`) também observa `semFazendaVinculada` (`fazendaContextReady && !loadingMinhasFazendas && minhasFazendas.length === 0`) e dispara `router.replace("/onboarding")`, cobrindo casos como refresh com vínculo removido no meio da sessão.
- `AuthContext.login` retorna `User | null` para que o caller possa decidir o destino imediatamente, sem aguardar re-render.

### **Proteção**

- **CORS**: Configurado estritamente para domínio da Vercel
- **Rate limiting**:
  - **Auth (público, por IP)**: `middleware/auth_rate_limit.go` em `POST /api/auth/login`, `/register`, `/refresh`, `/logout` (2× refresh) e `/validate` (20× refresh — chamado em cada carga de página). Defaults: login 10/15 min, registo 5/h, refresh 30/h. Env: `AUTH_LOGIN_RATE_LIMIT`, `AUTH_LOGIN_RATE_WINDOW_MINUTES`, `AUTH_REGISTER_RATE_LIMIT`, `AUTH_REFRESH_RATE_LIMIT`. Resposta **429** + header `Retry-After`; frontend trata em `frontend/src/lib/errors.ts`.
  - **Dev Studio**: 5 req/h por `user_id` — `middleware/rate_limit.go` (`DevStudioRateLimit`).
  - **Integrações M2M**: por `client_id` — `middleware/integration_rate_limit.go` + `INTEGRATION_RATE_LIMIT_PER_HOUR`.
  - **Produção (Render)**: `SetTrustedProxies` restrito a **ranges privados** (RFC1918 + loopback; LB do Render) — confiar em `0.0.0.0/0` permitiria spoof de IP no rate limit. Override via env `TRUSTED_PROXIES` (CSV de CIDRs).
- **Security headers HTTP**:
  - **Backend**: `middleware/security_headers.go` global — `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`; **HSTS** só com `ENV=production`. Swagger `/api/v1/integracoes/docs` com **CSP própria** (restrita a unpkg + inline) em `integracoes_docs.go`.
  - **Frontend**: `frontend/next.config.js` — headers básicos em `/:path*` + **CSP em `Content-Security-Policy-Report-Only`** (observar violações antes de tornar bloqueante; `connect-src` inclui API http/ws via `NEXT_PUBLIC_API_URL`).
- **Erros 500 sanitizados**: `response.ErrorInternal` **loga** os detalhes (slog com método/path) e responde apenas mensagem genérica — nunca enviar `err.Error()` ao cliente.
- **Redirects seguros**: destino de redirect só é honrado se `isSafeInternalPath` (path interno, sem `//`, sem `\`, sem URL absoluta) — login (`?redirect=`) e redirect do assistente Live (`appAccess.ts`).
- **Proxy Next 16**: `frontend/src/proxy.ts` checa presença do cookie `ceialmilk_token`/refresh em rotas protegidas e redireciona para `/login`. **Sem validação de JWT** (camada leve; validação real no backend). Só atua quando o cookie é visível ao frontend (same-site, ex.: dev localhost); em produção cross-domain (Vercel+Render) passa direto e a proteção fica no client + backend.
- **`/metrics` protegido**: em produção exige `Authorization: Bearer <METRICS_TOKEN>`; sem token configurado → 404 (`metricsAuthMiddleware` em `cmd/api/main.go`).
- **Isolamento multi-tenant (BR-ACESSO-023)**: toda listagem/ação valida vínculo via `ResolveFazendaIDsForList`/`ValidateFazendaAccess`; Assistente (texto e Live) usa resolvers com validação de tenant (`ensureAnimalAccess`, `resolveFazendaIDForUser`) e responde "não encontrado" genérico para recursos de outras fazendas.
- **Graceful shutdown**: `SIGINT`/`SIGTERM` → `http.Server.Shutdown` (timeout 5s) + flush Sentry + `defer pool.Close()` — `cmd/api/main.go`.
- **Input Validation**: Validação em todas as entradas (struct tags)
- **SQL Injection**: Prevenido com prepared statements
- **XSS**: Prevenido com sanitização no frontend

### **Armazenamento de Tokens**

- **HttpOnly Cookies**: Tokens armazenados em cookies HttpOnly (não acessíveis via JavaScript)
  - `ceialmilk_token`: Access token (15 minutos)
  - `ceialmilk_refresh_token`: Refresh token (7 dias)
- **Secure Flag**: Cookies enviados apenas via HTTPS em produção (detectado automaticamente)
- **SameSite**: `SameSite=Strict` em dev (CORS localhost); `SameSite=None` em produção cross-origin (frontend Vercel ↔ backend Render), para que o navegador envie cookies em requisições cross-origin
- **Frontend**: Usa `withCredentials: true` no Axios para enviar cookies automaticamente

### **Rastreabilidade (`created_by`)**

Contrato para «quem registrou» no domínio (detalhe em `docs/business/auditoria.md`):

1. **Nunca** incluir `created_by` em structs de request (`CreateAnimalRequest`, payloads do assistente, DTOs M2M de integração).
2. **Sempre** definir `CreatedBy` no **call site** antes de `service.Create`: handlers HTTP (`GetActorUserID` + `SetCreatedBy` em `access_helper.go`), assistente (`userID` do JWT em `Executar` / `ExecuteFunction`), criação derivada (ex.: bezerra no parto herda `parto.CreatedBy`).
3. **Integrações M2M**: API key `cmk_live_*` → `IntegrationAuthMiddleware` define `user_id` = `actor_user_id` (utilizador `INTEGRACAO`); `GetActorUserID` reutilizado nos handlers de integração; ver `docs/business/integracoes.md`.
4. **Services** persistem o valor já presente no model; não leem `created_by` do body. Logs com `X-Correlation-ID` são suporte técnico; fonte de verdade de negócio = coluna na entidade.

Migrations: `23` (ciclo/leite), `24` (`animais.created_by`), `25` (`integracao_*`).

### **Integrações M2M (API externa)**

- **Autenticação**: `Authorization: Bearer cmk_live_...` — middleware em `backend/internal/auth/integration.go`; **não** usa `RequirePerfilAPIAccess`.
- **Autorização**: scopes (`animais:read`, `toques:write`, `coberturas:read`, `coberturas:write`, `saude:read`, `saude:write`, `alertas:read`) + `ValidateFazendaIntegracao` em `handlers/access_helper.go`.
- **Rotas**: `/api/v1/integracoes/*` — reutilizam `DiagnosticoGestacaoService`, `AnimalService`, `CoberturaService`, `AnimalSaudeService`, `AlertaService`.
- **Idempotência**: header `Idempotency-Key` + tabela `integracao_idempotencia` (`IntegracaoService.CheckIdempotency`).
- **Auditoria técnica**: `integracao_chamadas` via `middleware/integration_audit.go`.
- **Rate limit**: `INTEGRATION_RATE_LIMIT_PER_HOUR` (default 300) — `middleware/integration_rate_limit.go`.
- **Admin**: `/api/v1/admin/integracoes` + UI `/admin/integracoes`; guia em `docs/integracoes/README.md`.
- **OpenAPI (só M2M)**: spec estática OpenAPI 3.0 em `backend/internal/openapi/integracoes-v1.openapi.yaml` (`go:embed`); rotas **públicas** (sem API key): `GET /api/v1/integracoes/openapi.yaml`, `GET /api/v1/integracoes/docs` (Swagger UI), `GET /api/v1/integracoes/swagger` → redirect; registo em `internal/openapi/integracoes_docs.go` no arranque do router (independente do middleware M2M). Cópia em `docs/openapi/integracoes-v1.openapi.yaml`.

