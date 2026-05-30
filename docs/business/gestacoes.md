# Regras de negócio — Gestações

Registro de **gestação confirmada** após toque positivo e acompanhamento até parto ou encerramento.

**Implementação principal**

- Backend: `backend/internal/service/gestacao_service.go`, `backend/internal/repository/gestacao_repository.go`, criação automática em `DiagnosticoGestacaoService` (toque positivo).
- Frontend: `frontend/src/app/gestao/gestacoes/*`, `frontend/src/services/gestacoes.ts`.
- Resumo pecuário: `GET /api/v1/fazendas/:id/resumo-pecuario` (`ResumoPecuarioService`).

---

### BR-GESTACOES-001 — Gestação confirmada via toque positivo

- **Enunciado**: Registro com `status = CONFIRMADA` é criado pelo servidor quando há toque `POSITIVO` com `cobertura_id` válido.
- **Efeito**: bloqueio/consistência no servidor; ver [ciclo-rebanho.md](./ciclo-rebanho.md) BR-CICLO-003.
- **Implementação**: `DiagnosticoGestacaoService.Create`.
- **Estado**: implementado.

### BR-GESTACOES-002 — Parto encerra gestação vinculada

- **Enunciado**: Ao registrar parto com `gestacao_id`, a gestação passa a `PARTO_REALIZADO`.
- **Efeito**: bloqueio/consistência no servidor.
- **Implementação**: `PartoService.applyAfterPartoCreate`.
- **Estado**: implementado.

### BR-GESTACOES-003 — Partos previstos no resumo pecuário

- **Enunciado**: Na home do gerente/titular, o painel pecuário lista gestações `CONFIRMADA` com `data_prevista_parto` nos próximos **N** dias (query `dias_parto`, default 30).
- **Escopo**: Fazenda ativa; perfis com dashboard completo (não FUNCIONARIO restrito na UI).
- **Efeito**: informativo; links para ficha do animal.
- **Implementação**: `ResumoPecuarioService.Build`, `GestacaoRepository.ListPartosPrevistosByFazendaID`; `PecuarioResumoHomePanel`.
- **Estado**: implementado (ver [ciclo-rebanho.md](./ciclo-rebanho.md) BR-CICLO-009).

### BR-GESTACOES-004 — Drill-down «Prenhes» na home (legado)

- **Enunciado**: O contador «Prenhes» no painel pecuário da home (`prenhes_total`) reflete gestações com `status = CONFIRMADA`; ao clicar, o utilizador abre a lista de gestações com o mesmo critério (`/gestao/gestacoes?status=CONFIRMADA`), não o filtro `status_reprodutivo = PRENHE` em animais.
- **Escopo**: Fazenda ativa; perfis com dashboard completo (não FUNCIONARIO restrito).
- **Efeito**: navegação; lista vazia quando contador é zero.
- **Implementação**: KPI «Prenhes» removido da faixa principal (substituído por BR-CICLO-009 / BR-GESTACOES-005); filtro `status=CONFIRMADA` em `gestacoes/page.tsx` mantido para outros atalhos.
- **Estado**: parcial (drill-down prenhes substituído na home por KPI partos 7d; regra de contagem `prenhes_total` permanece na API).

### BR-GESTACOES-005 — Drill-down «Partos 7 dias» na home

- **Enunciado**: O KPI «Partos 7 dias» na faixa superior do Dashboard (`partos_proximos_7d_total` no resumo pecuário) conta gestações `CONFIRMADA` com `data_prevista_parto` entre hoje e hoje+7 dias (inclusive, datas civis). Ao clicar, abre `/gestao/gestacoes?status=CONFIRMADA&partos_dias=7` com o mesmo critério no cliente.
- **Escopo**: Fazenda ativa; perfis com dashboard completo (não FUNCIONARIO restrito).
- **Efeito**: navegação; contador zero mostra «Nenhum» no KPI.
- **Implementação**: `ResumoPecuarioService.Build` + `ListPartosPrevistosNaJanelaByFazendaID`; `DashboardKpiGrid`; `lib/gestacoesFilters.ts`; `frontend/src/app/gestao/gestacoes/page.tsx`.
- **Estado**: implementado.

---

**Última atualização**: 2026-05-30
