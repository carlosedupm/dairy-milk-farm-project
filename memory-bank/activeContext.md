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
- **Migrações**: golang-migrate no startup; seed do usuário admin (V3); refresh tokens (V4); Dev Studio (V5, V6); constraint unicidade DEVELOPER (V8); vínculo usuário–fazenda (V11 – tabela usuarios_fazendas); origem de aquisição em animais (V13 – origem_aquisicao NASCIDO|COMPRADO); touro_animal_id em coberturas (V14 – vinculação reprodutor em monta natural); **folgas 5x1** (V16 – `folgas_escala_config`, `escala_folgas`, `folgas_justificativas`, `folgas_excecoes_dia`, `folgas_alteracoes`)
- **Postman**: Rotas compatíveis com a collection (`/api/auth/*`, `/api/v1/fazendas/*`)
- **Frontend + Backend**: Integração validada — login, listagem, criar/editar/excluir fazendas (dev e **produção** Vercel + Render)
- **Devcontainer**: `DATABASE_URL` e `PORT` pré-configurados; backend via `go run ./cmd/api`
- **Resiliência**: Se o Postgres falhar (ex.: pg_hba), o backend sobe e expõe apenas `GET /health`; auth/fazendas ficam inativos até o DB estar ok
- **Postgres no compose**: `scripts/db/init-pg-hba.sh` + `ssl=off` para aceitar conexões do devcontainer (após recriar o volume)
- **Dev Studio (Fase 0 + Fase 1 + Fase 2 + Fase 3)**: Área de desenvolvimento interativa com IA integrada — geração de código via Gemini API, validação sintática, preview, histórico, criação automática de PRs via GitHub API, **RAG dinâmico** (seleção de contexto por palavras-chave), **monitoramento** (GET /usage, alertas de limite, tratamento 429), **Refinar** (feedback para corrigir divergências) e **exemplos de código** (handler/service/repository/model/response de Fazenda) sempre incluídos no contexto da IA. **Contexto tipo Cursor**: quando o prompt indica edição de menu/UI (ex.: "menu", "Header", "rota", "link", "dev-studio"), o backend inclui o **estado atual** dos arquivos-alvo (ex.: `Header.tsx`, `layout.tsx`) e instruções para **editar em cima do existente** e **preservar** o que não foi pedido para alterar. **Contexto sempre do repositório**: quando `GITHUB_TOKEN` e `GITHUB_REPO` estão configurados, **exemplos** e **arquivos-alvo** são sempre buscados da **branch de produção** (`GITHUB_CONTEXT_BRANCH`, default `main`) no GitHub, pois o resultado aprovado irá para lá (PR → merge). **Diff Viewer**: visualização de diferenças entre código gerado e código atual no repositório (comparação linha por linha). **Linter Automático**: validação sintática e de lint para Go e TypeScript com exibição de erros e avisos. **Cancelamento de Requisições**: funcionalidade para cancelar requisições geradas (status "cancelled"), com dialog de confirmação moderno (Shadcn/UI) e atualização automática do histórico.
- **Assistente Virtual Multimodal Live (Gemini 2.0 Flash)**: 
  - **Acesso via FAB**: Botão flutuante (FAB) fixo no canto inferior direito, visível em todas as telas autenticadas; um toque abre o modal do assistente. O assistente **não fica mais no Header** — estado compartilhado via `AssistenteContext`; modal renderizado no layout (`AssistenteDialog`) junto com o FAB (`AssistenteFab`).
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
- **Módulo Administrador**: Área admin (`/admin/usuarios`) para ADMIN e DEVELOPER — listagem, criar, editar e ativar/desativar usuários. Perfis USER, **FUNCIONARIO**, **GESTAO**, ADMIN, DEVELOPER; constraint de unicidade para DEVELOPER no banco. Rotas `GET/POST /api/v1/admin/usuarios`, `PUT /api/v1/admin/usuarios/:id`, `PATCH /api/v1/admin/usuarios/:id/toggle-enabled`, `GET/PUT /api/v1/admin/usuarios/:id/fazendas`. Perfil DEVELOPER não atribuível via API. **Fazendas vinculadas**: somente ADMIN (ou DEVELOPER) pode atribuir quais fazendas cada usuário acessa, na tela de edição de usuário (seção "Fazendas vinculadas" com checkboxes + "Salvar vínculos"). **Perfil não editável**: ao editar um usuário com perfil ADMIN ou DEVELOPER, o campo perfil é somente leitura (frontend e backend preservam o perfil).
- **Módulo Folgas (escala 5x1)**: Por fazenda — configuração com data âncora e três usuários vinculados (slots do rodízio), geração automática mensal (preserva dias `MANUAL`), alteração de dia por **GESTAO**/**ADMIN**/**DEVELOPER** (sem validação de “equidade” no backend), justificativa apenas por **FUNCIONARIO** no próprio dia de folga, alertas quando há mais de um de folga no mesmo dia sem exceção do dia ou sem todas as justificativas. **`GET .../folgas/escala`** devolve `linhas` + **`rodizio_por_dia`** (previsto `UsuarioParaDia` em todo o intervalo, inclusive dias sem registro) e campos de rodízio nas linhas; **`GET .../folgas/resumo-equidade`** (gestão) compara folgas registradas vs previstas no período por slot. **UX**: grade com previsto vs real, badge “Fora do rodízio”, painel **Equidade no mês** e avisos **informativos** (não bloqueantes); diálogo **Substituir** pede confirmação extra se divergir do previsto. API sob `/api/v1/fazendas/:id/folgas/*` e `GET /api/v1/fazendas/:id/usuarios-vinculados`. Escala lista **motivo** e **excecao_motivo_dia**; FUNCIONARIO vê exceção do dia só se for folguista naquele dia. Seletor **“Visualizar folgas de”**; fazenda única automática para admin/dev; `/folgas` no Header. `AuthContext` com `user.id`.
- **Módulo Folgas (escala 5x1) — tratamento de conflito**: erros de banco por duplicidade (`unique_violation`) agora são mapeados/convertidos para mensagens amigáveis na UI (evitando exibir “duplicate key” ao usuário e orientando sobre o modo correto: `Substituir o dia inteiro` vs `Adicionar outra folga`).
- **Restrição por perfil (FUNCIONARIO → só Folgas)**: Matriz em `frontend/src/config/appAccess.ts` (menu, landing, guarda de rotas, visibilidade do assistente) espelhada em `backend/internal/auth/perfil_access.go` (`RequirePerfilAPIAccess` em rotas `/api/v1/*`). FUNCIONARIO não acessa outras APIs nem outras rotas da app por URL direta (403 / redirecionamento para `/folgas`).
- **Cadastro padrão**: `POST /api/auth/register` cria usuários com perfil `FUNCIONARIO` (landing e acesso limitados à área de Folgas).
- **Vínculo usuário–fazenda e fazenda única**: Tabela `usuarios_fazendas` (N:N). Endpoint `GET /api/v1/me/fazendas` retorna as fazendas vinculadas ao usuário logado. **`FazendaContext`**: se **não** há fazendas, limpa estado; se há **exatamente uma**, **sempre** define essa fazenda como ativa e persiste em `localStorage` (sem depender de valor pré-existente); se há **duas ou mais**, mantém restauração pela chave salva quando válida. **`FazendaSelector`** no header só renderiza o dropdown quando há **mais de uma** fazenda vinculada. Formulários de novo animal e nova produção com fazenda única seguem sem seletor; atalhos da home apontam direto quando aplicável. Admin atribui fazendas a usuários na edição de usuário.
- **Módulo Custos Agrícolas**: Migration 15 (fornecedores, areas, analises_solo, safras_culturas, custos_agricolas, producoes_agricolas, receitas_agricolas). Backend: CRUD completo fornecedores, áreas, análises solo, safras/culturas; custos, produções e receitas por safra/cultura (com seleção de fornecedor); resultado por área/safra e consolidado; comparativo de fornecedores por safra. Frontend: dashboard Agricultura; CRUD fornecedores e áreas (incl. edição); análises de solo (listagem e nova por área); safras/culturas por área/ano (dialog criar cultura); detalhe safra/cultura com custos, produções, receitas e formulários (com FornecedorSelect em custos e receitas); resultado por safra; comparativo fornecedores. Acesso via menu "Agricultura" (ícone Wheat). Próximo: integração Assistente Virtual.

### 🚧 Em andamento:

- **Consolidação do Módulo Agrícola**: backend (handlers/services/repositories/models + migration 15) e frontend (`/agricultura`) já estruturados no workspace, com ajustes finais de validação integrada e fechamento dos fluxos ponta a ponta.

### ✅ Concluído desde a última atualização:

1. ✅ **Folgas — clareza 5x1 e equidade informativa**: API escala com `rodizio_por_dia` e campos esperados por linha; `resumo-equidade` para gestão; UI com painel/aviso de equidade, tooltip e confirmação ao substituir fora do previsto (sem bloqueio no servidor).
2. ✅ **RBAC configurável por perfil**: `appAccess.ts` + `RouteAccessGuard` no frontend; `RequirePerfilAPIAccess` no backend; FUNCIONARIO com acesso apenas a Folgas no menu e APIs permitidas (alinhado à matriz).
3. ✅ **Folgas — UX gestão e fazenda**: Filtro opcional por funcionário na página `/folgas` (destaque dos dias de folga do selecionado); ADMIN/DEVELOPER em folgas restringidos às fazendas de `/me/fazendas` com seleção automática quando há só uma; `FazendaContext` com regra explícita para 0 / 1 / N fazendas vinculadas.
4. ✅ **Módulo Folgas 5x1**: Migration 16, perfis FUNCIONARIO/GESTAO, API e página `/folgas` com calendário mensal, permissões por perfil, motivos e exceção do dia na célula, e teste unitário `UsuarioParaDia`.
5. ✅ **Folgas — combos filtram apenas FUNCIONARIO e GERENTE**: Dropdowns na página `/folgas` passam a listar somente usuários com perfil `FUNCIONARIO` e `GERENTE` (com `GESTAO` como compatibilidade), e o backend valida os perfis permitidos ao salvar/alterar a escala.
6. ✅ **Módulo Custos Agrícolas (estrutura completa no código)**: Migration 15 criada e estrutura de backend/front consolidada para fornecedores, áreas, análises de solo, safras/culturas, custos, produções, receitas e resultado agrícola (por área/safra e consolidado por fazenda/ano).
7. ✅ **Navegação Agricultura no frontend**: novo acesso "Agricultura" no Header (desktop/mobile), páginas dedicadas em `frontend/src/app/agricultura` e componentes específicos em `frontend/src/components/agricultura`.
8. ✅ **Integração de rotas agrícolas no backend**: registro de rotas em `main.go` para CRUD e consultas analíticas (resultado por área, resultado por fazenda e comparativo de fornecedores por safra).

### 📋 Próximos passos imediatos:

1. Consolidar e validar o Módulo Agrícola em ambiente de desenvolvimento (fluxos completos: fornecedores, áreas, análises, safras, custos, produções, receitas e resultado).
2. Executar bateria de testes manuais de regressão entre Agricultura, Gestão Pecuária e módulos já estáveis.
3. Implementar validações adicionais nos handlers (go-playground/validator), priorizando novas rotas agrícolas.
4. Implementar recuperação de senha (requer configuração SMTP).
5. Evoluir dashboard com gráficos de produção (pecuária + agrícola).

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

**Última atualização**: 2026-03-26
**Contexto Ativo**: Go + Next.js 16 | Backend (Render) + Frontend (Vercel) em produção | Módulo Folgas 5x1 (filtro por funcionário, fazenda por vínculo) + perfis FUNCIONARIO/GERENTE (GESTAO compatível) com permissões de gestão liberadas ao GERENTE | Módulo Agrícola em consolidação no código local | Assistente Virtual via FAB (flutuante) + Live (Gemini 2.0 Flash) | Fazenda ativa (contexto + seletor condicional) | Dev Studio Fase 0–3
