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
- **Migrações**: golang-migrate no startup; seed do usuário admin (V3); refresh tokens (V4); Dev Studio (V5, V6); constraint unicidade DEVELOPER (V8); vínculo usuário–fazenda (V11 – tabela usuarios_fazendas); origem de aquisição em animais (V13 – origem_aquisicao NASCIDO|COMPRADO); touro_animal_id em coberturas (V14 – vinculação reprodutor em monta natural)
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
- **Módulo Administrador**: Área admin (`/admin/usuarios`) para ADMIN e DEVELOPER — listagem, criar, editar e ativar/desativar usuários. Perfis USER, ADMIN, DEVELOPER; constraint de unicidade para DEVELOPER no banco. Rotas `GET/POST /api/v1/admin/usuarios`, `PUT /api/v1/admin/usuarios/:id`, `PATCH /api/v1/admin/usuarios/:id/toggle-enabled`, `GET/PUT /api/v1/admin/usuarios/:id/fazendas`. Perfil DEVELOPER não atribuível via API. **Fazendas vinculadas**: somente ADMIN (ou DEVELOPER) pode atribuir quais fazendas cada usuário acessa, na tela de edição de usuário (seção "Fazendas vinculadas" com checkboxes + "Salvar vínculos"). **Perfil não editável**: ao editar um usuário com perfil ADMIN ou DEVELOPER, o campo perfil é somente leitura (frontend e backend preservam o perfil).
- **Vínculo usuário–fazenda e fazenda única**: Tabela `usuarios_fazendas` (N:N). Endpoint `GET /api/v1/me/fazendas` retorna as fazendas vinculadas ao usuário logado. Quando o usuário tem **apenas uma fazenda** vinculada: formulários de novo animal e nova produção usam essa fazenda automaticamente (seletor de fazenda oculto); atalhos da home ("Ver fazendas", "Ver animais") apontam diretamente para essa fazenda. Admin atribui fazendas a usuários na edição de usuário.

### 🚧 Em andamento:

- Nenhum item em andamento no momento

### ✅ Concluído desde a última atualização:

1. ✅ **Vinculação do reprodutor em cobertura (monta natural)**: Coluna `touro_animal_id` (FK para animais) na tabela coberturas (migration 14). Validação em CoberturaService: para MONTA_NATURAL, exige `touro_animal_id` ou `touro_info`; se `touro_animal_id` informado, valida que o animal existe, é macho, categoria TOURO ou BOI e da mesma fazenda. Frontend: formulário de nova cobertura exibe AnimalSelect (reprodutoresOnly) para MONTA_NATURAL; CoberturaTable exibe coluna "Reprodutor"; AnimalSelect ganhou prop `reprodutoresOnly`. Documentado em systemPatterns.
2. ✅ **Cadastro de animal: origem (nascido vs comprado)**: Campo `origem_aquisicao` (NASCIDO | COMPRADO) no modelo, API, frontend e assistente. Para NASCIDO, data de nascimento obrigatória; para COMPRADO, opcional (uso de data_entrada como referência). Migration 13; validação no AnimalService; seletor no formulário; badge na listagem e detalhe.
3. ✅ **Plano de verificação Gestão Pecuária**: (a) **systemPatterns**: Documentado padrão de campos de data (DatePicker para só data; `Input type="datetime-local"` para data+hora) e próximo passo (estender edição/exclusão para coberturas, toques e secagens). (b) **CioTable**: Dialog de exclusão controlado com estado `deleteDialogOpenId`; fechamento automático após exclusão com sucesso.
4. ✅ **Melhorias Módulo Gestão Pecuária**: (a) **Componentes reutilizáveis**: `GestaoListLayout`, `GestaoFormLayout`, `useAnimaisMap` (mapeia animal_id → identificação). (b) **Tabelas**: CioTable, PartoTable, LactacaoTable, CoberturaTable, ToqueTable, SecagemTable, GestacaoTable — exibem identificação do animal em vez do ID. (c) **Formulários padronizados**: DatePicker e Select Shadcn em lactações, secagens, coberturas, toques e cios; `getApiErrorMessage` em todos os formulários. (d) **Cios CRUD completo**: PUT /api/v1/cios/:id no backend; página de edição e exclusão (Dialog) na CioTable.
5. ✅ **Correção Gestão Pecuária – AnimalHandler**: O handler de animais não aceitava nem persistia os campos de gestão pecuária (categoria, status_reprodutivo, mae_id, pai_info, lote_id, etc.), o que apagava a reclassificação automática ao editar um animal. Corrigido: CreateAnimalRequest e UpdateAnimalRequest agora incluem todos os campos; no Update, campos não enviados pelo formulário (status_reprodutivo, mae_id, pai_info, etc.) são preservados para não sobrescrever dados definidos automaticamente pelo PartoService.
6. ✅ **Reclassificação automática de categoria (gestão pecuária)**: (a) **Por primeiro parto**: ao registrar parto de fêmea BEZERRA ou NOVILHA, categoria atualizada para MATRIZ em `PartoService.Create`. (b) **Por idade**: serviço `ReclassificacaoCategoriaService` reclassifica bezerras com idade ≥ N meses (padrão 12) em novilhas; endpoint `POST /api/v1/animais/reclassificar-categoria?meses=12` para execução manual ou por job/cron.
7. ✅ **Assistente Live — estratégia "mic off durante TTS"**: Microfone é desligado enquanto o TTS fala e reaberto automaticamente após grace period pós-TTS. Elimina por completo o eco do assistente ser capturado como fala do usuário. Substituiu a abordagem anterior de filtro de eco por texto (ECHO_PHRASES + isEchoTranscript) que era frágil.
8. ✅ **Saudação sem TTS**: Backend agora envia boas-vindas como `type: "greeting"` (não `"text"`). Frontend exibe como texto mas não aciona TTS, permitindo que o microfone abra imediatamente ao iniciar o assistente.
9. ✅ **Assistente Live — cancelamento de turno no backend**: WebSocket aceita `{"type":"interrupt"}`; novo texto cancela o turno anterior e cria novo turno com contexto cancelável; respostas de turnos antigos são bloqueadas para evitar sobreposição/confusão.
10. ✅ **Assistente flutuante (FAB)**: Acesso ao assistente via botão flutuante (FAB) no canto inferior direito em todas as telas autenticadas; estado compartilhado em `AssistenteContext`; modal em `AssistenteDialog` no layout; assistente removido do Header (desktop e mobile).
11. ✅ **Assistente Virtual Multimodal Live**: Interface em tempo real via WebSockets (Gemini 2.0 Flash), Function Calling para Fazendas, Animais, Produção e fechamento automático por voz.
12. ✅ **Compatibilidade do Assistente com qualquer navegador (incl. mobile)**: Removida a captura de áudio bruto no frontend (ScriptProcessorNode falhava em Safari/iOS). Modo Live usa apenas texto no WebSocket; voz quando o navegador oferece Web Speech API. Em navegadores sem reconhecimento de voz (ex.: Firefox Android), o Assistente Live permanece disponível em modo texto (digitar e Enviar/Enter).
13. ✅ **Contexto Inteligente no Assistente**: Integração automática com o usuário logado e a fazenda ativa selecionada no sistema.
14. ✅ **Correção de Erros de Compilação e Tipos**: Resolvidos conflitos em Go e incompatibilidades nos Protocol Buffers do Google.
15. ✅ **useAnimaisMap — animais iterável**: Garantia com `Array.isArray(data) ? data : []` no hook para evitar erro "animais is not iterable" quando a query está desabilitada ou retorna formato inesperado (ex.: ao acessar `/gestao/toques`).
16. ✅ **Assistente Virtual — resposta sem negrito**: Resposta no modo Live passou a ser exibida como texto puro (`whitespace-pre-wrap`), sem ReactMarkdown; não há mais negrito a partir de `*` e o usuário não precisa "falar" asterisco.

### 📋 Próximos passos imediatos:

1. Implementar recuperação de senha (requer configuração SMTP)
2. Validações adicionais nos handlers (go-playground/validator)
3. Dashboard com gráficos de produção
4. Estender fluxos de edição/exclusão para coberturas, toques e secagens (padrão Cios como referência)

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

**Última atualização**: 2026-02-18
**Contexto Ativo**: Go + Next.js 16 | Backend (Render) + Frontend (Vercel) em produção | Assistente Virtual via FAB (flutuante) + Live (Gemini 2.0 Flash) | Vínculo usuário–fazenda | Dev Studio Fase 0–3
