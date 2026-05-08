# 🚀 Active Context - CeialMilk

## 📋 Estado Atual do Projeto

### **Status Geral**

O projeto está em **migração arquitetural** da stack Java/Spring para uma solução moderna e eficiente com **Go** no backend e **Next.js** no frontend. Esta mudança visa resolver problemas de consumo de recursos, complexidade de deploy e melhorar a experiência de desenvolvimento.

### ✅ O que está funcionando:

- **Backend Go**: API com Gin, health, auth (login/logout/refresh/validate) e CRUD + search de fazendas
- **Autenticação**: JWT RS256, middleware, bcrypt; refresh tokens no banco; cookies HttpOnly (SameSite=Strict em dev, SameSite=None em produção cross-origin Vercel+Render)
- **Formato de Resposta**: Padronizado com `data`, `message`, `timestamp` nas rotas de domínio (`/api/auth/*` e `/api/v1/*`)
- **Formato de Erro**: Padronizado com `error.code`, `error.message`, `error.details`, `timestamp` nas rotas de domínio (`/api/auth/*` e `/api/v1/*`)
- **Observabilidade**:
  - Correlation IDs automáticos para cada request (UUID)
  - Logging estruturado JSON com correlation IDs, método, path, status, latency
  - Sentry integrado para captura de erros e panics
  - Middleware de logging automático para todas as requisições
- **Migrações**: golang-migrate no startup; seed do usuário admin (V3); refresh tokens (V4); Dev Studio (V5, V6); constraint unicidade DEVELOPER (V8); vínculo usuário–fazenda (V11 – tabela usuarios_fazendas); origem de aquisição em animais (V13 – origem_aquisicao NASCIDO|COMPRADO); touro_animal_id em coberturas (V14 – vinculação reprodutor em monta natural); **folgas 5x1** (V16 – `folgas_escala_config`, `escala_folgas`, `folgas_justificativas`, `folgas_excecoes_dia`, `folgas_alteracoes`); **RLS em `public`** (V19 – todas as tabelas de domínio, sem políticas PostgREST; dono da tabela/API Go inalterado); **restrições de leite** (V20 – `restricoes_leite`, índice único parcial um `AGUARDANDO_LAB` por animal)
- **Postman**: Rotas compatíveis com a collection (`/api/auth/*`, `/api/v1/fazendas/*`)
- **Frontend + Backend**: Integração validada — login, listagem, criar/editar/excluir fazendas (dev e **produção** Vercel + Render)
- **Devcontainer**: `DATABASE_URL` e `PORT` pré-configurados; backend via `go run ./cmd/api`
- **Resiliência**: Se o Postgres falhar (ex.: pg_hba), o backend sobe e expõe apenas `GET /health`; auth/fazendas ficam inativos até o DB estar ok
- **Postgres no compose**: `scripts/db/init-pg-hba.sh` + `ssl=off` para aceitar conexões do devcontainer (após recriar o volume)
- **Dev Studio (Fase 0 + Fase 1 + Fase 2 + Fase 3)**: Área de desenvolvimento interativa com IA integrada — geração de código via Gemini API, validação sintática, preview, histórico, criação automática de PRs via GitHub API, **RAG dinâmico** (seleção de contexto por palavras-chave), **monitoramento** (GET /usage, alertas de limite, tratamento 429), **Refinar** (feedback para corrigir divergências) e **exemplos de código** (handler/service/repository/model/response de Fazenda) sempre incluídos no contexto da IA. **Contexto tipo Cursor**: quando o prompt indica edição de menu/UI (ex.: "menu", "Header", "rota", "link", "dev-studio"), o backend inclui o **estado atual** dos arquivos-alvo (ex.: `Header.tsx`, `layout.tsx`) e instruções para **editar em cima do existente** e **preservar** o que não foi pedido para alterar. **Contexto sempre do repositório**: quando `GITHUB_TOKEN` e `GITHUB_REPO` estão configurados, **exemplos** e **arquivos-alvo** são sempre buscados da **branch de produção** (`GITHUB_CONTEXT_BRANCH`, default `main`) no GitHub, pois o resultado aprovado irá para lá (PR → merge). **Diff Viewer**: visualização de diferenças entre código gerado e código atual no repositório (comparação linha por linha). **Linter Automático**: validação sintática e de lint para Go e TypeScript com exibição de erros e avisos. **Cancelamento de Requisições**: funcionalidade para cancelar requisições geradas (status "cancelled"), com dialog de confirmação moderno (Shadcn/UI) e atualização automática do histórico.
- **Assistente Virtual Multimodal Live (Gemini 2.0 Flash)**: 
  - **Acesso via FAB**: Botão flutuante (FAB) fixo no canto inferior direito, visível em telas autenticadas para perfis com acesso ao assistente (**`FUNCIONARIO` oculto/bloqueado no estado atual**); um toque abre o modal do assistente. O assistente **não fica mais no Header** — estado compartilhado via `AssistenteContext`; modal renderizado no layout (`AssistenteDialog`) junto com o FAB (`AssistenteFab`).
  - **Interface em Tempo Real**: Conversação via WebSockets (`/api/v1/assistente/live`). **Funciona em qualquer navegador**, inclusive mobile: com suporte a voz (Web Speech API) usa microfone + TTS; sem suporte a voz, usa apenas digitação (Enter ou botão Enviar).
  - **Voz-para-Voz (quando disponível)**: Transcrição STT no navegador e envio de texto; resposta da IA em texto + TTS. Sem captura de áudio bruto no frontend (evita falhas em Safari/iOS).
  - **Function Calling Completo**: IA integrada aos serviços de Fazenda, Animal e Produção. Capaz de listar, buscar, cadastrar, editar e excluir dados reais.
  - **Contexto Inteligente**: Identificação automática do usuário logado e da fazenda ativa no sistema para consultas contextuais sem repetição.
  - **Interatividade Contínua**: Quando voz está disponível, auto-religamento do microfone; quando não, conversa apenas por texto.
  - **Despedida e Fechamento**: Suporte ao comando de voz para encerrar a conversa e fechar a janela automaticamente.
  - **Feedback Visual**: Visualizador de ondas (Waveform) quando em voz; mensagem orientando digitação quando voz não é suportada.
  - **Resiliência**: Erros do Gemini/rede enviados ao cliente via WebSocket (`type: "error"`) com mensagens amigáveis; reconexão com backoff (1s, 2s, 4s, máx. 3 tentativas); detecção de offline e mensagem "precisa de internet"; ao voltar à aba (`visibilitychange`) reconexão automática quando o WebSocket estiver fechado.
  - **UX**: Indicador "Assistente está pensando…" no Live; sugestões rápidas também no modo Live; feedback de status (Reconectando… / Reconectado) sempre em texto.
  - **Resposta em texto puro (modo Live)**: A resposta do assistente é exibida sem interpretação de markdown (sem negrito a partir de `*`), para consistência com TTS e para o usuário não precisar "falar" asterisco. A API do assistente (system instruction no Live e prompt em interpretar) instrui o modelo a não retornar markdown nem asteriscos.
  - **Uso sem fone (alto-falante) com prioridade de fala do usuário**: Estratégia "mic off durante TTS" — microfone fica **sempre desligado** enquanto o assistente fala (qualquer duração) e é reaberto automaticamente após grace period (800ms desktop / 1200ms mobile). Barge-in manual: botão do mic fica **pulsante e destacado** durante TTS — um toque interrompe a fala e abre o mic imediatamente. O usuário também pode digitar para interromper. Saudação de boas-vindas enviada como `type: "greeting"` (exibida como texto, sem TTS) para o mic abrir instantaneamente ao iniciar. No backend, o WebSocket aceita `{"type":"interrupt"}` e cancela o turno em andamento; novo texto inicia novo turno e respostas antigas são descartadas.
  - **WebSocket em produção**: CheckOrigin restringe a origem ao domínio do frontend (`CORS_ORIGIN`); em dev (localhost) aceita qualquer origem.
  - **PWA**: Web App Manifest (`/manifest.json`), ícones, theme_color e install prompt (banner "Instalar") para uso como app instalável em mobile.
- **Módulo Administrador**: Área admin (`/admin/usuarios`) para ADMIN e DEVELOPER — listagem, criar, editar e ativar/desativar usuários. Perfis USER, **FUNCIONARIO**, **GERENTE**, **GESTAO**, ADMIN, DEVELOPER; constraint de unicidade para DEVELOPER no banco. Rotas `GET/POST /api/v1/admin/usuarios`, `PUT /api/v1/admin/usuarios/:id`, `PATCH /api/v1/admin/usuarios/:id/toggle-enabled`, `GET/PUT /api/v1/admin/usuarios/:id/fazendas`. Perfil DEVELOPER não atribuível via API. **Fazendas vinculadas**: somente ADMIN (ou DEVELOPER) pode atribuir quais fazendas cada usuário acessa, na tela de edição de usuário (seção "Fazendas vinculadas" com checkboxes + "Salvar vínculos"). **Perfil não editável**: ao editar um usuário com perfil ADMIN ou DEVELOPER, o campo perfil é somente leitura (frontend e backend preservam o perfil). **Combo padrão**: formulário usa `Select` Shadcn no campo perfil.
- **Módulo Folgas (escala 5x1)**: Por fazenda — configuração com data âncora e três usuários vinculados (slots do rodízio), **geração automática** via `POST .../folgas/gerar` para o **intervalo do mês visível no calendário** (primeiro ao último dia do mês navegado — não é fixo ao “mês civil atual” do relógio), preservando dias `MANUAL`; alteração de dia por **GERENTE**/**GESTAO**/**ADMIN**/**DEVELOPER** (sem validação de “equidade” no backend), justificativa apenas por **FUNCIONARIO** no próprio dia de folga, alertas quando há mais de um de folga no mesmo dia sem exceção do dia ou sem todas as justificativas. **`GET .../folgas/escala`** devolve `linhas` + **`rodizio_por_dia`** (previsto em todo o intervalo, inclusive dias sem registro) e campos de rodízio nas linhas; **`GET .../folgas/resumo-equidade`** (gestão) compara folgas registradas vs previstas no período por slot. **UX desktop**: tooltip nas células quando há texto de detalhe; badge “Fora do rodízio” completo. **UX mobile** (grade 7 colunas mantida): Alertas e Equidade colapsáveis (`details/summary`); célula **tocável inteira** abre `FolgasDiaDetalhesDialog` (rodízio completo, registros, motivos conforme perfil, ações Alterar/Justificar); botão explícito “Ver detalhes” só em `md+`; na grade mobile texto mínimo (nome previsto curto ou `#id`, contagem `1 folga` / `N folgas` ou “Meu dia”, `—` sem folga, indicador âmbar para fora do rodízio, rótulo curto “Exceção”); dias fora do mês sem linha extra de rodízio/status. Histórico: cards no mobile, tabela no desktop. API sob `/api/v1/fazendas/:id/folgas/*` e `GET /api/v1/fazendas/:id/usuarios-vinculados`. FUNCIONARIO vê exceção do dia só se for folguista naquele dia. Seletor **“Visualizar folgas de”**; fazenda única automática para admin/dev; `/folgas` no Header. `AuthContext` com `user.id`.
- **Módulo Folgas (escala 5x1) — tratamento de conflito**: erros de banco por duplicidade (`unique_violation`) agora são mapeados/convertidos para mensagens amigáveis na UI (evitando exibir “duplicate key” ao usuário e orientando sobre o modo correto: `Substituir o dia inteiro` vs `Adicionar outra folga`).
- **Restrição por perfil (FUNCIONARIO com escopo ampliado)**: Matriz em `frontend/src/config/appAccess.ts` (menu, landing, guarda de rotas, visibilidade do assistente) espelhada em `backend/internal/auth/perfil_access.go` (`RequirePerfilAPIAccess` em rotas `/api/v1/*`). `FUNCIONARIO` mantém `Folgas`, ganha acesso à home (`/`), Gestão parcial (`/gestao/cios*`, `/gestao/coberturas*`, `/gestao/partos*`, `/gestao/secagens*`) e Animais em modo consulta (`/animais`, `/animais/:id` com resumo/histórico). Escritas de Animais seguem bloqueadas (UI e API) e rotas fora da whitelist continuam com 403/redirecionamento.
- **Cadastro padrão**: `POST /api/auth/register` cria usuários com perfil `FUNCIONARIO` (landing e acesso limitados à área de Folgas).
- **Vínculo usuário–fazenda e fazenda única**: Tabela `usuarios_fazendas` (N:N). Endpoint `GET /api/v1/me/fazendas` retorna as fazendas vinculadas ao usuário logado. **`FazendaContext`**: se **não** há fazendas, limpa estado; se há **exatamente uma**, **sempre** define essa fazenda como ativa e persiste em `localStorage` (sem depender de valor pré-existente); se há **duas ou mais**, mantém restauração pela chave salva quando válida. **`FazendaSelector`** no header só renderiza o dropdown quando há **mais de uma** fazenda vinculada. Formulários de novo animal e nova produção com fazenda única seguem sem seletor; atalhos da home apontam direto quando aplicável. Admin atribui fazendas a usuários na edição de usuário. **Auto-vínculo backend**: quando existe exatamente uma fazenda no sistema e o usuário está sem vínculos, o backend vincula automaticamente em `POST /api/auth/register`, `POST /api/v1/admin/usuarios` e também em login/validate para backfill progressivo de usuários já cadastrados.
- **Módulo Custos Agrícolas**: Migration 15 (fornecedores, areas, analises_solo, safras_culturas, custos_agricolas, producoes_agricolas, receitas_agricolas). Backend: CRUD completo fornecedores, áreas, análises solo, safras/culturas; custos, produções e receitas por safra/cultura (com seleção de fornecedor); resultado por área/safra e consolidado; comparativo de fornecedores por safra. Frontend: dashboard Agricultura; CRUD fornecedores e áreas (incl. edição); análises de solo (listagem e nova por área); safras/culturas por área/ano (dialog criar cultura); detalhe safra/cultura com custos, produções, receitas e formulários (com FornecedorSelect em custos e receitas); resultado por safra; comparativo fornecedores. Acesso via menu "Agricultura" (ícone Wheat). Próximo: integração Assistente Virtual.
- **Busca inteligente de animais na home**: tela inicial (`/`) com pesquisa por identificação e resultado contextual. Backend: `GET /api/v1/animais/search/by-identificacao` com filtro por fazendas vinculadas ao usuário e `GET /api/v1/animais/:id/contexto` (animal + resumo de produção + opcional `restricao_leite_ativa`). Frontend: `AnimalSearchHome` na home com seleção de resultado e atalho para detalhes do animal; lista de resultados sem exibir fazenda (contexto já é da fazenda ativa).
- **Listagem de animais (filtros + paginação)**: `GET /api/v1/animais` retorna `{ animais, total }` com query `limit`, `offset`, `fazenda_id`, `identificacao`, `categoria`, `sexo`, `status_saude`, `lote_id`, `status_reprodutivo` — restrito às fazendas do usuário. `GET /api/v1/fazendas/:id/animais` sem `limit` mantém array completo (formulários); com `limit` retorna `{ animais, total }`. Frontend: em **`/animais`** o `fazenda_id` vem **só da fazenda ativa** (`FazendaContext` / seletor do header); em **`/fazendas/[id]/animais`** o escopo é a fazenda da rota. **`AnimaisListToolbar`**: secção **Busca** (identificação com debounce); filtros avançados em **`Popover`** (`md+`) ou **`Dialog`** (mobile) via `useMediaQuery("(min-width: 768px)")` em `hooks/useMediaQuery.ts`; badge + chips para filtros ativos; **`resultCount`** / **`listLoading`** mostram total na lista **somente no Dialog (mobile)** — no desktop o Popover não repete o total (título/paginação visíveis atrás). Popover com `max-h` + scroll interno no formulário para não cortar conteúdo. Rótulo da busca **`max-sm:sr-only`** + placeholder visível no telemóvel. Serviços `listPaginated` / `listByFazendaPaginated` e **`ListPaginationBar`**.
- **Leite para descarte (aguardando laboratório)**: tabela `restricoes_leite` por episódio (motivo, início, observação, status `AGUARDANDO_LAB` → `LIBERADO`). API: `GET|POST /api/v1/fazendas/:id/restricoes-leite/ativas` e base, `PATCH .../:restricaoId/liberar` (FUNCIONARIO pode listar e registrar; não liberar); `GET /api/v1/fazendas/:id/animais/em-lactacao` para o combo de registro; `POST` valida lactação ativa (`lactacoes`: `data_fim` nula, `status` nulo ou `EM_ANDAMENTO`). Home: `RestricoesLeiteHomePanel` acima da busca inteligente (`listEmLactacaoByFazenda`). Catálogo: `docs/business/leite-restricoes.md` (inclui **BR-LEITE-005**).

### 🚧 Em andamento:

- **Consolidação do Módulo Agrícola**: backend (handlers/services/repositories/models + migration 15) e frontend (`/agricultura`) já estruturados no workspace, com ajustes finais de validação integrada e fechamento dos fluxos ponta a ponta.

### ✅ Concluído desde a última atualização:

1. ✅ **Animais — UX toolbar de filtros (mobile-first)**: `AnimaisListToolbar` com secção Busca, filtros avançados em Popover (desktop) ou Dialog (mobile); chips para remover critérios; resumo **«N animais encontrados»** / loading **só no modal mobile** (`resultCount`, `listLoading` das páginas); Popover sem esse bloco para poupar espaço; layout Popover com altura máxima e área de scroll; rótulo «Identificação ou brinco» **`sr-only`** abaixo de `sm` + placeholder explícito.
2. ✅ **Animais — filtros e paginação**: API paginada com escopo por fazendas do usuário; telas `/animais` e `/fazendas/[id]/animais` com filtros e barra de paginação reutilizável; serviços `listPaginated` e `listByFazendaPaginated`; hook `useDebouncedValue` para identificação. **`/animais`** envia `fazenda_id` implícito da **fazenda ativa** (sem seletor de fazenda na lista); mensagens distintas quando não há fazendas vinculadas vs. quando falta escolher fazenda no header.
2. ✅ **Folgas — UX mobile (iteração visual)**: remoção do texto “Ver detalhes” repetido no mobile (célula inteira clicável); grade menos poluída (sem prefixo “Prev:”, texto longo de rodízio só no dialog/tooltip; “Fora do rodízio” como bolinha âmbar no mobile e badge no desktop; exceção resumida como “Exceção”; contagem `1 folga` / `N folgas`).
3. ✅ **Documentação de negócio Folgas**: regra explícita de que **“Gerar mês automático”** aplica ao **mês exibido** no navegador do calendário (não necessariamente o mês atual do relógio).
4. ✅ **Folgas — clareza 5x1 e equidade informativa**: API escala com `rodizio_por_dia` e campos esperados por linha; `resumo-equidade` para gestão; UI com painel/aviso de equidade, tooltip e confirmação ao substituir fora do previsto (sem bloqueio no servidor).
5. ✅ **Folgas — UX mobile refatorada mantendo grade mensal**: topo reorganizado (mês + ações), seções colapsáveis, `FolgasDiaDetalhesDialog`, histórico em cards no mobile.
6. ✅ **RBAC configurável por perfil**: `appAccess.ts` + `RouteAccessGuard` no frontend; `RequirePerfilAPIAccess` no backend; FUNCIONARIO com home + Folgas + Gestão parcial (Cios/Coberturas/Partos/Secagens) + Animais em consulta.
7. ✅ **Folgas — UX gestão e fazenda**: filtro “Visualizar folgas de”; ADMIN/DEVELOPER com fazendas de `/me/fazendas`; `FazendaContext` 0 / 1 / N fazendas.
8. ✅ **Módulo Folgas 5x1**: Migration 16, API e página `/folgas`, teste unitário `UsuarioParaDia`.
9. ✅ **Folgas — combos FUNCIONARIO e GERENTE** (GESTAO compatível) com validação no backend.
10. ✅ **Módulo Custos Agrícolas (estrutura no código)**: migration 15 e domínio consolidado.
11. ✅ **Navegação Agricultura** no frontend e rotas no backend.
12. ✅ **Admin Usuários** — `Select` Shadcn, perfil `GERENTE`, correções de estado.
13. ✅ **Auto-vínculo de fazenda única** no backend (register, admin, login/validate).
14. ✅ **Alinhamento frontend aos padrões (`systemPatterns`)**: filtro de status do **Dev Studio** (`HistoryPanel`) migrado de `<select>` nativo para **Shadcn Select**; rota `/admin` envolvida em **PageContainer** (`centered`); listagens com **TanStack Query** passam a exibir falhas da API via **`getApiErrorMessage`** (gestão pecuária, agricultura, lotes, animais, produção, fazendas, admin usuários).
15. ✅ **DRY + composição no frontend**: `QueryListContent` e `ListCardLayout` (`components/layout/`); **`lib/format.ts`** (`formatDatePtBr`, `formatDateTimePtBr`, `formatDateTimePtBrOptional`); tabelas gestão/animais/produção e rotas agricultura/detalhes usando format centralizado; **`useFolgasPage`** (`hooks/useFolgasPage.ts`) extrai estado e dados remotos da página `/folgas`.
16. ✅ **Campos de data (padrão Shadcn)**: formulários que ainda usavam `Input type="date"` migrados para **`DatePicker`** — `FazendaForm` (fundação), agricultura (nova análise de solo, custos/receitas/produções por safra, `CreateSafraCulturaDialog`). `systemPatterns` reforça proibição de `type="date"` para data pura.
17. ✅ **Animais — datas antigas com preenchimento rápido**: `DatePicker` ganhou modo de digitação manual com **autoformatação** (`DD/MM/AAAA`) enquanto o usuário digita (inclusive só números), conversão para `YYYY-MM-DD`, validação amigável e navegação por ano via dropdown no calendário; `AnimalForm` (novo/editar) passou a usar esse modo em `data_nascimento`, `data_entrada` e `data_saida`.
18. ✅ **Correção de fuso em data pura (frontend)**: `formatDatePtBr` passou a tratar `YYYY-MM-DD` como data local (meio-dia) para evitar regressão de um dia na exibição/fluxo (ex.: `01/01/2022` aparecer como `31/12/2021`).
19. ✅ **TestSprite (API backend)**: Plano em `testsprite_tests/testsprite_backend_test_plan.json`; scripts Python `TC001`–`TC009` com envelope `data` alinhado à API; `testsprite_api_helpers.py` (BASE_URL, seed `TESTSPRITE_ADMIN_*`, login); TC006 com fluxo **FUNCIONARIO** (registo+login); fixture canónico + `scripts/testsprite-restore-tc007.sh` após `generateCodeAndExecute` (o MCP pode sobrescrever `TC*.py`); `README_TESTSPRITE.md` com âmbito e opção de excluir TC007 do MCP; relatórios em `testsprite_tests/tmp/raw_report.md` e `testsprite-mcp-test-report.md`.
20. ✅ **Gestão Pecuária — Partos (CRUD)**: backend expõe `GET|POST /api/v1/partos`, `GET /api/v1/partos/:id`, `PUT /api/v1/partos/:id`, `DELETE /api/v1/partos/:id` com validações de domínio; formulários **novo** e **editar** compartilham `PartoFormFields` (animal, data/hora, **número de animais na cria**, tipo, gestação opcional, complicações, observações); listagem com **Editar** e **Excluir** (Dialog de confirmação).
21. ✅ **Partos — crias (sexo/situação)**: **novo parto** envia `crias[]` num único `POST /api/v1/partos` (transação); **editar** mantém `POST /api/v1/crias` avulso via `PartoEditCriasPanel` (tabela, alerta vs `numero_crias`, cadastro de faltantes). `services/crias.ts` + `partos.ts` (`PartoCriaInput`); constantes em `cria-constants.ts`.
22. ✅ **Cria viva → animal**: backend preenche `data_nascimento` (data do parto), `origem_aquisicao` NASCIDO, `raca` e `animal_identificacao` opcionais no POST; identificação provisória `FILHO-{identMae}-…` (macho) ou `FILHA-{identMae}-…` (fêmea); duplicidade de brinco → 409. Frontend: campos identificação/raça por cria e no painel de edição.
23. ✅ **Integridade parto–cria–animal (transações)**: `CriaService.Create` usa `pgx.Tx` para cria VIVO com animal automático (`INSERT crias` → `INSERT animais` → `UPDATE crias`), com `SELECT … FOR UPDATE` no parto e contagem/`n` dentro da transação; `POST /api/v1/partos` aceita corpo opcional `crias[]` para persistir parto + efeitos na matriz + todas as crias numa única transação (`PartoService.CreateWithCrias`); formulário **novo parto** envia `crias` num único POST.
24. ✅ **Excluir parto desfaz o nascimento**: `PartoService.Delete` em transação chama `CriaService.DeleteAnimaisGeradosPorCriasDoPartoTx` — remove animais ligados a **crias VIVAS** (mesma fazenda, não a matriz, origem **não** `COMPRADO`; `mae_id` nil ou igual à matriz do parto). Depois `DeleteTx` do parto (cascade nas crias).
25. ✅ **UX e cache (partos)**: rótulo de campo **«Número de animais na cria»**; tabela de partos coluna **«Animais na cria»**; após excluir parto, `PartoTable` invalida TanStack Query em `partos`, `animais` (por fazenda e global), `crias` e `fazendas/:id/animais` para a lista de animais refletir o backend.
26. ✅ **Catálogo de negócio (`docs/business/`)**: regras de domínio versionadas com IDs (`BR-*`), índice em `docs/business/README.md`, primeiro módulo **Folgas** em `docs/business/folgas.md`; `AGENTS.md`, `.cursor/rules` e template de PR passam a exigir atualização do catálogo quando houver mudança de comportamento de produto; `productContext.md` aponta para o catálogo em vez de duplicar o detalhe.
27. ✅ **Gestão Pecuária — Coberturas e Cios (CRUD alinhado a Partos)**: backend coberturas com `PUT|DELETE /api/v1/coberturas/:id` (exclusão bloqueada por vínculo em gestação/diagnóstico → 409); frontend `CoberturaFormFields` + `/gestao/coberturas/[id]/editar`, `CoberturaTable` com Editar/Excluir; `CioFormFields` compartilhado entre novo/editar cio; catálogo `docs/business/coberturas.md` e `docs/business/cios.md`.
28. ✅ **Animais — busca inteligente na home**: adicionada busca por identificação na tela inicial com retorno contextual (status do animal + resumo de produção), novo endpoint `GET /api/v1/animais/:id/contexto` e filtro de autorização no `search/by-identificacao` para limitar resultados às fazendas vinculadas ao usuário.
29. ✅ **Login/registro respeitam o perfil no redirecionamento**: `LoginForm` e `RegistroForm` deixaram de mandar todo usuário autenticado para `/fazendas` por padrão. Agora, perfis com áreas restritas (ex.: **FUNCIONARIO**) caem direto em `getDefaultLandingPath(perfil)` (`/folgas`), evitando uma corrida com o redirect *hard* (`window.location.href`) de `FazendasContent` que prendia o usuário em `/onboarding`/`/fazendas/selecionar`. Perfis com acesso pleno (USER, GERENTE, GESTAO, ADMIN, DEVELOPER) mantêm o fluxo legado por `/fazendas`. Para suportar isso, `AuthContext.login` agora retorna o `User | null` recém-validado; o `?redirect=` é validado contra o perfil via `isPathAllowedForPerfil` antes de ser honrado.
30. ✅ **`FazendaContext` recarrega após login (sem hard reload)**: o guard `hasLoaded` deixou de ser marcado no ramo deslogado, então a transição `isAuthenticated: false → true` dispara o carregamento das fazendas vinculadas (antes ficava preso em `fazendaAtiva = null` quando o login redirecionava direto para `/folgas`). Durante a carga autenticada, `isReady` volta a `false` para evitar UI vazia. A página `/folgas` passa a esperar `fazendaContextReady` antes de exibir a mensagem "Não foi possível determinar a fazenda ativa…", trocando-a por "Carregando…" enquanto o contexto resolve.
31. ✅ **FUNCIONARIO sem fazenda vinculada cai em `/onboarding`**: a tela padrão do sistema para usuários autenticados sem vínculo (`/onboarding`, com card "Acesso às fazendas necessário") passou a também ser usada por perfis restritos (FUNCIONARIO). Implementado em duas camadas: (a) `useFolgasPage` agora chama `useMinhasFazendas` para qualquer perfil e expõe `semFazendaVinculada`; quando verdadeiro, `router.replace("/onboarding")` é disparado, e a página `/folgas` esconde a mensagem genérica e mostra "Carregando…" durante a transição; (b) `LoginForm.handleSubmit` faz uma pré-checagem (`maybeRedirectToOnboarding`) para perfis restritos: se `getMinhasFazendas()` retorna vazio, manda direto para `/onboarding`, evitando o flash `/folgas → /onboarding`. Falhas da pré-checagem não bloqueiam o login (fallback para a landing normal). Para o caso de **2+ fazendas sem ativa** em perfis não-admin, a mensagem em `/folgas` foi reescrita para orientar o uso do seletor no header.
32. ✅ **Restrições de leite (descarte / laboratório)**: migration V20, CRUD de episódios na API por fazenda, painel na home (`RestricoesLeiteHomePanel`), alerta na busca contextual (`restricao_leite_ativa`), RBAC FUNCIONARIO (POST + GET ativas; PATCH liberar negado), catálogo `docs/business/leite-restricoes.md` + BR-ACESSO-005.
33. ✅ **Restrições de leite — só animais em lactação ativa**: `GET /api/v1/fazendas/:id/animais/em-lactacao`, `ListEmLactacaoByFazendaID` + `LactacaoRepository.ExistsAtivaNaFazenda` na criação; UI do registro usa `listEmLactacaoByFazenda`; **BR-LEITE-005**; whitelist FUNCIONARIO para o novo path em `perfil_access.go`.
34. ✅ **Lint CI — `react-hooks/set-state-in-effect` + `react/no-unescaped-entities`**: hook `useMediaQuery` reescrito com **`useSyncExternalStore`** (assinatura nativa de `window.matchMedia`, sem `setState` em efeito); listas de animais (`/animais` e `/fazendas/[id]/animais`) deixaram de resetar `offset` em `useEffect` — agora usam o padrão recomendado pelo React de **estado derivado durante a renderização** (chave de filtros + `prevFilterKey` em `useState`); aspas literais em `RestricoesLeiteHomePanel` escapadas (`&ldquo;` / `&rdquo;`). `npm run lint` e `tsc --noEmit` passando localmente.
35. ✅ **Assistente bloqueado para FUNCIONARIO (UX + RBAC)**: `showAssistenteForPerfil` passou a ocultar FAB/modal para `FUNCIONARIO`; backend mantém bloqueio explícito em `/api/v1/assistente/*` para esse perfil; mensagem de falha de reconexão Live ficou neutra/orientativa (sem inferir que sempre é internet). Base de evolução por capacidades documentada para liberação futura incremental.

### 📋 Próximos passos imediatos:

1. Consolidar e validar o Módulo Agrícola em ambiente de desenvolvimento (fluxos completos: fornecedores, áreas, análises, safras, custos, produções, receitas e resultado).
2. Executar bateria de testes manuais de regressão entre Agricultura, Gestão Pecuária e módulos já estáveis.
3. Implementar validações adicionais nos handlers (go-playground/validator), priorizando novas rotas agrícolas.
4. Implementar recuperação de senha (requer configuração SMTP).
5. Evoluir dashboard com gráficos de produção (pecuária + agrícola).
6. Aplicar checklist de sincronização do memory bank em toda entrega relevante (activeContext/progress/systemPatterns/techContext no mesmo PR).

## 🛠️ Decisões Técnicas Ativas

### **Arquitetura e Stack**

- ✅ **Decidido**: Backend em **Go** usando framework **Gin**
- ✅ **Decidido**: Frontend em **Next.js 16.2.2** com App Router e Turbopack
- ✅ **Decidido**: **React 19.2.3** para melhor performance e novas features
- ✅ **Decidido**: Banco de dados **PostgreSQL** mantido (schema existente)
- ✅ **Decidido**: Estrutura **Monorepo** com `/backend` e `/frontend`
- ✅ **Documentado**: Padrão de frontend **DRY + composition (React) + abstração de lógica** (`services/`, `lib/`, `hooks/`, layouts compartilhados, Shadcn em `ui/`) — ver `memory-bank/systemPatterns.md` (subseção após a árvore do frontend).

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

### **Completude Geral**: 96%

- **Infraestrutura**: 95% ✅ (backend + frontend em produção + Dev Studio)
- **Documentação**: 95% ✅ (incluindo Dev Studio)
- **Implementação**: 95% ✅ (CRUD Animais, Produção, Registro, Prometheus, vínculo usuário–fazenda)
- **Testes**: 75% ✅ (testes unitários backend + E2E frontend + **scripts TestSprite** `TC001`–`TC009` contra a API local; ver `testsprite_tests/`)
- **Deploy**: 90% ✅ (backend Render + frontend Vercel; login e CRUD validados no ar)

---

**Última atualização**: 2026-05-08 (Assistente bloqueado para FUNCIONARIO na UI + RBAC explícito no backend; copy de reconexão Live ajustada)
**Contexto Ativo**: Go + Next.js 16 | Backend (Render) + Frontend (Vercel) em produção | Módulo Folgas 5x1 (UX mobile enxuta na grade + dialog de detalhes; geração pelo mês visível; GERENTE com gestão) | Restrições de leite (laboratório; registro só com lactação ativa) | Módulo Agrícola em consolidação | Assistente FAB + Live (exceto FUNCIONARIO) | Fazenda ativa | Dev Studio Fase 0–3 | TestSprite API (`testsprite_tests/`, MCP `generateCodeAndExecute`)
