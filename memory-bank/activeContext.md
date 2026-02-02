# 🚀 Active Context - CeialMilk

## 📋 Estado Atual do Projeto

### **Status Geral**

O projeto está em **migração arquitetural** da stack Java/Spring para uma solução moderna e eficiente com **Go** no backend e **Next.js** no frontend. Esta mudança visa resolver problemas de consumo de recursos, complexidade de deploy e melhorar a experiência de desenvolvimento.

### ✅ O que está funcionando:

- **Backend Go**: API com Gin, health, auth (login/logout/refresh/validate) e CRUD + search de fazendas
- **Autenticação**: JWT RS256, middleware, bcrypt; refresh tokens no banco; cookies HttpOnly (SameSite=Strict em dev, SameSite=None em produção cross-origin Vercel+Render)
- **Formato de Resposta**: Padronizado com `data`, `message`, `timestamp` em todas as respostas
- **Formato de Erro**: Padronizado com `error.code`, `error.message`, `error.details`, `timestamp`
- **Observabilidade**:
  - Correlation IDs automáticos para cada request (UUID)
  - Logging estruturado JSON com correlation IDs, método, path, status, latency
  - Sentry integrado para captura de erros e panics
  - Middleware de logging automático para todas as requisições
- **Migrações**: golang-migrate no startup; seed do usuário admin (V3); refresh tokens (V4); Dev Studio (V5, V6); constraint unicidade DEVELOPER (V8); vínculo usuário–fazenda (V11 – tabela usuarios_fazendas)
- **Postman**: Rotas compatíveis com a collection (`/api/auth/*`, `/api/v1/fazendas/*`)
- **Frontend + Backend**: Integração validada — login, listagem, criar/editar/excluir fazendas (dev e **produção** Vercel + Render)
- **Devcontainer**: `DATABASE_URL` e `PORT` pré-configurados; backend via `go run ./cmd/api`
- **Resiliência**: Se o Postgres falhar (ex.: pg_hba), o backend sobe e expõe apenas `GET /health`; auth/fazendas ficam inativos até o DB estar ok
- **Postgres no compose**: `scripts/db/init-pg-hba.sh` + `ssl=off` para aceitar conexões do devcontainer (após recriar o volume)
- **Dev Studio (Fase 0 + Fase 1 + Fase 2 + Fase 3)**: Área de desenvolvimento interativa com IA integrada — geração de código via Gemini API, validação sintática, preview, histórico, criação automática de PRs via GitHub API, **RAG dinâmico** (seleção de contexto por palavras-chave), **monitoramento** (GET /usage, alertas de limite, tratamento 429), **Refinar** (feedback para corrigir divergências) e **exemplos de código** (handler/service/repository/model/response de Fazenda) sempre incluídos no contexto da IA. **Contexto tipo Cursor**: quando o prompt indica edição de menu/UI (ex.: "menu", "Header", "rota", "link", "dev-studio"), o backend inclui o **estado atual** dos arquivos-alvo (ex.: `Header.tsx`, `layout.tsx`) e instruções para **editar em cima do existente** e **preservar** o que não foi pedido para alterar. **Contexto sempre do repositório**: quando `GITHUB_TOKEN` e `GITHUB_REPO` estão configurados, **exemplos** e **arquivos-alvo** são sempre buscados da **branch de produção** (`GITHUB_CONTEXT_BRANCH`, default `main`) no GitHub, pois o resultado aprovado irá para lá (PR → merge). **Diff Viewer**: visualização de diferenças entre código gerado e código atual no repositório (comparação linha por linha). **Linter Automático**: validação sintática e de lint para Go e TypeScript com exibição de erros e avisos. **Cancelamento de Requisições**: funcionalidade para cancelar requisições geradas (status "cancelled"), com dialog de confirmação moderno (Shadcn/UI) e atualização automática do histórico.
- **Assistente em linguagem natural (com contexto)**: Usuário pode escrever ou falar a necessidade (fazendas: cadastrar, listar, buscar, editar, excluir; **animais**: consultar quantidade por fazenda, listar por fazenda, detalhar, **cadastrar animal** (ex.: "cadastrar vaca Vaca 01 na fazenda Larissa"), **editar animal** (ex.: "alterar raça do animal X"), **excluir animal**, **registrar produção de leite** (ex.: "registrar 15 litros do animal Vaca 01")); sistema interpreta com Gemini (intent + payload) **com contexto do usuário logado** (nome, perfil) e **contexto do sistema** (lista de fazendas com id e nome) injetados no prompt, para desambiguar e respostas naturais ("você tem N fazendas: …"). Backend: `Interpretar(ctx, texto, userID, perfil, nomeUsuario)`; handler obtém user_id/perfil do auth e nome via UsuarioRepository; AssistenteService chama FazendaService.GetAll e monta seção dinâmica no prompt. `POST /api/v1/assistente/interpretar`, `POST /api/v1/assistente/executar` (requer GEMINI_API_KEY). Frontend: assistente **apenas no Header** (botão "Assistente" que abre Dialog com AssistenteInput), acessível em qualquer página. Dialog de confirmação (Shadcn), entrada por voz (Web Speech API, pt-BR) com botão de microfone. **Voz**: desktop usa modo contínuo (`continuous: true`); **Chrome Android** usa `continuous: false` + pre-warm com `getUserMedia` (workaround para falhas de interpretação — a Web Speech API no Android tem suporte limitado). Finalização por clique no microfone ou timeout de silêncio (2,5 s). **Retorno em voz (TTS)**: quando a entrada foi por voz, o sistema anuncia o resumo, erro ou sucesso. **Confirmação por voz**: no dialog de confirmação, o usuário pode dizer "sim"/"não" por voz. Recurso opcional; melhor experiência online.
- **Módulo Administrador**: Área admin (`/admin/usuarios`) para ADMIN e DEVELOPER — listagem, criar, editar e ativar/desativar usuários. Perfis USER, ADMIN, DEVELOPER; constraint de unicidade para DEVELOPER no banco. Rotas `GET/POST /api/v1/admin/usuarios`, `PUT /api/v1/admin/usuarios/:id`, `PATCH /api/v1/admin/usuarios/:id/toggle-enabled`, `GET/PUT /api/v1/admin/usuarios/:id/fazendas`. Perfil DEVELOPER não atribuível via API. **Fazendas vinculadas**: somente ADMIN (ou DEVELOPER) pode atribuir quais fazendas cada usuário acessa, na tela de edição de usuário (seção "Fazendas vinculadas" com checkboxes + "Salvar vínculos"). **Perfil não editável**: ao editar um usuário com perfil ADMIN ou DEVELOPER, o campo perfil é somente leitura (frontend e backend preservam o perfil).
- **Vínculo usuário–fazenda e fazenda única**: Tabela `usuarios_fazendas` (N:N). Endpoint `GET /api/v1/me/fazendas` retorna as fazendas vinculadas ao usuário logado. Quando o usuário tem **apenas uma fazenda** vinculada: formulários de novo animal e nova produção usam essa fazenda automaticamente (seletor de fazenda oculto); atalhos da home ("Ver fazendas", "Ver animais") apontam diretamente para essa fazenda. Admin atribui fazendas a usuários na edição de usuário.

### 🚧 Em andamento:

- Nenhum item em andamento no momento

### ✅ Concluído desde a última atualização:

1. ✅ **Vínculo usuário–fazenda e fazenda única automática**: Migração `11_usuarios_fazendas` (tabela N:N + seed para ADMIN/DEVELOPER). Backend: `GetFazendasByUsuarioID`, `GetFazendaIDsByUsuarioID`, `SetFazendasForUsuario`; `GET /api/v1/me/fazendas`; `GET/PUT /api/v1/admin/usuarios/:id/fazendas`. UsuarioService.Update não altera perfil quando o usuário existente é ADMIN ou DEVELOPER. Frontend: `getMinhasFazendas()`, hook `useMinhasFazendas`; AnimalForm/ProducaoForm com `fazendaUnicaId` (ocultam seletor quando uma fazenda); páginas animais/novo e producao/novo usam fazenda única; home atalhos para `/fazendas/[id]` e `/fazendas/[id]/animais` quando uma fazenda; admin editar usuário com seção "Fazendas vinculadas" (checkboxes + Salvar vínculos) e perfil somente leitura para ADMIN/DEVELOPER.
2. ✅ **Quantidade de animais computada em Fazendas**: A informação de quantidade de animais passou a ser derivada do count de animais cadastrados na fazenda (tabela `animais`), não mais editável. Backend: removido `QuantidadeVacas` dos requests Create/Update; repositório usa subquery `(SELECT COUNT(*) FROM animais WHERE fazenda_id = f.id)` em GetByID, GetAll, search, SearchByVacasMin e SearchByVacasRange; Update não altera mais a coluna `quantidade_vacas`. Frontend: removido campo "Quantidade de vacas" do FazendaForm; removido `quantidadeVacas` de FazendaCreate/FazendaUpdate. FazendaTable continua exibindo `quantidade_vacas` (read-only vindo da API).
3. ✅ **Assistente – operações completas para animais**: Novas intents **cadastrar_animal** (fazenda + identificação + raça, sexo, data_nascimento, status_saude), **editar_animal** (id ou identificação + campos a alterar), **excluir_animal** (id ou identificação), **registrar_producao_animal** (animal + quantidade em litros + data_hora/qualidade opcionais). Backend: AssistenteService com ProducaoService; resolveAnimalByPayload; executarCadastrarAnimal, executarEditarAnimal, executarExcluirAnimal, executarRegistrarProducaoAnimal; cadastrar/editar retornam { message, animal } para redirect; ErrAnimalIdentificacaoDuplicada no handler. Frontend: getRedirectPathFromResult trata data.animal_id → /animais/:id (registrar produção).
4. ✅ **Página de detalhes do animal e animais por fazenda**: Nova página **/animais/[id]** (detalhes do animal) com dados do animal (identificação, raça, nascimento, sexo, status de saúde), fazenda (nome + link "Ver todos os animais desta fazenda"), resumo de produção (total litros, média, nº registros) e ações: **Editar**, **Excluir** (dialog de confirmação), **Registrar produção** (link para /producao/novo?animal_id=id). Nova página **/fazendas/[id]/animais** (animais da fazenda) com listagem via AnimalTable e link "Novo Animal" com fazenda pré-selecionada. AnimalTable ganha botão **Ver** (link para /animais/:id). Invalidação de cache ao criar animal: invalida também ['fazendas', fazenda_id, 'animais'].
5. ✅ **Assistente – listar animais e detalhar animal**: Novas intents **listar_animais_fazenda** (ex.: "quais animais tem na fazenda Larissa", "me dá mais informações sobre os animais da fazenda X") e **detalhar_animal** (ex.: "detalhes do animal 123", "qual a raça do animal identificação Y"). Backend: executarListarAnimaisFazenda retorna message + lista (identificação, raça, sexo, status) e fazenda_id; executarDetalharAnimal por id ou identificacao retorna message + animal. Handler coloca message no envelope para TTS. Frontend: getRedirectPathFromResult redireciona para /animais/:id quando resultado tem animal; para /fazendas/:id/animais quando tem fazenda_id (lista de animais).
6. ✅ **Assistente – consultar animais por fazenda**: Nova intent `consultar_animais_fazenda` para perguntas como "quantas vacas tem na fazenda X". Backend: AssistenteService com AnimalService; prompt com intent e exemplos; `executarConsultarAnimaisFazenda` usa `resolveFazendaByPayload` + `CountByFazenda`; retorna mensagem amigável (message, count, fazenda_nome). Handler coloca message no envelope para TTS. Frontend: sem alteração; getRedirectPathFromResult retorna /fazendas para objeto sem id.
7. ✅ **Assistente – buscar fazenda**: Nova intent `buscar_fazenda` para pesquisar fazendas por nome via assistente. Backend: prompt atualizado com intent e exemplos; `executarBuscarFazenda` usa `SearchByNome`; retorna 1 fazenda (objeto) ou lista (array). Handler com mensagens específicas ("Fazenda encontrada" / "X fazendas encontradas"). Frontend: `getRedirectPathFromResult` redireciona para `/fazendas/:id` quando 1 resultado, senão `/fazendas`; fluxo de voz (Deseja mais? → não) usa `lastRedirectPathRef`.
8. ✅ **Assistente inteligente com contexto**: Backend: Interpretar passa a receber contexto do usuário (user_id, perfil, nome); handler obtém do auth e UsuarioRepository; AssistenteService carrega fazendas (GetAll), monta seção "Contexto do usuário e do sistema" no prompt do Gemini (nome, perfil, lista de fazendas id+nome) e regra de intents por perfil (USER só fazendas; ADMIN/DEVELOPER futuros intents admin). Frontend: assistente apenas no Header (botão "Assistente" no desktop e no menu mobile, Dialog com AssistenteInput); solução antiga (barra na página /fazendas) removida.
9. ✅ **Assistente – retorno em voz (TTS)**: Quando o comando foi dado por voz, o sistema anuncia o resultado em voz: após interpretar fala o resumo (intent conhecida) ou a mensagem de erro (intent desconhecida); após executar fala a mensagem de sucesso do backend ou o erro. Utilitário `lib/speechSynthesis.ts` (`speak()`, `isSpeechSynthesisSupported()`), ref `lastInputWasVoice` no AssistenteInput, serviço assistente retornando `message` da resposta de executar.
10. ✅ **Assistente de voz – modo contínuo e timeout de silêncio**: Hook `useVoiceRecognition` em modo contínuo (`continuous: true`), acúmulo de transcrição entre eventos, finalização por parada explícita (clique no microfone) ou por timeout de silêncio configurável (`silenceTimeoutMs: 2500`). Tratamento de `onend`: quando a engine para sozinha, texto acumulado é enviado como final. Melhora a experiência para quem fala devagar ou faz pausas. Componente `AssistenteInput` com dica UX ao escutar e título dinâmico no botão do microfone.
11. ✅ **UX e Acessibilidade (design para usuários leigos e idosos)**: Paleta rural em modo claro e escuro em `globals.css` (verde pastagem, âmbar, contraste WCAG AA); toggle modo claro/escuro no Header e menu mobile com persistência em `localStorage` (ThemeContext, ThemeToggle); tipografia acessível (text-base 16px, Input/Button/Label); alvos de toque mín. 44px (Button sizes default/icon/touch, links do Header); ícones no menu (Farm, Cow, Milk, Users, Code); formulários com space-y-5, botão Salvar size="lg", erros em text-base; tabelas com overflow-x-auto e botões de ação size="default"; home com atalhos (Ver fazendas, Ver animais, Registrar produção) em cards com ícones. Documentação em `systemPatterns.md` (seção Padrões de UX e Acessibilidade).
12. ✅ **CRUD de Animais**: Backend (model, repository, service, handler, migração) + Frontend (pages, components, services) + Rotas `/animais` e `/fazendas/:id/animais`
13. ✅ **CRUD de Produção de Leite**: Backend (model, repository, service, handler, migração) + Frontend (pages, components, services) + Rotas `/producao`, `/animais/:id/producao`, `/fazendas/:id/producao`
14. ✅ **Registro de Usuários**: Endpoint `POST /api/auth/register` com validação de email único e hash bcrypt
15. ✅ **Página de Registro**: Frontend com validação de senhas e redirecionamento para login
16. ✅ **Prometheus Metrics**: Middleware de métricas HTTP (requests total, duration, in-flight, errors) + endpoint `/metrics`
17. ✅ **Testes Unitários Backend**: Testes table-driven para models e services (fazenda, animal, producao)
18. ✅ **Testes E2E Frontend**: Configuração Playwright + testes de autenticação e navegação

### ✅ Concluído anteriormente:

1. ✅ **Frontend**: Login, rotas protegidas, CRUD de fazendas (listagem, nova, editar, excluir)
2. ✅ **Shadcn/UI**: init + button, input, card, label, table, dialog
3. ✅ **API**: interceptors Bearer + 401 → /login; serviços auth e fazendas
4. ✅ **TanStack Query + AuthContext**: Providers, ProtectedRoute, Header
5. ✅ **Backend Render**: `render.yaml` e `Dockerfile` ajustados (JWT `sync: false`, PORT injetado, `buildFilter`, `autoDeployTrigger`); CI com build Docker
6. ✅ **Deploy Produção**: Backend configurado e funcionando no Render (banco PostgreSQL + variáveis de ambiente + chaves JWT)
7. ✅ **Atualização Next.js**: Migrado de Next.js 14.1.0 para 16.1.4 com React 19.2.3 e todas as dependências atualizadas
8. ✅ **Deploy Vercel (preparação)**: Build de produção validado; `deploy-notes.md` com checklist e passos para deploy manual via Dashboard
9. ✅ **401 pós-login em produção**: Cookies com SameSite=None quando `CORS_ORIGIN` ≠ localhost; `AuthHandler` recebe `cookieSameSite`; `deploy-notes` com troubleshooting
10. ✅ **Deploy frontend Vercel**: Deploy manual concluído; login, validate e CRUD validados em produção
11. ✅ **Dev Studio MVP (Fase 0)**: Implementação completa do Dev Studio — backend (Go) com integração Gemini API, frontend (Next.js) com chat e preview, validação sintática, rate limiting, auditoria completa. Funcional e testado em produção.
12. ✅ **Dev Studio Fase 1**: Automação de PRs via GitHub API — criação automática de branches, commits e Pull Requests. Integração completa com GitHub API REST, componente PRStatus no frontend, fluxo completo de validação → PR.
13. ✅ **Dev Studio Fase 2**: RAG dinâmico e monitoramento — `loadProjectContext` + `selectRelevantContext` (base fixa systemPatterns/techContext + até 2 docs variáveis por keywords; fallback activeContext). API `GET /api/v1/dev-studio/usage` (used_last_hour, limit_per_hour, used_today) sem consumir rate limit. Frontend: UsageAlert, alertas próximo/limite, ChatInterface desabilita ao limite e 429 com mensagem clara.
14. ✅ **Memory-bank e exemplos no Dev Studio**: `systemPatterns` e `techContext` atualizados com **estrutura atual do projeto** (pastas backend/frontend, rotas, padrões Handler/Service/Repository/Model/response). Dev Studio passa a incluir **trechos de código** (fazenda_handler, fazenda_service, fazenda_repository, models/fazenda, response) no contexto da IA em toda geração e refinamento.
15. ✅ **Contexto tipo Cursor no Dev Studio**: `loadTargetFilesForPrompt` infere arquivos-alvo (ex.: Header.tsx, layout.tsx) por palavras-chave do prompt (menu, Header, rota, link, dev-studio); inclui o **estado atual** no contexto. Prompt com **INSTRUÇÕES (comportamento tipo IDE)**: usar como base, preservar o resto; editar em cima do existente. Geração e refinamento usam o mesmo fluxo.
16. ✅ **Contexto sempre do repositório (GitHub)**: Com `GITHUB_TOKEN` + `GITHUB_REPO` configurados, exemplos de código e arquivos-alvo passam a ser obtidos sempre da **branch de produção** (`GITHUB_CONTEXT_BRANCH`, default `main`) via GitHub Contents API. `GitHubService.GetFileContent(ctx, branch, path)`; fallback para disco local quando GitHub não está configurado.
17. ✅ **Dev Studio Fase 3 - Diff Viewer e Linter**: Implementação completa do Diff Viewer (visualização de diferenças entre código gerado e código atual no repositório) e Linter Automático (validação sintática e de lint para Go e TypeScript). Backend: `GetFileDiffs()` no service, endpoint `GET /api/v1/dev-studio/diff/:request_id`, `LinterService` com validação básica de sintaxe. Frontend: componente `DiffViewer` customizado usando biblioteca `diff`, integração no `CodePreview` com tabs Preview/Diff, exibição de resultados do linter com erros e avisos, botão "Criar PR" desabilitado quando há erros.
18. ✅ **Dev Studio - Cancelamento de Requisições**: Funcionalidade completa para cancelar requisições geradas. Backend: método `CancelRequest()` no service com validação de autorização e proteção contra cancelamento de requisições já implementadas, endpoint `DELETE /api/v1/dev-studio/:request_id`, auditoria de cancelamentos. Frontend: botão "Cancelar" no `CodePreview` com dialog de confirmação moderno (Shadcn/UI Dialog), atualização automática do histórico após cancelamento via `refreshTrigger`, badge "Cancelado" no `HistoryPanel`, filtro por status "cancelled".
19. ✅ **Assistente em linguagem natural**: Backend: AssistenteService (Interpretar com Gemini, Executar com FazendaService), AssistenteHandler, rotas `POST /api/v1/assistente/interpretar` e `POST /api/v1/assistente/executar` (auth obrigatório; ativo quando GEMINI_API_KEY está configurada). Frontend: serviço assistente (interpretar, executar), componente AssistenteInput **apenas na página de listagem de fazendas** (`/fazendas`) — barra "O que você precisa?" + botão enviar + botão microfone, dialog de confirmação antes de executar, hook useVoiceRecognition (Web Speech API pt-BR) para entrada por voz. Fluxo: digitar/falar → interpretar → confirmar → executar → redirecionar para /fazendas.
20. ✅ **Assistente – persistência e feedback de erro**: Repositório de fazendas: validação de ID no Update, verificação de RowsAffected (retorna erro se nenhuma linha atualizada), correção em queryList (cópia por linha para evitar ponteiro compartilhado). Assistente: validação de ID da fazenda resolvida em executarEditarFazenda, log de debug (id, nome_atual, payload). Frontend: erro ao confirmar exibido **dentro** do dialog (texto destrutivo); função getErrorMessage prioriza `error.details` (motivo real da API) sobre `error.message`; limpeza de erro ao cancelar e ao tentar confirmar de novo.
21. ✅ **Frontend responsivo e DRY**: Layout unificado com `PageContainer` (variantes default, narrow, wide, centered) em todas as páginas; `BackLink` para navegação "Voltar"; utilitário central `getApiErrorMessage` em `lib/errors.ts` usado em login, formulários, ChatInterface, CodePreview e HistoryPanel; tipo `ApiResponse<T>` centralizado em `api.ts` e importado nos services (fazendas, devStudio, assistente); Header com menu hamburger em mobile (drawer lateral) e navegação horizontal em desktop (lg:).
22. ✅ **Módulo Administrador**: Perfis estruturados (USER, ADMIN, DEVELOPER). Constraint de unicidade para DEVELOPER no banco (migração 8). Área admin (`/admin/usuarios`) para gerenciamento de usuários — listagem, criar, editar, ativar/desativar. Middleware `RequireAdmin()` (ADMIN ou DEVELOPER). Perfil DEVELOPER não pode ser atribuído via API (apenas migração/script). Header com link "Admin" visível para ADMIN ou DEVELOPER.

### 📋 Próximos passos imediatos:

1. Implementar recuperação de senha (requer configuração SMTP)
2. Validações adicionais nos handlers (go-playground/validator)
3. Dashboard com gráficos de produção
4. CRUD de outras entidades do domínio (saúde animal, gestão reprodutiva)

## 🛠️ Decisões Técnicas Ativas

### **Arquitetura e Stack**

- ✅ **Decidido**: Backend em **Go** usando framework **Gin**
- ✅ **Decidido**: Frontend em **Next.js 16.1.4** com App Router e Turbopack
- ✅ **Decidido**: **React 19.2.3** para melhor performance e novas features
- ✅ **Decidido**: Banco de dados **PostgreSQL** mantido (schema existente)
- ✅ **Decidido**: Estrutura **Monorepo** com `/backend` e `/frontend`

### **Segurança**

- ✅ **Decidido**: JWT com algoritmo **RS256** (chaves pública/privada)
- ✅ **Decidido**: **Refresh Tokens** armazenados no banco de dados
- ✅ **Decidido**: Cookies **HttpOnly** e **Secure** para armazenamento de tokens
- ✅ **Decidido**: **Bcrypt** para hashing de senhas
- ✅ **Decidido**: **CORS estrito** configurado para domínio da Vercel

### **Observabilidade**

- ✅ **Decidido**: **Sentry** para captura de erros em tempo real
- ✅ **Decidido**: **BetterStack** (Logtail) para agregação de logs estruturados
- ✅ **Decidido**: **Prometheus** para métricas de performance
- ✅ **Decidido**: **slog** (Go) e **Pino** (Next.js) para logging estruturado

### **Infraestrutura**

- ✅ **Decidido**: Deploy no **Render** para backend Go
- ✅ **Decidido**: Deploy na **Vercel** para frontend Next.js
- ✅ **Decidido**: Banco de dados **PostgreSQL** (Render ou Neon.tech)

## 🐛 Problemas Conhecidos

### **Problemas Conhecidos / Limitações**

- ⚠️ **Voz no Chrome Android**: A Web Speech API tem suporte limitado no Chrome Android. Aplicamos workarounds (`continuous: false`, pre-warm com `getUserMedia`) para melhorar a interpretação. Em alguns dispositivos a precisão pode ser menor que no desktop. Em caso de falha recorrente, o usuário pode digitar o comando.

### **Problemas Resolvidos**

- ✅ **Alto Consumo de Memória**: Resolvido migrando de Java (~300MB) para Go (~30MB)
- ✅ **Cold Start Lento**: Resolvido com Go (startup < 1s vs 15-30s do Java)
- ✅ **Complexidade de Deploy**: Resolvido com binário único de Go e deploy simplificado
- ✅ **Problemas de Conectividade**: Go com driver pgx mais robusto que R2DBC

## 📊 Métricas de Progresso

### **Completude Geral**: 95%

- **Infraestrutura**: 95% ✅ (backend + frontend em produção + Dev Studio)
- **Documentação**: 95% ✅ (incluindo Dev Studio)
- **Implementação**: 95% ✅ (CRUD Animais, Produção, Registro, Prometheus, vínculo usuário–fazenda)
- **Testes**: 70% ✅ (testes unitários backend + E2E frontend configurados)
- **Deploy**: 90% ✅ (backend Render + frontend Vercel; login e CRUD validados no ar)

---

**Última atualização**: 2026-02-02
**Contexto Ativo**: Go + Next.js 16 | Backend (Render) + Frontend (Vercel) em produção | Vínculo usuário–fazenda (usuarios_fazendas, minhas fazendas, fazenda única automática, admin atribui fazendas, perfil não editável para ADMIN/DEVELOPER) | UX e Acessibilidade | Dev Studio Fase 0–3 | Assistente em linguagem natural | Módulo Administrador | Frontend responsivo e DRY
