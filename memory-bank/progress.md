# 📈 Progress - CeialMilk

## 📊 Status Geral do Projeto

### **Completude Geral**: 96%

```bash
🏗️  Infraestrutura: 95% ✅
📚  Documentação: 96% ✅ (memory bank alinhado a Folgas mobile + regras de negócio)
💻  Implementação: 96% ✅ (CRUD Animais, Produção, Gestão Pecuária, Módulo Agrícola avançado no código local, em consolidação)
🧪  Testes: 70% ✅ (unitários backend + E2E frontend)
🚀  Deploy: 90% ✅ (backend Render + frontend Vercel em produção)
```

### **Velocidade e Métricas**

- **Início do projeto**: 2025-09-07
- **Migração Arquitetural**: 2026-01-24
- **Velocity atual**: Em reestruturação
- **Team size**: 1 desenvolvedor
- **Sprint atual**: Migração para Go + Next.js
- **Progresso sprint**: 60% concluído

## ✅ O que foi concluído

### **Migração Arquitetural (✅ 65%)**

- [x] **Vínculo usuário–fazenda**: Tabela `usuarios_fazendas` (N:N); GET /api/v1/me/fazendas; GET/PUT /api/v1/admin/usuarios/:id/fazendas; fazenda única automática em formulários e home; admin atribui fazendas na edição de usuário; perfil não editável para ADMIN/DEVELOPER
- [x] **Limpeza**: Remoção completa de código Java/Spring legado
- [x] **Documentação**: Memory bank atualizado para nova stack
- [x] **Estrutura Monorepo**: Pastas `/backend` e `/frontend` criadas
- [x] **Backend Go**: Estrutura básica implementada
  - [x] Configuração e logger
  - [x] Modelos (Fazenda, Usuario)
  - [x] Repository pattern
  - [x] Service layer
  - [x] Handlers (CRUD Fazendas)
  - [x] Autenticação JWT (estrutura)
- [x] **Frontend Next.js**: Setup inicial
  - [x] Next.js 14+ configurado
  - [x] Tailwind CSS configurado
  - [x] Estrutura de pastas
  - [x] Cliente API básico

### **Infraestrutura (✅ 85%)**

- [x] **Estrutura Monorepo**: Criada e organizada
- [x] **Docker Compose**: Configurado para desenvolvimento local
- [x] **Dockerfile Backend**: Multi-stage build (Go 1.24), otimizado
- [x] **render.yaml**: Ajustado para Render (JWT sync:false, PORT injetado, buildFilter, autoDeployTrigger)
- [x] **CI/CD**: Build Docker do backend no pipeline
- [x] **Migrações**: golang-migrate no startup; V3 seed admin, V4 refresh tokens, V11 usuarios_fazendas
- [x] **Deploy Backend**: ✅ Funcionando em produção no Render (PostgreSQL, JWT, CORS)
- [x] **Deploy Frontend**: ✅ Funcionando em produção na Vercel; login, validate e CRUD validados no ar

### **Documentação (✅ 96%)**

- [x] **README.md**: Atualizado para nova stack
- [x] **Memory bank**: Atualizado (incl. Folgas 5x1 — regras de negócio, UX mobile, geração pelo mês visível — 2026-04-01)
  - [x] `activeContext.md`: Estado atual refletindo migração
  - [x] `techContext.md`: Stack Go + Next.js documentada
  - [x] `systemPatterns.md`: Padrões atualizados
  - [x] `deploy-notes.md`: Deploy atualizado
- [x] **AGENTS.md**: Diretrizes atualizadas para nova stack

## 🚧 Em andamento

### **Backend Go (🚧 88%)**

- [x] Estrutura básica e configuração
- [x] Modelos de domínio
- [x] Repository e Service para Fazendas (CRUD + search, count, exists)
- [x] Handlers HTTP (CRUD Fazendas, search, count, exists)
- [x] Sistema de migrações (golang-migrate no startup)
- [x] Autenticação (login, validate), JWT RS256, middleware
- [x] Chaves JWT de desenvolvimento (devcontainer)
- [x] Módulo agrícola (fornecedores, áreas, análises de solo, safras/culturas, custos, produções, receitas, resultado)
- [x] Módulo folgas 5x1 (migration 16, API, perfis FUNCIONARIO/GESTAO, página `/folgas`, motivos/exceção na célula, filtro visual por funcionário para gestão, fazenda por `/me/fazendas` em folgas para admin/dev)
- [ ] Validações de entrada adicionais

### **Frontend Next.js (🚧 82%)**

- [x] Setup inicial e configuração
- [x] Estrutura básica
- [x] Páginas de autenticação (login)
- [x] Páginas de gestão de fazendas (listagem, nova, editar, excluir)
- [x] Componentes Shadcn/UI (button, input, card, label, table, dialog)
- [x] TanStack Query configurado
- [x] Integração com API (auth + fazendas)
- [x] **Assistente – feedback "pode falar"**: Faixa visual e aria-live quando o assistente está aguardando a fala (fluxo "Deseja mais?" e dialog de confirmação); estados aguardandoMaisOperacao, micAbreEmBreve, preparandoOuvirConfirmacao; TTS "Pode falar." opcional
- [x] **Assistente em linguagem natural**: **FAB (botão flutuante)** no canto inferior direito, visível em todas as telas autenticadas; um toque abre o modal do assistente. Estado em `AssistenteContext`; modal em `AssistenteDialog` no layout; **assistente removido do Header** (desktop e mobile). AssistenteInput no Dialog — acessível em qualquer página. **Contexto do usuário e do sistema**: backend Interpretar recebe user_id, perfil e nome; AssistenteService carrega **fazendas vinculadas ao usuário** (GetByUsuarioID) e injeta no prompt do Gemini (nome, perfil, lista de fazendas id+nome); quando o usuário tem apenas uma fazenda e não menciona fazenda em cadastrar_animal, listar_animais_fazenda ou consultar_animais_fazenda, o LLM inclui fazenda_id e o backend usa resolveFazendaForUser (fallback uma fazenda + validação de acesso); intents por perfil (USER só fazendas; ADMIN/DEVELOPER futuros intents admin). **Intents**: Fazendas: cadastrar, listar, buscar, editar, excluir. **Animais**: consultar_animais_fazenda, listar_animais_fazenda, detalhar_animal, **cadastrar_animal** (fazenda + identificação + opcionais), **editar_animal** (id ou identificação + campos), **excluir_animal**, **registrar_producao_animal** (animal + quantidade litros). Redirect: animal → /animais/:id; animal_id → /animais/:id; fazenda_id → /fazendas/:id/animais. Interpretar (Gemini) + executar (FazendaService + AnimalService para consulta de animais), dialog de confirmação, entrada por voz (Web Speech API pt-BR). **Voz em modo contínuo**: reconhecimento contínuo, acúmulo de transcrição, finalização por clique no microfone ou timeout de silêncio (2,5 s). **Retorno em voz (TTS)** e **confirmação por voz** (sim/não). Persistência na edição (repository RowsAffected + ID), erro exibido dentro do dialog (error.details)
- [x] **Assistente Live sem fone (barge-in priorizado)**: cancelamento precoce do TTS ao detectar fala do usuário (interim), `getUserMedia` com `echoCancellation`/`noiseSuppression`/`autoGainControl`, janela anti-eco maior no mobile e reabertura do microfone sincronizada com fim do TTS; protocolo WS com `type: "interrupt"` + cancelamento de turno no backend para evitar respostas atrasadas.
- [x] **Layout e DRY**: PageContainer (variantes default, narrow, wide, centered) em todas as páginas; BackLink para "Voltar"; getApiErrorMessage (lib/errors.ts) centralizado; ApiResponse<T> em api.ts; Header responsivo com menu hamburger em mobile
- [x] **Módulo Administrador**: Perfis estruturados (USER, ADMIN, DEVELOPER); constraint unicidade DEVELOPER (migração 8); área admin `/admin/usuarios` (listagem, criar, editar, ativar/desativar); RequireAdmin; link Admin no Header para ADMIN/DEVELOPER
- [x] **UX e Acessibilidade**: Paleta rural (modo claro e escuro) em globals.css; toggle tema no Header e menu mobile com persistência (ThemeContext, ThemeToggle); tipografia 16px e alvos de toque 44px; ícones no menu (Farm, Cow, Milk, Users, Code); formulários e listas padronizados (space-y-5, botão lg, tabelas overflow-x-auto); home com atalhos (Ver fazendas, Ver animais, Registrar produção)
- [x] **Fluxos de acesso e onboarding**: Header oculto em `/registro`; botão "Voltar para login" no onboarding faz logout; restrição de acesso às páginas de fazenda para USER (gateway em `/fazendas`, `/fazendas/[id]` admin-only); correção de erro no `AnimalForm` ao iniciar nova criação
- [x] **Módulo Agricultura no App Router**: dashboard `/agricultura`, CRUD de fornecedores e áreas, análises de solo, safras/culturas, custos, produções, receitas, resultado por fazenda/ano e comparativo de fornecedores, com serviços dedicados em `src/services/agricultura.ts`
- [x] **Folgas UX mobile (refatoração + polimento)**: layout mobile reorganizado mantendo grade mensal; alertas/equidade colapsáveis; célula tocável no mobile (sem rótulo “Ver detalhes” repetido; botão explícito só `md+`); `FolgasDiaDetalhesDialog`; grade com texto mínimo e indicador compacto para fora do rodízio no celular; histórico em cards no mobile e tabela no desktop

## 📋 Próximos Passos

### **Sprint Atual (Migração)**

- [x] Limpeza de código legado
- [x] Atualização de documentação
- [x] Estrutura monorepo
- [x] Backend Go básico
- [x] Frontend Next.js básico
- [x] Sistema de migrações (golang-migrate)
- [x] Autenticação (login, validate) + JWT
- [x] Backend Render configurado (render.yaml, Dockerfile, CI Docker build)
- [x] ✅ **Deploy Backend em produção** (Render - configuração manual com banco PostgreSQL e chaves JWT)
- [x] ✅ **Deploy Frontend em produção** (Vercel; `NEXT_PUBLIC_API_URL`; login, validate e CRUD validados)

### **Sprint 2 (Funcionalidades Core)**

- [x] Login + CRUD de Fazendas no frontend
- [ ] Autenticação completa (registro, refresh tokens)
- [ ] CRUD de Animais (backend + frontend)
- [ ] CRUD de Produção de Leite (backend + frontend)
- [ ] Validações e tratamento de erros

### **Sprint 4 (Consolidação Módulo Agrícola)**

- [x] Migration 15 e estrutura de domínio agrícola no backend
- [x] Rotas de API agrícola registradas em `cmd/api/main.go`
- [x] Navegação e páginas agrícolas no frontend
- [ ] Validação integrada final (dados reais + permissões + cenários de erro)
- [ ] Testes automatizados dedicados ao módulo agrícola

### **Sprint 3 (Melhorias)**

- [ ] Testes unitários (Go)
- [ ] Testes de integração
- [ ] Observabilidade (Sentry, BetterStack)
- [ ] Otimizações de performance
- [ ] Documentação de API

## 🎯 Metas de Curto Prazo

### **Meta 1: MVP Básico (4 semanas)**

- [ ] CRUD completo de todas as entidades principais
- [ ] Autenticação JWT funcional
- [ ] API RESTful operacional
- [ ] Deploy em ambiente de produção
- [ ] Interface básica funcional

### **Meta 2: Operacional (8 semanas)**

- [ ] Controle de saúde animal implementado
- [ ] Gestão reprodutiva básica
- [ ] Relatórios analíticos iniciais
- [ ] Versão mobile responsiva
- [ ] Testes de integração cobrindo 70%

### **Meta 3: Inteligência (12 semanas)**

- [ ] Sistema de predições de produção
- [ ] Alertas automáticos de saúde preventiva
- [ ] Otimização de recursos através de IA
- [ ] Integração com dispositivos IoT
- [ ] Dashboard analítico completo

## 📊 Métricas de Progresso Detalhadas

### **Desenvolvimento**

```progress
████████▄▄ 80%
```

### **Qualidade**

```progress
▄▄▄▄▄▄▄▄▄▄ 0%
```

### **Documentação**

```progress
█████████▄ 90%
```

### **Infraestrutura**

```progress
██████████ 90%
```

## 🔄 Histórico de Progresso

### **2026-03-25 - Folgas e fazenda ativa (UX)**

- ✅ **`/folgas` — filtro por funcionário**: Gestão (ADMIN/DEVELOPER/GESTAO) pode usar “Visualizar folgas de” para destacar apenas os dias de folga do usuário selecionado e esmaecer os demais; contagem de dias no mês.
- ✅ **`/folgas` — fazenda para ADMIN/DEVELOPER**: Passa a usar `GET /api/v1/me/fazendas` (vínculos), não a lista global de fazendas; seletor na página só quando há **mais de uma** fazenda vinculada; uma única fazenda é usada automaticamente; troca sincronizada com `setFazendaAtiva`.
- ✅ **`FazendaContext`**: Tratamento explícito de 0, 1 e N fazendas retornadas por `getMinhasFazendas`; com exatamente uma fazenda, sempre define como ativa e persiste (sobrescreve necessidade de `savedId` prévio).

### **2026-03-26 - Folgas (mensagens de erro amigáveis)**

- ✅ **`unique_violation` / “duplicate key”**: backend e frontend agora convertem mensagens genéricas de duplicidade para texto orientativo no fluxo de **alterar dia** da escala 5x1 (evita exibir “duplicate key” ao usuário).

### **2026-03-26 - Folgas: permissões de gestão para GERENTE**

- ✅ `GERENTE` agora é tratado como perfil com permissões de gestão na tela `/folgas` (front) e nas validações de API para gerar/alterar escala (back).
- ✅ Os combos de usuários continuam restringindo as opções para `FUNCIONARIO` e `GERENTE` (com `GESTAO` como compatibilidade).

### **2026-03-26 - Folgas: UX mobile com detalhes por dia**

- ✅ **Hierarquia mobile da página**: navegação de mês + ações em bloco compacto, com melhor priorização visual no topo.
- ✅ **Alertas e Equidade no mobile**: exibidos em seções colapsáveis para reduzir rolagem antes do calendário.
- ✅ **Células do calendário**: simplificadas para resumo visual (status do dia + indicadores), removendo excesso de texto no grid.
- ✅ **Interação touch-friendly**: novo dialog “Detalhes do dia” com previsão do rodízio, registros e ações contextuais (Alterar/Justificar).
- ✅ **Histórico responsivo**: cards no mobile e tabela mantida no desktop.

### **2026-04-01 - Folgas: polimento mobile e documentação de regras**

- ✅ **Célula sem poluição horizontal**: remoção do texto “Ver detalhes” em todas as células no mobile; toque na célula abre detalhes; teclado `Enter`/`Espaço` suportado.
- ✅ **Texto na grade**: rótulo curto do previsto (nome ou `#id`); sem “folga(s)” genérico duplicado; `—` quando não há folga; “Exceção” curto no grid; fora do rodízio como ponto âmbar no mobile e badge no desktop.
- ✅ **Regra de negócio documentada**: “Gerar mês automático” preenche o **mês visível** no calendário (intervalo início–fim do mês navegado), preservando registros `MANUAL`.
- ✅ **Memory bank**: `activeContext`, `progress`, `systemPatterns`, `techContext`, `productContext`, `projectbrief` atualizados.

### **2026-03-26 - Admin usuários: padrão UI + auto-vínculo de fazenda única**

- ✅ **UI da rota `/admin/usuarios` padronizada**: campo de perfil no formulário de usuário migrado de `<select>` nativo para `Select` Shadcn.
- ✅ **Perfis no admin alinhados**: inclusão de `GERENTE` no formulário de edição/criação e mapeamento completo de labels na tabela (USER, FUNCIONARIO, GERENTE, GESTAO, ADMIN, DEVELOPER).
- ✅ **Correção de edição de perfil**: usuários com perfil `GERENTE` deixam de sofrer fallback indevido para `USER` no estado inicial do formulário.
- ✅ **Auto-vínculo backend para fazenda única**: rotina idempotente aplicada em `POST /api/auth/register`, `POST /api/v1/admin/usuarios` e no fluxo de login/validate para backfill progressivo de usuários já cadastrados sem vínculo.

### **2026-02-15 - Melhorias Módulo Gestão Pecuária**

- **Componentes reutilizáveis**: GestaoListLayout, GestaoFormLayout, useAnimaisMap
- **Tabelas**: CioTable, PartoTable, LactacaoTable, CoberturaTable, ToqueTable, SecagemTable, GestacaoTable — exibem identificação do animal
- **Formulários**: DatePicker, Select Shadcn, getApiErrorMessage
- **Cios CRUD completo**: PUT backend, página de edição, Excluir com Dialog

### **2026-02-12 - Assistente Live: prioridade de fala do usuário (barge-in)**

- ✅ **Frontend**: Detecção precoce de fala (interim) para interromper TTS antes do `isFinal`; envio de `interrupt` antes de novo `text`; prewarm do microfone com AEC/NS/AGC; reabertura do microfone no Live respeitando janela anti-eco (desktop/mobile).
- ✅ **Backend**: Sessão Live com controle de turno (`BeginTurn`, `InterruptTurn`, `FinishTurn`) e contexto cancelável por turno.
- ✅ **Respostas antigas bloqueadas**: Escritas no WebSocket condicionadas ao turno ativo (`WriteWSJSONForTurn`, `WriteWSMessageForTurn`) para impedir sobreposição/confusão após interrupção.

### **2026-02-10 - Assistente flutuante (FAB) e remoção do Header**

- ✅ **FAB e contexto**: Acesso ao assistente via botão flutuante (FAB) fixo no canto inferior direito; visível apenas em rotas autenticadas; um toque abre o modal. Estado compartilhado em `AssistenteContext` (AssistenteProvider em Providers).
- ✅ **Remoção do Header**: Botão e Dialog do assistente removidos do Header (desktop e mobile). Modal renderizado no layout via `AssistenteDialog`; FAB via `AssistenteFab` em ConditionalHeader.

### **2026-02-08 - Assistente Virtual Multimodal Live**

- ✅ **Implementação Completa**: Substituição da solução antiga por uma interface de voz em tempo real via WebSockets.
- ✅ **Function Calling**: Integração direta com os serviços de Fazenda, Animal e Produção.
- ✅ **Contexto Inteligente**: Suporte a usuário logado e fazenda ativa selecionada no sistema.
- ✅ **UI/UX**: Visualizador de ondas sonoras e transcrição em tempo real.
- ✅ **Correção de Erros**: Resolvidos problemas de compilação e tipos no Protocol Buffers.

### **2026-02-08 - Correção Assistente Live**

- ✅ **Correção de Erros de Compilação**: Resolvidos problemas no `assistente_live_handler.go` e `assistente_live_service.go` que impediam o build do backend.
  - Removido import `encoding/base64` não utilizado.
  - Exportados campos `UserID`, `Perfil`, `NomeUsuario` e `FazendaAtiva` na struct `Session` para acesso pelo handler.
  - Corrigida asserção de tipo em `processFunctionResponse` para garantir que o resultado seja `map[string]any` antes de enviar ao Gemini.

### **2026-02-08 - Assistente em qualquer navegador (incl. mobile)**

- ✅ **Compatibilidade cross-browser**: Assistente Live passa a funcionar em qualquer navegador, inclusive mobile (Safari iOS, Chrome Android, Firefox Android, etc.).
  - **Frontend**: Removida a captura de áudio bruto em `useGeminiLive` (ScriptProcessorNode/AudioContext falhavam em Safari e vários mobile). Entrada por voz continua via Web Speech API (transcrição no cliente → `sendText()`).
  - **Fallback texto**: Quando o navegador não suporta reconhecimento de voz, o modo Live permanece disponível em **apenas texto** (digitar e enviar com Enter ou botão Enviar); mensagem orienta o usuário.
  - **UI**: Botão do Assistente Live visível mesmo sem suporte a voz; no Live, botão Enviar envia o texto digitado via WebSocket quando em modo Live.
  - **Documentação**: `systemPatterns.md` e `activeContext.md` atualizados com o padrão de compatibilidade.
  - Ajustado `ExecuteFunction` para retornar `map[string]any` em vez de `map[string]string`.

### **2025-09-07 - Dia 1**

- ✅ **Setup inicial**: Estrutura do projeto criada (Java/Spring)
- ✅ **Docker compose**: Serviços configurados (PostgreSQL, Redis, App)
- ✅ **Maven setup**: Dependências configuradas com Spring WebFlux
- ✅ **Documentação**: README.md e memory bank inicializados
- ✅ **Schema DB**: Estrutura inicial do banco de dados

### **2025-09-08 - Dia 2**

- ✅ **Entidade Fazenda**: Implementação completa do CRUD reativo (Java)
- ✅ **Sistema de autenticação**: JWT com Spring Security 6 configurado
- ✅ **Controller de autenticação**: Endpoints de login e validação
- ✅ **API RESTful**: Endpoints funcionais para Fazenda

### **2026-01-24 - Migração Arquitetural**

- ✅ **Decisão de Stack**: Migração para Go + Next.js definida
- ✅ **Limpeza**: Remoção de código Java/Spring legado
- ✅ **Documentação**: Memory bank completamente atualizado
- ✅ **Estrutura Monorepo**: `/backend` e `/frontend` criados
- ✅ **Backend Go**: Estrutura básica implementada
  - Configuração, logger, modelos
  - Repository, Service, Handlers
  - CRUD Fazendas funcional
- ✅ **Frontend Next.js**: Setup inicial completo
  - Next.js 14+ configurado
  - Tailwind CSS configurado
  - Estrutura de pastas
- ✅ **Backend Render**: render.yaml e Dockerfile ajustados (JWT sync:false, PORT injetado, buildFilter, autoDeployTrigger); Dockerfile Go 1.24; CI com build Docker; deploy-notes atualizado

### **2026-01-25 - Deploy em Produção**

- ✅ **Deploy Backend**: Backend funcionando em produção no Render
  - Banco PostgreSQL criado e configurado
  - Variáveis de ambiente configuradas (DATABASE_URL, JWT_PRIVATE_KEY, JWT_PUBLIC_KEY, ENV, LOG_LEVEL, CORS_ORIGIN)
  - Chaves JWT geradas e configuradas (par RSA via openssl)
  - Health check e rotas de API operacionais
  - Migrações executadas automaticamente no startup
- ✅ **Deploy Frontend**: Frontend funcionando em produção na Vercel
  - Repositório conectado, Root Directory `frontend`, `NEXT_PUBLIC_API_URL` apontando para o backend
  - Correção 401 pós-login: cookies `SameSite=None` em produção cross-origin (Vercel + Render)
  - Login, validate e CRUD de fazendas validados no ar

### **Próximos Marcos**

- **2026-02-07**: Testes automatizados (E2E ou unitários) iniciados
- **2026-02-14**: Deploy completo em produção (Render + Vercel) ✅ concluído
- **2026-02-21**: Testes de integração implementados

## 🎯 Objetivos de Aprendizado

### **Técnicos**

- [x] Entender arquitetura Go e padrões
- [x] Dominar Gin framework
- [x] Aprender Next.js App Router
- [x] Implementar autenticação JWT RS256
- [x] Configurar backend para Render (render.yaml, Dockerfile, CI Docker build)
- [x] ✅ **Deploy Backend em produção** (Render - configuração manual com banco PostgreSQL e chaves JWT)
- [x] ✅ **Deploy Frontend em produção** (Vercel; `NEXT_PUBLIC_API_URL`; login, validate e CRUD validados)

### **Produto**

- [ ] Entender necessidades reais de fazendas leiteiras
- [ ] Coletar feedback constante dos usuários
- [ ] Iterar rapidamente baseado em métricas
- [ ] Desenvolver visão de produto clara

## 📈 Evolução das Decisões

### **Decisões Consolidadas**

- ✅ Stack técnica: Go (Gin) + Next.js 14+ + PostgreSQL
- ✅ Banco de dados: PostgreSQL com schema mantido
- ✅ Autenticação: JWT RS256 com refresh tokens
- ✅ Infraestrutura: Monorepo com Render (backend) + Vercel (frontend)
- ✅ Segurança: Cookies HttpOnly, Bcrypt, CORS estrito
- ✅ Observabilidade: Sentry, BetterStack, Prometheus
- ✅ Sistema de migrações: golang-migrate no startup

### **Decisões em Avaliação**

- 🔄 Estratégia de cache (Redis vs in-memory)
- 🔄 Estratégia de testes (table-driven vs outros padrões)

---

### **2026-01-26 - Dev Studio Fase 1**

- ✅ **Dev Studio Fase 1**: Automação de PRs via GitHub API implementada
  - GitHubService criado com integração completa à GitHub API REST
  - Endpoint `/api/v1/dev-studio/implement/:request_id` para criar PRs
  - Componente PRStatus no frontend para exibir informações do PR
  - Fluxo completo: validação → criação de PR → exibição de status
  - Migração 7_add_pr_fields_to_dev_studio para campos PR no banco
  - Documentação atualizada (QUICK_START.md, SETUP.md)

### **2026-01-26 - Dev Studio Fase 2**

- ✅ **Dev Studio Fase 2**: RAG dinâmico e monitoramento implementados
  - RAG dinâmico: `loadProjectContext` retorna mapa de arquivos; `selectRelevantContext` escolhe systemPatterns + techContext (fixos) + até 2 docs variáveis (activeContext, progress, productContext, projectbrief) por relevância ao prompt (keywords). Fallback activeContext se todos score 0.
  - API `GET /api/v1/dev-studio/usage`: retorna `used_last_hour`, `limit_per_hour`, `used_today`. **Não consome** rate limit.
  - Rate limit: `GET /api/v1/dev-studio/usage` excluído do limite de 5 req/hora.
  - Frontend: `UsageAlert` (métricas + alertas próximo/limite), integração na página Dev Studio, `ChatInterface` desabilita envio ao limite e exibe mensagem clara em 429.

### **2026-01-26 - Contexto tipo Cursor e contexto do repositório**

- ✅ **Contexto tipo Cursor**: `loadTargetFilesForPrompt` infere arquivos-alvo (menu, Header, rota, link, dev-studio) e inclui o estado atual no contexto. Instruções no prompt: usar como base, preservar o resto; trabalhar como IDE. Geração e refinamento usam o mesmo fluxo.
- ✅ **Contexto sempre do repositório**: Com `GITHUB_TOKEN` + `GITHUB_REPO` configurados, exemplos de código e arquivos-alvo vêm sempre da **branch de produção** (`GITHUB_CONTEXT_BRANCH`, default `main`) via `GitHubService.GetFileContent`. Config `GITHUB_CONTEXT_BRANCH`; fallback para disco local quando GitHub não está configurado. Solução validada em uso.

### **2026-01-26 - Dev Studio Fase 3 (Diff Viewer e Linter Automático)**

- ✅ **Diff Viewer**: Visualização de diferenças entre código gerado e código atual no repositório
  - Backend: `GetFileDiffs()` no `DevStudioService` que compara código gerado com conteúdo da branch `main` via `GitHubService.GetFileContent()`
  - Endpoint `GET /api/v1/dev-studio/diff/:request_id` com validação de perfil DEVELOPER
  - Frontend: componente `DiffViewer` customizado usando biblioteca `diff` para cálculo de diferenças
  - Integração no `CodePreview` com tabs "Preview" e "Diff" para alternar entre visualizações
  - Exibição linha por linha com cores (verde para adições, vermelho para remoções)
- ✅ **Linter Automático**: Validação sintática e de lint para Go e TypeScript
  - Backend: `LinterService` com validação básica de sintaxe (arquivos vazios, chaves balanceadas)
  - Integração no `ValidateCode()` do `DevStudioService` retornando `ValidationResult` com erros e avisos
  - Endpoint `POST /api/v1/dev-studio/validate/:request_id` atualizado para retornar resultados do linter
  - Frontend: exibição de erros e avisos do linter em boxes coloridos (amber para avisos, red para erros)
  - Botão "Criar PR" desabilitado quando `validationResult.has_errors` é true

### **2026-01-26 - Dev Studio - Cancelamento de Requisições**

- ✅ **Cancelamento de Requisições**: Funcionalidade completa para cancelar requisições geradas
  - Backend: método `CancelRequest()` no `DevStudioService` com validação de autorização (apenas dono pode cancelar) e proteção contra cancelamento de requisições já implementadas (com PR criado)
  - Endpoint `DELETE /api/v1/dev-studio/:request_id` com validação de perfil DEVELOPER
  - Auditoria de cancelamentos registrada em `dev_studio_audit`
  - Frontend: botão "Cancelar" no `CodePreview` (visível apenas quando status não é "cancelled" ou "implemented")
  - Dialog de confirmação moderno usando Shadcn/UI Dialog (substituindo `confirm()` nativo)
  - Atualização automática do histórico após cancelamento via `refreshTrigger` no `HistoryPanel`
  - Badge "Cancelado" no `HistoryPanel` e filtro por status "cancelled"
  - Status "cancelled" exibido no histórico e no preview de código

### **2026-01-27 - Assistente: persistência e feedback de erro**

- ✅ **Persistência na edição**: Repositório de fazendas valida ID no Update e verifica RowsAffected (erro se nenhuma linha atualizada); queryList corrigido (cópia por linha). Assistente valida ID da fazenda resolvida e log de debug.
- ✅ **Erro na confirmação**: Frontend exibe erro **dentro** do dialog de confirmação; getErrorMessage prioriza `error.details` (motivo real da API) sobre `error.message`; limpeza de erro ao cancelar e ao tentar confirmar novamente.

### **2026-02-01 - Assistente: buscar fazenda**

- ✅ **Intent buscar_fazenda**: Nova intent para pesquisar fazendas por nome via assistente (ex.: "buscar fazenda Sítio X", "pesquisar fazenda X")
- ✅ **Backend**: Prompt do Gemini atualizado; `executarBuscarFazenda` usa `SearchByNome`; retorna 1 fazenda ou lista; mensagens específicas no handler
- ✅ **Frontend**: `getRedirectPathFromResult` redireciona para `/fazendas/:id` quando 1 resultado; `lastRedirectPathRef` para fluxo de voz (Deseja mais? → não)

### **2026-02-01 - Assistente: consultar animais por fazenda**

- ✅ **Intent consultar_animais_fazenda**: Nova intent para perguntas como "quantas vacas tem na fazenda X" (ex.: "quantas vacas tem na fazenda Larissa")
- ✅ **Backend**: AssistenteService com AnimalService; prompt com intent e exemplos; `executarConsultarAnimaisFazenda` usa `resolveFazendaByPayload` + `CountByFazenda`; retorna message, count, fazenda_nome; handler coloca message no envelope para TTS
- ✅ **Frontend**: Sem alteração; getRedirectPathFromResult retorna /fazendas para objeto sem id; TTS usa message do envelope

### **2026-02-01 - Assistente: listar animais e detalhar animal**

- ✅ **Intent listar_animais_fazenda**: "quais animais tem na fazenda X", "me dá mais informações sobre os animais da fazenda Y"; retorna message + lista (identificação, raça, sexo, status) + fazenda_id; redireciona para /fazendas/:id/animais
- ✅ **Intent detalhar_animal**: "detalhes do animal 123", "informações sobre o animal identificação Y"; por id ou identificacao; retorna message + animal; redireciona para /animais/:id
- ✅ **Backend**: executarListarAnimaisFazenda, executarDetalharAnimal, formatAnimalMessage; handler coloca message no envelope
- ✅ **Frontend**: getRedirectPathFromResult trata data.animal → /animais/:id e data.fazenda_id → /fazendas/:id/animais

### **2026-02-01 - Página de detalhes do animal e operações**

- ✅ **Página /animais/[id]**: Detalhes do animal (identificação, raça, nascimento, sexo, status), fazenda (nome + link para animais da fazenda), resumo de produção (total, média, nº registros), ações Editar, Excluir, Registrar produção
- ✅ **Página /fazendas/[id]/animais**: Listagem de animais da fazenda; link "Novo Animal" com fazenda pré-selecionada
- ✅ **AnimalTable**: Botão "Ver" que leva para /animais/:id
- ✅ **animais/novo**: Invalidação de ['fazendas', fazenda_id, 'animais'] ao criar animal

### **2026-02-01 - Assistente: operações completas para animais**

- ✅ **cadastrar_animal**: Fazenda (nome ou id) + identificação + raça, data_nascimento, sexo, status_saude opcionais; retorna { message, animal }; redirect /animais/:id
- ✅ **editar_animal**: id ou identificação + identificacaoNovo, raca, data_nascimento, sexo, status_saude, fazenda_id; retorna { message, animal }; redirect /animais/:id
- ✅ **excluir_animal**: id ou identificação; retorna { message, id }; redirect /animais
- ✅ **registrar_producao_animal**: animal (id ou identificação) + quantidade (litros) + data_hora/qualidade opcionais; retorna { message, animal_id, producao }; redirect /animais/:animal_id
- ✅ **Backend**: ProducaoService no AssistenteService; resolveAnimalByPayload; ErrAnimalIdentificacaoDuplicada; handler com Conflict para identificação duplicada
- ✅ **Frontend**: getRedirectPathFromResult trata data.animal_id → /animais/:id

### **2026-02-16 - Ajustes Assistente e Gestão Pecuária**

- ✅ **useAnimaisMap**: Garantia de array iterável (`Array.isArray(data) ? data : []`) para evitar "animais is not iterable" em rotas como `/gestao/toques`
- ✅ **Assistente Virtual (modo Live)**: Resposta exibida como texto puro (sem ReactMarkdown), sem negrito a partir de `*`; usuário não precisa "falar" asterisco; TTS e visual consistentes

### **2026-02-03 - Assistente: contexto fazendas do usuário e fallback uma fazenda**

- ✅ **Interpretar**: Fazendas vinculadas ao usuário (GetByUsuarioID) em vez de GetAll; prompt com regra para cadastrar_animal, listar_animais_fazenda e consultar_animais_fazenda: quando o usuário tem apenas UMA fazenda e não menciona fazenda, incluir fazenda_id no payload
- ✅ **Executar**: userID passado a executarCadastrarAnimal, executarConsultarAnimaisFazenda, executarListarAnimaisFazenda
- ✅ **resolveFazendaForUser**: Nova função (keyID/keyNome) para resolver fazenda validando que pertence ao usuário; fallback quando o usuário tem exatamente uma fazenda; validação de acesso (erro "fazenda não encontrada ou você não tem acesso a ela")
- ✅ Cadastrar animal sem informar fazenda passa a funcionar para usuário com uma fazenda vinculada

### **2026-01-31 - Sprint 2 Concluída**

- ✅ **CRUD de Animais**: Model, repository, service, handler, migração + Frontend completo
- ✅ **CRUD de Produção de Leite**: Model, repository, service, handler, migração + Frontend completo
- ✅ **Registro de Usuários**: Endpoint `POST /api/auth/register` + Página de registro no frontend
- ✅ **Prometheus Metrics**: Middleware de métricas + endpoint `/metrics`
- ✅ **Testes Unitários Backend**: Testes table-driven para models e services
- ✅ **Testes E2E Frontend**: Configuração Playwright + testes de autenticação e navegação

---

**Última atualização**: 2026-04-01
**Status**: Backend (Render) + Frontend (Vercel) em produção ✅ | Gestão Pecuária estável | Folgas 5x1 com UX mobile refinada + dialog de dia | Módulo Agrícola em consolidação | Assistente FAB + Live | CRUD Fazendas, Animais, Produção | Testes unitários e E2E configurados
**Próxima revisão**: 2026-04-08
