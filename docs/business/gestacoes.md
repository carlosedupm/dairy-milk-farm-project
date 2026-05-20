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

---

**Última atualização**: 2026-05-19
