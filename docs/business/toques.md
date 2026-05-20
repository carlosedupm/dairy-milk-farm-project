# Regras de negócio — Toques (diagnóstico de gestação)

Registro de **toque** (diagnóstico de gestação) após cobertura, com resultado positivo ou negativo.

**Implementação principal**

- Backend: `backend/internal/service/diagnostico_gestacao_service.go`, tabela `diagnosticos_gestacao`.
- API: `GET|POST|PUT|DELETE /api/v1/toques` (handler `DiagnosticoGestacaoHandler`).
- Frontend: `frontend/src/app/gestao/toques/*`, `frontend/src/services/toques.ts`.
- RBAC: perfil **FUNCIONARIO** pode `POST` (e `GET` para listagem) — [acessos-perfil.md](./acessos-perfil.md) BR-ACESSO-015.

---

### BR-TOQUES-001 — Resultado válido

- **Enunciado**: `resultado` deve ser `POSITIVO` ou `NEGATIVO` (constantes do modelo).
- **Efeito**: bloqueio no servidor.
- **Estado**: implementado.

### BR-TOQUES-002 — Toque positivo com cobertura abre gestação

- **Enunciado**: Toque `POSITIVO` com `cobertura_id` (informado ou resolvido automaticamente para a cobertura mais recente do animal sem gestação) cria gestação `CONFIRMADA`, atualiza animal para `PRENHE` e preenche `data_confirmacao` / `data_prevista_parto`.
- **Escopo**: Mesma fazenda do animal e da cobertura; bloqueia se já houver gestação confirmada ativa.
- **Efeito**: bloqueio no servidor (400 sem cobertura); propaga para `GET /animais/:id/contexto`, busca na home, ficha (`gestacao_resumo`, timeline, próximas ações) e `resumo-pecuario` (contagem de prenhes / partos previstos).
- **Implementação**: `DiagnosticoGestacaoService.Create` + `resolveCoberturaIDForPositivo`; UI `/gestao/toques/novo` com seletor de cobertura; invalidação de cache no frontend após sucesso.
- **Estado**: implementado.

### BR-TOQUES-003 — Toque negativo não altera status

- **Enunciado**: Toque `NEGATIVO` não atualiza `status_reprodutivo` automaticamente (animal pode permanecer `SERVIDA`).
- **Efeito**: informativo; lacuna transversal em BR-CICLO-002.
- **Estado**: implementado (comportamento atual).

### BR-TOQUES-004 — FUNCIONARIO no curral

- **Enunciado**: Perfil **FUNCIONARIO** pode registrar toques na fazenda vinculada (`POST /api/v1/toques`).
- **Efeito**: bloqueio no middleware se perfil/rota não autorizados.
- **Implementação**: `perfil_access.go`; `appAccess.ts` (`/gestao/toques`).
- **Estado**: implementado.

---

**Última atualização**: 2026-05-19
