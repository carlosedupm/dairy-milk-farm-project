# Regras de negócio — Animais

Regras de consulta de animais por identificação com foco em retorno rápido e contextual para o usuário após login.

**Implementação principal**

- Backend: `backend/internal/handlers/animal_handler.go`, `backend/internal/service/animal_service.go`, `backend/internal/service/gestacao_service.go` (`BuildResumoContexto`), rotas em `backend/cmd/api/main.go`.
- Frontend: `frontend/src/components/animais/AnimalSearchPanel.tsx`, `frontend/src/components/animais/animalResumoUtils.ts`, `frontend/src/services/animais.ts`; entrada na home via `AnimalSearchHeaderField` + atalho mobile no `Dashboard`.
- Produção (resumo contextual): `backend/internal/service/producao_service.go`.
- Gestação confirmada (toque positivo): `backend/internal/service/diagnostico_gestacao_service.go`, tabela `gestacoes`.

---

### BR-ANIMAIS-001 — Busca inteligente por identificação na home

- **Enunciado**: Usuário autenticado pode pesquisar o animal a partir da tela inicial por identificação e obter informações contextualizadas para decisão rápida.
- **Escopo**: Home (`/`) — **sem** card duplicado no corpo da página; busca no **header** (todas as larguras) e atalho **«Buscar animal»** na lista mobile de acesso rápido (`Dashboard`).
- **Perfis / permissões**: perfis com acesso a `/animais` (inclui modo restrito de **FUNCIONARIO**); resultados limitados às fazendas vinculadas.
- **Efeito**: bloqueio no servidor para fazendas não vinculadas; UI exibe apenas resultados autorizados.
- **Implementação**:
  - Busca por identificação (parcial + equivalência número ↔ por extenso): `GET /api/v1/animais/search/by-identificacao`.
  - Contexto do animal: `GET /api/v1/animais/:id/contexto` (animal + resumo de produção + gestação + restrição de leite opcional).
  - UI: `AnimalSearchPanel` em `AnimalSearchHeaderField` + `AnimalSearchDialogContext`; atalho `openSearch()` no `Dashboard` (mobile).
  - Validação de acesso: `ValidateFazendaAccess` + filtro por `GetByUsuarioID` na busca.
- **Estado**: Implementado.

### BR-ANIMAIS-002 — Contexto mínimo obrigatório no resultado inteligente

- **Enunciado**: Ao selecionar um resultado, o sistema deve apresentar dados essenciais do animal e indicadores de produção consolidados, com rótulos legíveis para o usuário.
- **Escopo**: Resumo exibido no popover/diálogo de busca do header e após seleção de resultado (inclui fluxo aberto pelo atalho mobile na home).
- **Efeito**: informativo na UI; consulta consolidada no backend.
- **Dados exibidos**:
  - identificação do animal;
  - categoria, sexo e raça (quando preenchidos);
  - status de saúde e reprodutivo **somente quando cadastrados** (nunca «Não informado» no resumo); em **bezerra/bezerro** omitir reprodução e integrar **nasc.** na linha meta;
  - gestação confirmada (ver BR-ANIMAIS-003);
  - data de nascimento **somente se cadastrada** (omitir linha se vazia — detalhe na ficha);
  - resumo de produção **histórico** **somente se houver registros** (omitir linha se zero — evita ruído no resumo rápido);
  - meta compacta (categoria · sexo · raça) sem rótulos repetitivos;
  - quando existir episódio aberto: `restricao_leite_ativa` (ver [leite-restricoes.md](./leite-restricoes.md) — BR-LEITE-004).
- **Regra de exibição da fazenda na busca**: na lista de resultados, **não** exibir nome/ID da fazenda, pois o contexto já é da fazenda ativa do usuário logado.
- **Implementação**: payload `data.animal` + `data.resumo_producao` + `data.gestacao_resumo` do endpoint `GET /api/v1/animais/:id/contexto`; formatação em `frontend/src/components/animais/animalResumoUtils.ts`.
- **Estado**: Implementado.

### BR-ANIMAIS-003 — Gestação confirmada no resumo contextual

- **Enunciado**: No resumo da busca por identificação, informar se o animal está com **gestação confirmada** (após toque positivo com cobertura vinculada) e, em caso afirmativo, o tempo decorrido desde a confirmação em meses civis (meses completos = `floor(dias/30)`, dias = diferença entre datas civis).
- **Fonte de verdade**: registro em `gestacoes` com `status = 'CONFIRMADA'` (mais recente por `data_confirmacao DESC`). Não inferir apenas por `status_reprodutivo = PRENHE`.
- **Quando não há gestação confirmada**: **não exibir linha de gestação** no resumo rápido; o status reprodutivo (ex.: Servida) já comunica o estágio. Linha de gestação só aparece com toque positivo / `CONFIRMADA`.
- **Payload API** (`gestacao_resumo`): `confirmada`, `gestacao_id`, `data_confirmacao`, `data_prevista_parto`, `dias_gestacao`, `meses_gestacao`.
- **Implementação**:
  - Criação da gestação: `DiagnosticoGestacaoService.Create` (toque `POSITIVO` + `cobertura_id`).
  - Consulta: `GestacaoRepository.GetAtivaConfirmadaByAnimalID`, `GestacaoService.BuildResumoContexto`, `AnimalHandler.GetContextoByID`.
  - UI: `formatGestacaoResumoLinha` em `animalResumoUtils.ts`.
- **Estado**: Implementado.

### BR-ANIMAIS-004 — Contexto enriquecido (ciclo do rebanho)

- **Enunciado**: `GET /api/v1/animais/:id/contexto` inclui, além dos blocos existentes, `lactacao_ativa`, `timeline[]` (eventos ordenados por data) e `proximas_acoes[]` (sugestões de registro).
- **Escopo**: Mesmo controle de acesso do contexto; até 50 itens na timeline (produção limitada aos 15 registros mais recentes).
- **Implementação**: `AnimalCicloService` em `backend/internal/service/animal_ciclo_service.go`; `AnimalHandler.GetContextoByID`.
- **Estado**: implementado.

### BR-ANIMAIS-005 — Rastreabilidade do cadastro

- **Enunciado**: Todo animal criado no sistema (API, assistente ou nascimento no parto) deve ter `created_by` preenchido pelo servidor com o utilizador que executou a ação de criação, quando autenticado.
- **Escopo**: Tabela `animais`; ver [auditoria.md](./auditoria.md) BR-AUDIT-005.
- **Efeito**: persistência; sem bloqueio adicional além da autenticação existente.
- **Implementação**: migration `24_add_auditoria_animais`; `animal_handler.go`, `assistente_service.go`, `assistente_live_service.go`, `cria_service.go`.
- **Estado**: implementado.

---

**Última atualização**: 2026-05-24
