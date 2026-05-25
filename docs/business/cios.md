# Regras de negócio — Cios

Registro de **detecção de cio** na matriz (data/hora e metadados opcionais).

**Implementação principal**

- Backend: `backend/internal/service/cio_service.go`, `backend/internal/handlers/cio_handler.go`; rotas `GET|POST|PUT|DELETE /api/v1/cios` em `backend/cmd/api/main.go`.
- Repositório: `backend/internal/repository/cio_repository.go`.
- Frontend: `frontend/src/services/cios.ts`, `frontend/src/components/gestao/CioFormFields.tsx`, `frontend/src/components/gestao/CioTable.tsx`, páginas `/gestao/cios/*`.
- Persistência: tabela `cios` em `backend/migrations/12_add_gestao_pecuaria.up.sql`.

---

### BR-CIOS-001 — Somente fêmeas

- **Enunciado**: Apenas animais do sexo **fêmea** podem ter registro de cio.
- **Escopo**: Por registro (`animal_id`).
- **Efeito**: Bloqueio no servidor na criação e quando o animal da linha é alterado na atualização.
- **Implementação**: `backend/internal/service/cio_service.go` (`Create`, `Update`).
- **Estado**: Implementado.

### BR-CIOS-002 — Método e intensidade validados

- **Enunciado**: Quando informados, **`metodo_deteccao`** e **`intensidade`** devem pertencer aos conjuntos permitidos pelo modelo (`models.ValidMetodosCio`, `models.ValidIntensidadesCio`).
- **Efeito**: Bloqueio no servidor se valor inválido.
- **Implementação**: `CioService.Create` / `Update`; UI com selects alinhados em `CioFormFields`.
- **Estado**: Implementado.

### BR-CIOS-003 — Cio atualiza status reprodutivo

- **Enunciado**: Ao registrar cio, o servidor define `status_reprodutivo` = `VAZIA`, exceto se o animal já estiver `PRENHE`.
- **Efeito**: atualização no servidor (BR-CICLO-002); `usuario_id` gravado com o utilizador autenticado.
- **Implementação**: `CioService.Create` + `applyStatusAfterCio`; `CioHandler.Create` preenche `usuario_id`.
- **Estado**: implementado.

### BR-CIOS-004 — Data do cio (temporal)

- **Enunciado**: `data_detectado` não pode ser futura nem anterior à entrada/nascimento do animal; alinhado a [ciclo-rebanho.md](./ciclo-rebanho.md) BR-CICLO-012–013 (TMP-001, TMP-002).
- **Efeito**: bloqueio no servidor (400).
- **Implementação**: `CioService` + `ciclo_integridade_temporal.go`; `CioFormFields` com `maxDate` agora.
- **Estado**: implementado.

---

**Última atualização**: 2026-05-25 (BR-CIOS-004 — validação temporal)
