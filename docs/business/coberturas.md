# Regras de negócio — Coberturas

Registro de **inseminação / monta** na matriz, com tipo de serviço e identificação do reprodutor quando aplicável.

**Implementação principal**

- Backend: `backend/internal/service/cobertura_service.go`, handler em `backend/internal/handlers/gestao_pecuaria_handlers.go` (`CoberturaHandler`); rotas `GET|POST|PUT|DELETE /api/v1/coberturas` em `backend/cmd/api/main.go`.
- Repositório: `backend/internal/repository/cobertura_repository.go`.
- Frontend: `frontend/src/services/coberturas.ts`, `frontend/src/components/gestao/CoberturaFormFields.tsx`, `frontend/src/components/gestao/CoberturaTable.tsx`, páginas `/gestao/coberturas/*`.
- Persistência: `coberturas` em `backend/migrations/12_add_gestao_pecuaria.up.sql`; coluna `touro_animal_id` em `backend/migrations/14_coberturas_touro_animal_id.up.sql`.

---

### BR-COBERTURAS-001 — Somente fêmeas

- **Enunciado**: Apenas animais do sexo **fêmea** podem ser matriz de uma cobertura.
- **Escopo**: Por registro de cobertura (`animal_id`).
- **Efeito**: Bloqueio no servidor (`CoberturaService.Create` / `Update`).
- **Implementação**: `backend/internal/service/cobertura_service.go`.
- **Estado**: Implementado.

### BR-COBERTURAS-002 — Monta natural exige reprodutor

- **Enunciado**: Para tipo **MONTA_NATURAL**, deve existir identificação do reprodutor por **`touro_animal_id`** (animal cadastrado) **ou** texto em **`touro_info`** (quando o touro não está cadastrado).
- **Efeito**: Bloqueio no servidor e desabilitação do envio na UI quando `MONTA_NATURAL` sem reprodutor.
- **Implementação**: `CoberturaService`; `CoberturaFormFields` / `coberturaFormSubmitDisabled` no frontend.
- **Estado**: Implementado.

### BR-COBERTURAS-003 — Reprodutor vinculado (touro/boi)

- **Enunciado**: Se informado **`touro_animal_id`**, o animal deve existir, ser da **mesma fazenda**, sexo **M** e categoria **TOURO** ou **BOI**.
- **Efeito**: Bloqueio no servidor.
- **Implementação**: `CoberturaService.Create` / `Update`.
- **Estado**: Implementado.

### BR-COBERTURAS-004 — Exclusão com vínculos

- **Enunciado**: Não é permitido excluir uma cobertura se existir **gestação** (`gestacoes.cobertura_id`) ou **diagnóstico de gestação / toque** (`diagnosticos_gestacao.cobertura_id`) referenciando o registro.
- **Efeito**: Resposta **409 Conflict** na API; mensagem orientativa na exclusão na listagem (via `getApiErrorMessage`).
- **Implementação**: `CoberturaService.Delete` (`ErrCoberturaTemVinculos`); `GestacaoRepository.ExistsByCoberturaID`, `DiagnosticoGestacaoRepository.ExistsByCoberturaID`; `CoberturaHandler.Delete`.
- **Estado**: Implementado.

---

**Última atualização**: 2026-05-07
