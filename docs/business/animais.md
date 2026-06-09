# Regras de negócio — Animais

Regras de consulta de animais por identificação com foco em retorno rápido e contextual para o usuário após login.

**Implementação principal**

- Backend: `backend/internal/handlers/animal_handler.go`, `backend/internal/service/animal_service.go`, `backend/internal/service/gestacao_service.go` (`BuildResumoContexto`), rotas em `backend/cmd/api/main.go`.
- Frontend: `frontend/src/components/animais/AnimalSearchPanel.tsx`, `frontend/src/components/animais/animalResumoUtils.ts`, `frontend/src/services/animais.ts`; ficha com tabs em `frontend/src/components/animais/ficha/`; entrada na home via `AnimalSearchHeaderField` + atalho mobile no `Dashboard`.
- Produção (resumo contextual): `backend/internal/service/producao_service.go`.
- Gestação confirmada (toque positivo): `backend/internal/service/diagnostico_gestacao_service.go`, tabela `gestacoes`.

---

### BR-ANIMAIS-001 — Busca inteligente por identificação na home

- **Enunciado**: Usuário autenticado pode pesquisar o animal a partir da tela inicial por identificação e obter informações contextualizadas para decisão rápida.
- **Escopo**: Home (`/`) — **sem** card duplicado no corpo da página; busca no **header** (todas as larguras) e atalho **«Buscar animal»** na lista mobile de acesso rápido (`Dashboard`).
- **Perfis / permissões**: perfis com acesso a `/animais` (inclui modo restrito de **FUNCIONARIO**); resultados limitados às fazendas vinculadas.
- **Efeito**: bloqueio no servidor para fazendas não vinculadas; UI exibe apenas resultados autorizados.
- **Implementação**:
  - Busca por identificação (parcial + equivalência número ↔ por extenso, paginada): `GET /api/v1/animais/search/by-identificacao?limit=20&offset=0`.
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

### BR-ANIMAIS-007 — Próximas ações na ficha (CTA de ciclo)

- **Enunciado**: `proximas_acoes[]` sugere até **quatro** ações operacionais de ciclo, ordenadas por prioridade: **Parto > Secagem > Cobertura > Toque > Produção**. «Registrar baixa» **não** entra nas sugestões (fluxo dedicado na ficha). **Toque** só quando existir cobertura há ≥15 dias sem diagnóstico (alinhado a BR-CICLO-015). Animal fora do rebanho ou macho → array vazio.
- **Escopo**: `GET /api/v1/animais/:id/contexto`; UI nas tabs **Visão Geral** e **Ciclo** de `/animais/:id`.
- **Perfis / permissões**: CTAs visíveis conforme `proximas_acoes[]`; botão **desabilitado** na UI se `href_path` não permitido para o perfil (`appAccess` / `perfil_access.go`).
- **Efeito**: orientação no curral; bloqueio de escrita mantido na API ao submeter formulários.
- **Implementação**: `AnimalCicloService.BuildProximasAcoes`, `CoberturaRepository.HasPendenteToqueByAnimalID`; `AnimalProximasAcoesCta.tsx`, `animalProximasAcoesUtils.ts`, `AnimalFichaCiclo.tsx`.
- **UI**: botões primários (`variant="default"`, `size="touch"`); desktop = card «Próximas ações» em linha (wrap); mobile = barra fixa inferior com botões empilhados, `env(safe-area-inset-bottom)` e spacer dinâmico (`pb-32` ou `pb-56` conforme quantidade) nas tabs Visão Geral e Ciclo para não tapar o scroll.
- **Estado**: implementado.

### BR-ANIMAIS-008 — Ficha com tabs e sidebar

- **Enunciado**: A ficha `/animais/:id` organiza o conteúdo em **cinco tabs** — **Visão Geral** (resumo do ciclo com mini-timeline, cadastro colapsável), **Ciclo** (estado atual, timeline visual completa, próximas ações e CTAs), **Saúde**, **Produção** e **Histórico** (eventos saúde/alertas/baixa; ciclo na tab dedicada) — com **sidebar fixa** de resumo (identificação, meta, gestação, link para tab Ciclo).
- **Escopo**: UI; URLs `?tab=ciclo|saude|producao|historico` e `?tab=historico&tipo=saude|alertas|todos` (Visão Geral sem query; `historico&tipo=ciclo` redireciona para `?tab=ciclo`); rotas legadas `/animais/:id/saude` e `/producao` redirecionam para a tab equivalente.
- **Perfis / permissões**: mesmas regras das secções integradas (saúde, produção, gestão de animal).
- **Efeito**: informativo e navegação client-side sem reload; breadcrumb contextual.
- **Implementação**: `AnimalFichaShell`, `AnimalFichaSidebar`, `AnimalFichaTabs`, tab panels em `frontend/src/components/animais/ficha/`; `useAnimalFichaPage`; `components/ui/tabs.tsx` (Radix).
- **Estado**: implementado.

### BR-ANIMAIS-006 — Baixa do rebanho (fluxo dedicado)

- **Enunciado**: A saída do animal da exploração **não** se regista pelo formulário genérico de edição; usa-se o fluxo **Registrar baixa** (`/animais/baixa` ou atalho na ficha). Regras completas em [baixa-rebanho.md](./baixa-rebanho.md).
- **Escopo**: API `POST /api/v1/animais/:id/baixa`; UI dedicada.
- **Efeito**: bloqueio operacional fora do fluxo de baixa; contexto com `fora_do_rebanho`.
- **Implementação**: `AnimalBaixaService`, `RegistrarBaixaForm.tsx`.
- **Estado**: implementado.

### BR-ANIMAIS-005 — Rastreabilidade do cadastro

- **Enunciado**: Todo animal criado no sistema (API, assistente ou nascimento no parto) deve ter `created_by` preenchido pelo servidor com o utilizador que executou a ação de criação, quando autenticado.
- **Escopo**: Tabela `animais`; ver [auditoria.md](./auditoria.md) BR-AUDIT-005.
- **Efeito**: persistência; sem bloqueio adicional além da autenticação existente.
- **Implementação**: migration `24_add_auditoria_animais`; `animal_handler.go`, `assistente_service.go`, `assistente_live_service.go`, `cria_service.go`.
- **Estado**: implementado.

### BR-ANIMAIS-009 — Paginação e performance da busca por identificação

- **Enunciado**: A busca por identificação retorna no máximo **20** resultados por página; o cliente pode carregar mais via `offset`; a resposta inclui o **total** encontrado antes do `LIMIT`.
- **Escopo**: `GET /api/v1/animais/search/by-identificacao` (UI JWT); índice GIN `pg_trgm` em `animais.identificacao`.
- **Perfis / permissões**: mesmas de BR-ANIMAIS-001 (fazendas vinculadas ao usuário).
- **Efeito**: bloqueio no servidor; UI exibe «Mostrando X de Y resultados» e botão **Ver mais** quando `X < Y`.
- **Parâmetros**: `identificacao` (obrigatório), `limit` (default 20, max 100), `offset` (default 0), `no_rebanho` (default true).
- **Resposta**: `{ animais, total, limit, offset }`.
- **Equivalência número ↔ extenso**: termo principal e equivalente em **OR** na mesma query (alinhado à listagem paginada).
- **Implementação**:
  - Migration `35_add_animais_identificacao_trgm` (`CREATE EXTENSION pg_trgm`, índice `idx_animais_identificacao_trgm`).
  - `AnimalRepository.SearchByIdentificacaoPaginated`, `AnimalService.SearchByIdentificacaoPaginatedForFazendas`, `AnimalHandler.SearchByIdentificacao`.
  - UI: `AnimalSearchPanel` + `searchByIdentificacao` em `services/animais.ts` (`ANIMAL_SEARCH_PAGE_SIZE = 20`).
- **Estado**: implementado.

### BR-ANIMAIS-010 — Busca por brinco ou nome na pesquisa principal

- **Enunciado**: A busca global do header localiza animais por **brinco** (identificação numérica) ou **nome** (texto em `identificacao`); resultados respeitam a **fazenda ativa** do utilizador.
- **Escopo**: `GET /api/v1/animais/search/by-identificacao`; UI `AnimalSearchPanel` no header (`HeaderBuscaTrigger`, popover desktop / dialog mobile).
- **Perfis / permissões**: mesmas de BR-ANIMAIS-001; `fazenda_id` opcional restringe à fazenda vinculada escolhida (header envia fazenda ativa).
- **Efeito**: bloqueio no servidor para fazendas não vinculadas; ordenação por relevância conforme **BR-ANIMAIS-012**.
- **Regras**:
  - Match parcial (`ILIKE`) + equivalência número ↔ extenso (BR-ANIMAIS-009).
  - UI: exibir `identificacao` tal como cadastrada (`formatAnimalSearchLabel`, sem prefixo `#`).
- **Parâmetros adicionais**: `fazenda_id` (opcional) — quando omitido, mantém busca em todas as fazendas vinculadas (assistente/integrações).
- **Implementação**:
  - Frontend: `animalSearchUtils.ts`, `searchByIdentificacao` com `fazenda_id`, `useFazendaAtiva` no painel.
- **Estado**: implementado.

### BR-ANIMAIS-011 — Filtro «Incluir animais baixados» na busca global

- **Enunciado**: A busca global do header, por defeito, mostra **apenas** animais no rebanho operacional. O utilizador pode marcar **«Incluir animais baixados»** para incluir animais com `data_saida` efetiva (BR-BAIXA-002); nesse modo, animais baixados aparecem **após** os no rebanho na ordenação SQL e com badge informativo **«Baixado»** nos resultados.
- **Escopo**: `GET /api/v1/animais/search/by-identificacao`; UI `AnimalSearchPanel` (`HeaderBuscaTrigger`, popover desktop / dialog mobile).
- **Perfis / permissões**: mesmas de BR-ANIMAIS-001.
- **Efeito**: bloqueio no servidor via `no_rebanho` (default `true`); UI envia `no_rebanho=false` quando o checkbox está marcado.
- **Regras**:
  - Checkbox **desmarcado** por defeito (RF02); preferência persiste em `sessionStorage` na sessão do browser (RF05).
  - Toggle re-dispara a busca com o termo actual.
  - Paginação («Ver mais») respeita o mesmo filtro.
  - Contexto expandido mantém banner «Animal fora do rebanho» para consulta sem novos eventos.
- **Parâmetros**: `no_rebanho` — ver BR-ANIMAIS-009.
- **Ordenação**: prefixo SQL em `BuildAnimalSearchOrderByClause` — animais fora do rebanho depois dos no rebanho; relevância conforme **BR-ANIMAIS-012**; desempate `created_at DESC`.
- **Implementação**:
  - Backend: `AnimalRepository.BuildAnimalSearchOrderByClause`, `sqlAnimalSearchRebanhoOrderPrefix`.
  - Frontend: `useAnimalSearchIncluirBaixados`, `AnimalSearchResultLabel`, `searchByIdentificacao` com `no_rebanho`.
- **Estado**: implementado.

### BR-ANIMAIS-012 — Ordenação por relevância na busca

- **Enunciado**: Resultados de busca por identificação ordenam-se por **relevância do match** em relação ao termo digitado, não por data de cadastro.
- **Escopo**: `GET /api/v1/animais/search/by-identificacao`; listagens paginadas `GET /api/v1/animais` e `GET /api/v1/fazendas/:id/animais` quando filtro `identificacao` está presente.
- **Perfis / permissões**: mesmas de BR-ANIMAIS-001.
- **Efeito**: ordenação no servidor (SQL `ORDER BY`); UI exibe resultados na ordem retornada pela API.
- **Regras** (prioridade crescente = melhor match):
  1. **Match exato** — `LOWER(identificacao) = LOWER(termo)` (ex.: `'45'` antes de `'145'`).
  2. **Match prefixo** — `identificacao ILIKE termo || '%'` (ex.: `'450'` após `'45'`).
  3. **Match contains** — `identificacao ILIKE '%' || termo || '%'` (ex.: `'145'` após `'450'`).
  4. **Match equivalente** — match apenas via termo número ↔ extenso (0–20, BR-ANIMAIS-009); menor prioridade que match directo.
  5. **Desempate** — `created_at DESC` dentro do mesmo nível de relevância.
- **Busca global**: prefixo rebanho (BR-ANIMAIS-011) antes do score de relevância.
- **Implementação**:
  - `IdentificacaoRelevanceScore`, `BuildAnimalSearchOrderByClause`, `BuildAnimalListIdentificacaoOrderByClause` em `backend/internal/repository/identificacao_relevance.go`.
  - `AnimalSearchFilters.PrimaryTerm` / `EquivalentTerm`; `AnimalListFilters` com os mesmos campos.
  - Testes: `identificacao_relevance_test.go`.
- **Estado**: implementado.

---

**Última atualização**: 2026-06-08 (próximas ações — máx. 4 — BR-ANIMAIS-007)
