# Regras de negócio — Coberturas

Registro de **inseminação / monta** na matriz, com tipo de serviço e identificação do reprodutor quando aplicável.

**Implementação principal**

- Backend: `backend/internal/service/cobertura_service.go`, handler em `backend/internal/handlers/gestao_pecuaria_handlers.go` (`CoberturaHandler`); rotas `GET|POST|PUT|DELETE /api/v1/coberturas` em `backend/cmd/api/main.go`.
- Repositório: `backend/internal/repository/cobertura_repository.go`.
- Frontend: `frontend/src/services/coberturas.ts`, `frontend/src/components/gestao/CoberturaFormFields.tsx`, `frontend/src/components/gestao/CoberturaTable.tsx`, páginas `/gestao/coberturas/*`.
- Persistência: `coberturas` em `backend/migrations/12_add_gestao_pecuaria.up.sql`; coluna `touro_animal_id` em `backend/migrations/14_add_touro_animal_id_coberturas.up.sql`; índice único parcial `cio_id` em `backend/migrations/40_unique_coberturas_cio_id.up.sql`.

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

### BR-COBERTURAS-005 — Data da cobertura (temporal)

- **Enunciado**: `data` não futura; ≥ entrada/nascimento; se `cio_id`, ≥ data do cio — [ciclo-rebanho.md](./ciclo-rebanho.md) BR-CICLO-012–014 (TMP-001 a TMP-003).
- **Efeito**: bloqueio no servidor (400).
- **Implementação**: `CoberturaService` + `ciclo_integridade_temporal.go`; `CoberturaFormFields` com `DateTimePickerUnificado` (`maxDate=hoje`, `minDate` após cio do animal via `lib/gestao-date-limits.ts`); validação client em `validateCoberturaForm` com mensagens datadas (ex.: «cio detectado em DD/MM/AAAA») e badge `TMP-003` no submit.
- **Estado**: implementado.

### BR-COBERTURAS-006 — Lista elegível no formulário

- **Enunciado**: `GET /api/v1/fazendas/:id/animais/para-cobertura` retorna fêmeas no rebanho com cio registrado sem cobertura vinculada (`cio_id`); UI usa `AnimalSelect` com `cicloContext="cobertura"`. A escrita exige o vínculo — ver **BR-COBERTURAS-008**.
- **Efeito**: filtro na listagem; bloqueio na escrita em `CoberturaService` (**BR-COBERTURAS-008**).
- **Implementação**: `AnimalRepository.ListParaCoberturaByFazendaID`; `CoberturaFormFields`.
- **Estado**: implementado (listagem); escrita reforçada em **BR-COBERTURAS-008**.

### BR-COBERTURAS-007 — Elegibilidade por fase de vida (categoria e idade)

- **Enunciado**: Cobertura exige matriz elegível conforme **BR-CICLO-016** e **BR-CICLO-017**. Listagem `para-cobertura` actualizada (**BR-CICLO-018**).
- **Escopo**: `POST|PUT /api/v1/coberturas`; M2M `POST /integracoes/coberturas` (+ lote).
- **Efeito**: bloqueio 400 `INT-008`.
- **Implementação**: `CoberturaService.validateCoberturaRegras` + `SQLElegivelReproducao` nas listagens.
- **Estado**: implementado (briefing **BRF-004**).

### BR-COBERTURAS-008 — Cio vinculado obrigatório

- **Enunciado**: Toda cobertura (JWT, M2M e assistente) **exige** `cio_id` preenchido nas escritas novas (Create/Update). O cio deve existir, pertencer ao **mesmo** `animal_id` e `fazenda_id`, e **não** estar já referenciado por outra cobertura. A data da cobertura deve ser ≥ data do cio (**TMP-003** / BR-CICLO-014). Aplica-se a todos os tipos (`IA`, `IATF`, `MONTA_NATURAL`, `TE`): IATF também regista cio (observado ou do dia do protocolo) antes da cobertura. Registos legados sem `cio_id` permanecem **legíveis**; a coluna **não** é `NOT NULL`.
- **Escopo**: `POST|PUT /api/v1/coberturas`; `POST /api/v1/integracoes/coberturas` (+ lote); UI `/gestao/coberturas/*`.
- **Perfis**: conforme [acessos-perfil.md](./acessos-perfil.md) BR-ACESSO-002 (FUNCIONARIO inclui POST cios/coberturas).
- **Efeito**: bloqueio no servidor (400) se `cio_id` ausente, inválido, de outro animal/fazenda ou já vinculado; UI envia `cio_id` (seleção automática do cio aberto do animal ou select explícito).
- **Implementação**: `CoberturaService.validateCioVinculo`; `CoberturaFormFields`; `GET /api/v1/coberturas/by-animal/:id`; `proximas_acoes` via `HasCioSemCoberturaByAnimalID`; OpenAPI Create/lote com `cio_id` required.
- **Migration/constraint**: `backend/migrations/40_unique_coberturas_cio_id.up.sql` (`uq_coberturas_cio_id`); sem `NOT NULL`.
- **Estado**: implementado (briefing **BRF-010**).

### BR-COBERTURAS-009 — Cobertura permitida em animal PRENHE

- **Enunciado**: É **permitido** registar cobertura (com cio vinculado — BR-COBERTURAS-008) em animal com `status_reprodutivo = PRENHE`, para corrigir erro de diagnóstico veterinário quando o animal voltou a dar cio. Na mesma transação: se existir gestação `CONFIRMADA` ativa, passa a `PERDA`; o status reprodutivo passa a `SERVIDA` (BR-CICLO-002).
- **Escopo**: Create de cobertura; não altera a regra de cio em PRENHE (BR-CIOS-003 mantém `PRENHE` ao registar cio).
- **Perfis**: mesmos de cobertura.
- **Efeito**: sem bloqueio por status `PRENHE`; gestação `CONFIRMADA` → `PERDA` via `CloseConfirmadaComoPerdaTx`.
- **Implementação**: `CoberturaService.Create` em TX (`CloseConfirmadaComoPerdaTx` + `UpdateStatusReprodutivoTx`).
- **Migration/constraint**: nenhuma.
- **Estado**: implementado (briefing **BRF-010**).

### BR-COBERTURAS-010 — Campos MVP de IA / IATF / TE

- **Enunciado**: No formulário de cobertura, para tipos **`IA`**, **`IATF`** e **`TE`**, a UI expõe os campos já persistidos no modelo: **`semen_partida`**, **`tecnico`** e **`protocolo_id`** (protocolo IATF da fazenda, quando aplicável). Campos **opcionais** na escrita (não bloqueiam submit se vazios), mas visíveis no MVP.
- **Escopo**: UI `/gestao/coberturas/novo` e `.../editar`; API já aceita os campos; listagem/detalhe podem mostrar valores quando existirem.
- **Perfis**: mesmos de cobertura.
- **Efeito**: informativo/captura de dados; sem novos códigos de erro obrigatórios neste MVP.
- **Implementação**: `CoberturaFormFields`; `frontend/src/services/coberturas.ts`; `frontend/src/services/protocolos_iatf.ts` quando tipo `IATF`.
- **Migration/constraint**: nenhuma.
- **Estado**: implementado (briefing **BRF-010**).

### BR-COBERTURAS-011 — Exclusão de cobertura recalcula status reprodutivo

- **Enunciado**: Após exclusão bem-sucedida de cobertura (já bloqueada se houver gestação ou toque — BR-COBERTURAS-004), o servidor **recalcula** `status_reprodutivo` do animal: se ainda houver gestação `CONFIRMADA` → `PRENHE`; senão, se restar cobertura sem toque/gestação → `SERVIDA`; senão → `VAZIA`. Atualização **silenciosa**.
- **Escopo**: `DELETE /api/v1/coberturas/:id` (e caminhos que reutilizem `CoberturaService.Delete`).
- **Perfis**: quem já pode excluir cobertura.
- **Efeito**: atualização no servidor após delete.
- **Implementação**: `CoberturaService.Delete` + `statusAposExclusaoCobertura` + `HasCoberturaAbertaByAnimalID`.
- **Migration/constraint**: nenhuma.
- **Estado**: implementado (briefing **BRF-010**).

### Canal de integração externa

- Registo via `POST /api/v1/integracoes/coberturas` ou lote `POST /api/v1/integracoes/coberturas/lote` (scope `coberturas:write`) — ver [integracoes.md](./integracoes.md) (`BR-INTEG-*`). Listagem: `GET /api/v1/integracoes/coberturas?animal_id=` (scope `coberturas:read`). Com **BR-COBERTURAS-008**, o payload M2M também exige `cio_id`.

---

**Última atualização**: 2026-08-26 (BR-COBERTURAS-008–011 implementados — BRF-010)
