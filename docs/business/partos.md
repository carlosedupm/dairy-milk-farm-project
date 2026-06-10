# Regras de negócio — Partos e crias

Registro de **parto** da matriz, opcionalmente com **crias** no mesmo POST, abertura de lactação e encerramento de gestação.

**Implementação principal**

- Backend: `backend/internal/service/parto_service.go`, `backend/internal/service/cria_service.go`, transações com `pgxpool`.
- API: `GET|POST|PUT|DELETE /api/v1/partos`; `POST` com corpo `crias[]` opcional.
- Frontend: `frontend/src/app/gestao/partos/*`.
- RBAC: FUNCIONARIO com `POST` em partos — [acessos-perfil.md](./acessos-perfil.md).

---

### BR-PARTOS-001 — Somente fêmeas

- **Enunciado**: Apenas fêmeas podem ter parto registrado.
- **Efeito**: bloqueio no servidor.
- **Implementação**: `PartoService.validatePartoAnimalForCreate`.
- **Estado**: implementado.

### BR-PARTOS-002 — Parto abre lactação

- **Enunciado**: Após parto válido, cria-se lactação `EM_ANDAMENTO` com `data_inicio` = data do parto; animal passa a `PARIDA`.
- **Efeito**: bloqueio/consistência no servidor.
- **Implementação**: `PartoService.applyAfterPartoCreate`; [ciclo-rebanho.md](./ciclo-rebanho.md) BR-CICLO-004.
- **Estado**: implementado.

### BR-PARTOS-003 — Crias no mesmo POST

- **Enunciado**: Quando `crias[]` é enviado, o tamanho do array deve coincidir com `numero_crias`; cada cria viva gera animal `NASCIDO` vinculado ao parto.
- **Efeito**: bloqueio no servidor (`ErrPartoCriasCountMismatch`).
- **Implementação**: `PartoService.CreateWithCrias` (transação).
- **Estado**: implementado.

### BR-PARTOS-004 — Primeiro parto reclassifica categoria

- **Enunciado**: Se for o primeiro parto da fêmea e ainda não for matriz, categoria atualizada para `MATRIZ`.
- **Efeito**: atualização no servidor.
- **Estado**: implementado.

### BR-PARTOS-005 — Exclusão

- **Enunciado**: Exclusão de parto segue regras de vínculos (lactação, crias, gestação) implementadas no service; operação restrita a perfis com gestão completa.
- **Implementação**: `PartoService.Delete`.
- **Estado**: implementado (detalhe de vínculos no código).

### BR-PARTOS-006 — Data do parto (temporal)

- **Enunciado**: `data` não futura; ≥ entrada/nascimento; se `gestacao_id`, ≥ `data_confirmacao` da gestação — BR-CICLO-012–014 (TMP-001, TMP-002, TMP-004).
- **Efeito**: bloqueio no servidor (400).
- **Implementação**: `PartoService` + `ciclo_integridade_temporal.go`; `PartoFormFields` com `DateTimePickerUnificado` (`maxDate=hoje`, `minDate` = `data_confirmacao` da gestação selecionada ou da gestação `CONFIRMADA` do animal); validação client em `validatePartoForm` com mensagem datada e badge `TMP-004`.
- **Estado**: implementado.

### BR-PARTOS-007 — Lista elegível no formulário

- **Enunciado**: `GET /api/v1/fazendas/:id/animais/para-parto` retorna fêmeas com gestação `CONFIRMADA` sem parto registrado; UI usa `AnimalSelect` com `cicloContext="parto"`.
- **Efeito**: filtro na listagem; em edição o animal selecionado permanece visível (`preserveSelected`).
- **Implementação**: `AnimalRepository.ListParaPartoByFazendaID`; `PartoFormFields`.
- **Estado**: implementado (ver [ciclo-rebanho.md](./ciclo-rebanho.md) BR-CICLO-015).

### BR-PARTOS-008 — Cria viva não saudável no parto

- **Enunciado**: No registo de parto com cria **VIVA**, o operador pode marcar «cria nasceu não saudável». Quando marcado, o animal gerado (bezerra/bezerro) recebe `status_saude` **`DOENTE`** ou **`EM_TRATAMENTO`** (escolha no formulário; default `DOENTE`). Cria saudável (checkbox desmarcado) → `SAUDAVEL`. Única exceção ao default SAUDAVEL do cadastro genérico (BR-SAUDE-013).
- **Escopo**: `POST /api/v1/partos` com `crias[]`; registro tardio de cria no painel de edição do parto; cria viva com geração automática de animal (`CriaService.insertCriaVivaComAnimalGeradoTx`).
- **Perfis / permissões**: quem pode registar parto (incl. FUNCIONARIO POST — BR-ACESSO-015).
- **Efeito**: valor inicial em `animals.status_saude`; **não** cria caso automático em `animal_saude` nesta entrega (operador pode registar tratamento depois na tab Saúde).
- **Implementação**:
  - Payload `crias[]`: `nao_saudavel` (bool) e `status_saude_inicial` opcional (`DOENTE`|`EM_TRATAMENTO`).
  - Backend: `resolveStatusSaudeCriaViva` em `cria_service.go` → `insertCriaVivaComAnimalGeradoTx`.
  - Frontend: `PartoFormFields.tsx`, `PartoEditCriasPanel.tsx`, `cria-constants.ts`.
- **Estado**: implementado (briefing **BRF-003**, G3 2026-06-09).

---

**Última atualização**: 2026-06-09 (BR-PARTOS-008 implementado — BRF-003)
