# Regras de negócio — Toques (diagnóstico de gestação)

Registro de **toque** (diagnóstico de gestação) após cobertura, com resultado positivo ou negativo e vocabulário operacional do curral.

**Implementação principal**

- Backend: `backend/internal/service/diagnostico_gestacao_service.go`, tabela `diagnosticos_gestacao`.
- API: `GET|POST /api/v1/toques`, `POST /api/v1/toques/lote` (handler `DiagnosticoGestacaoHandler`).
- Frontend: `frontend/src/app/gestao/toques/*`, `frontend/src/services/toques.ts`.
- RBAC: perfil **FUNCIONARIO** pode `POST` (e `GET` para listagem) — [acessos-perfil.md](./acessos-perfil.md) BR-ACESSO-015.

---

### BR-TOQUES-001 — Resultado válido

- **Enunciado**: `resultado` deve ser `POSITIVO`, `NEGATIVO` ou `INCONCLUSIVO` (constantes do modelo). Alternativamente, o cliente pode enviar apenas `classificacao_operacional` válida (BR-TOQUES-006) e o servidor deriva o `resultado`.
- **Efeito**: bloqueio no servidor.
- **Estado**: implementado.

### BR-TOQUES-002 — Toque positivo com cobertura abre gestação

- **Enunciado**: Toque `POSITIVO` (ou classificação `PRENHA`) com `cobertura_id` (informado ou resolvido automaticamente para a cobertura mais recente do animal sem gestação) cria gestação `CONFIRMADA`, atualiza animal para `PRENHE` e preenche `data_confirmacao` / `data_prevista_parto`.
- **Escopo**: Mesma fazenda do animal e da cobertura; bloqueia se já houver gestação confirmada ativa.
- **Efeito**: bloqueio no servidor (400 sem cobertura); propaga para `GET /animais/:id/contexto`, busca na home, ficha (`gestacao_resumo`, timeline, próximas ações) e `resumo-pecuario` (contagem de prenhes / partos previstos).
- **Implementação**: `DiagnosticoGestacaoService.Create` + `resolveCoberturaIDForPositivo`; UI `/gestao/toques/novo` com seletor de cobertura; invalidação de cache no frontend após sucesso.
- **Estado**: implementado.

### BR-TOQUES-003 — Toque negativo volta animal a VAZIA

- **Enunciado**: Toque `NEGATIVO` (ou classificação `VAZIA` / `VAZIA_PEV`) atualiza `status_reprodutivo` para `VAZIA` (não gestante após diagnóstico).
- **Efeito**: atualização no servidor (BR-CICLO-002).
- **Implementação**: `DiagnosticoGestacaoService.Create`.
- **Estado**: implementado.

### BR-TOQUES-005 — Toque inconclusivo

- **Enunciado**: Toque `INCONCLUSIVO` (ou classificação `CLOE`, `CL`, `RETOQUE`) não altera `status_reprodutivo` automaticamente.
- **Estado**: implementado.

### BR-TOQUES-004 — FUNCIONARIO no curral

- **Enunciado**: Perfil **FUNCIONARIO** pode registrar toques na fazenda vinculada (`POST /api/v1/toques`, `POST /api/v1/toques/lote`).
- **Efeito**: bloqueio no middleware se perfil/rota não autorizados.
- **Implementação**: `perfil_access.go`; `appAccess.ts` (`/gestao/toques`, `/gestao/toques/lote`).
- **Estado**: implementado.

### BR-TOQUES-006 — Classificação operacional

- **Enunciado**: `classificacao_operacional` opcional com valores `PRENHA`, `VAZIA`, `VAZIA_PEV`, `CLOE`, `CL`, `RETOQUE`. Quando informada sem `resultado`, o servidor deriva: PRENHA→POSITIVO; VAZIA/VAZIA_PEV→NEGATIVO; CLOE/CL/RETOQUE→INCONCLUSIVO. Combinações inconsistentes entre classificação e resultado são rejeitadas.
- **Escopo**: UI curral, API JWT e integrações M2M; persistido em `diagnosticos_gestacao.classificacao_operacional`.
- **Efeito**: bloqueio no servidor (400) se inválido ou inconsistente.
- **Implementação**: `NormalizeDiagnosticoGestacao` (`diagnostico_gestacao_normalize.go`); migration `26_add_classificacao_operacional_toques`.
- **Estado**: implementado.

### BR-TOQUES-007 — Data do toque (temporal)

- **Enunciado**: `data` não futura; ≥ entrada/nascimento; se `cobertura_id`, ≥ data da cobertura — [ciclo-rebanho.md](./ciclo-rebanho.md) BR-CICLO-012–014 (TMP-001 a TMP-003). Aplica-se a toque unitário, lote JWT e M2M.
- **Efeito**: bloqueio no servidor (400).
- **Implementação**: `DiagnosticoGestacaoService` + `ciclo_integridade_temporal.go`; `ToqueFormFields` com `DateTimePickerUnificado` (`maxDate=hoje`, `minDate` = cobertura + 15 dias alinhado a BR-CICLO-015); validação client em `validateToqueForm` (cronologia vs janela de 15 dias, mensagens com data da cobertura); `/gestao/toques/lote` com validação client equivalente para linhas PRENHA.
- **Estado**: implementado.

### BR-TOQUES-008 — Lista elegível no formulário

- **Enunciado**: `GET /api/v1/fazendas/:id/animais/para-toque` retorna fêmeas com cobertura há ≥15 dias sem diagnóstico de gestação; UI usa `AnimalSelect` com `cicloContext="toque"`.
- **Efeito**: filtro na listagem; bloqueio na escrita mantido em `DiagnosticoGestacaoService`.
- **Implementação**: `AnimalRepository.ListParaToqueByFazendaID`; `ToqueFormFields`.
- **Estado**: implementado (ver [ciclo-rebanho.md](./ciclo-rebanho.md) BR-CICLO-015).

### Canal de integração externa

- Registo via `POST /api/v1/integracoes/toques` ou lote `POST /api/v1/integracoes/toques/lote` (scope `toques:write`) — ver [integracoes.md](./integracoes.md) (`BR-INTEG-*`). Aceita `classificacao_operacional`, `dias_gestacao_estimados` e `metodo`.

---

**Última atualização**: 2026-06-02 (BR-TOQUES-007 — minDate UI gestão)
