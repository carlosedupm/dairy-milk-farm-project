# Regras de negócio — Produção de leite

Registro diário de **volume de leite** por animal na fazenda.

**Implementação principal**

- Backend: `backend/internal/service/producao_service.go`, `backend/internal/handlers/producao_handler.go`.
- API: `POST /api/v1/producao` (entre outras rotas de consulta/edição para perfis autorizados).
- Listagens globais (`GET /api/v1/producao`, `/count`, `/filter/by-date`): apenas registros de animais das fazendas do usuário; query `fazenda_id` restringe à fazenda ativa (validada em `ResolveFazendaIDsForList`).
- Frontend: `frontend/src/app/producao/*` (modo ordenha `/producao/ordenha` — BR-PRODUCAO-008; registo avulso contínuo `/producao/novo` — BR-PRODUCAO-007), `ProducaoForm.tsx`, `LitrosInput.tsx`, `lib/litros-format.ts`, `lib/ordenha-turno.ts`, `ProducaoTable.tsx` — listagem usa `useFazendaAtiva()` + `fazenda_id` na API; filtro de período via `PeriodFilter` + `GET .../filter/by-date` com **últimos 30 dias** por defeito quando `start`/`end` não estão na URL (`lib/period-filter.ts`); input de quantidade em pt-BR (vírgula), máx. 2 decimais.
- RBAC: FUNCIONARIO com `POST` — [acessos-perfil.md](./acessos-perfil.md) BR-ACESSO-015.

---

### BR-PRODUCAO-001 — Animal existente na fazenda

- **Enunciado**: `animal_id` obrigatório; animal deve existir e o utilizador deve ter acesso à fazenda do animal.
- **Efeito**: bloqueio no servidor.
- **Estado**: implementado.

### BR-PRODUCAO-002 — Quantidade e qualidade

- **Enunciado**: `quantidade` > 0; `qualidade` opcional entre 1 e 10.
- **Efeito**: bloqueio no servidor.
- **Implementação**: `LitrosInput` + `parseLitrosValue` (`lib/litros-format.ts`); exibição alinhada em listagens via `formatLitrosForList`.
- **Estado**: implementado.

### BR-PRODUCAO-003 — Produção exige lactação ativa na data do registo

- **Enunciado**: Não é permitido registrar ou editar produção sem lactação ativa na **data** do registo (`data_inicio` da lactação ≤ data da produção; lactação com `data_fim` nula e status nulo ou `EM_ANDAMENTO`). Alinhado a INT-002 / BR-AUDIT-010.
- **Escopo**: `POST` e `PUT` produção; alinhado a [leite-restricoes.md](./leite-restricoes.md) BR-LEITE-005.
- **Efeito**: bloqueio no servidor (400, `details.conformidade`: `INT-002`); aviso e **bloqueio de submit** na UI quando lactação/data inválidas (validação definitiva no servidor).
- **Implementação**: `ValidateLactacaoAtivaParaProducao`, `LactacaoRepository.ExistsAtivaNaFazendaNaData`; `ProducaoForm` lista apenas animais de `GET .../animais/em-lactacao`; indicador proativo `ProducaoLactacaoIndicator` (Sim/Não, n.º e data de início, aviso e link para `/gestao/lactacoes/novo` quando permitido pelo perfil; validação client na `data_hora` via `producaoLactacaoUtils.ts`; submit bloqueado quando indicador em alerta); [ciclo-rebanho.md](./ciclo-rebanho.md) BR-CICLO-007.
- **Estado**: implementado.

### BR-PRODUCAO-005 — Data/hora da produção (temporal)

- **Enunciado**: `data_hora` não futura; ≥ entrada/nascimento; lactação na data (INT-002); se lactação encerrada, produção ≤ `data_fim` — BR-CICLO-012–014 (TMP-001, TMP-002, TMP-006).
- **Efeito**: bloqueio no servidor (400, `details.conformidade` TMP-* ou INT-002).
- **Implementação**: `ProducaoService` + `ciclo_integridade_temporal.go`; `ProducaoForm` com `maxDate` agora.
- **Estado**: implementado.

---

### BR-PRODUCAO-004 — Listagem por escopo de fazenda

- **Enunciado**: Consultas globais de produção retornam apenas registros de animais pertencentes às fazendas vinculadas ao utilizador; com `fazenda_id` na query, apenas essa fazenda (se o utilizador tiver acesso).
- **Efeito**: bloqueio no servidor (403 se `fazenda_id` sem vínculo); UI alinhada à fazenda ativa do header.
- **Implementação**: `ResolveFazendaIDsForList`, `ProducaoRepository.GetByFazendaIDs*`; `frontend/src/app/producao/page.tsx`.
- **Estado**: implementado.

### BR-PRODUCAO-006 — Vínculo automático à lactação (`lactacao_id`)

- **Enunciado**: Ao registrar produção (`POST`), o servidor preenche `lactacao_id` com a lactação da fazenda cujo intervalo (`data_inicio` … `data_fim`) cobre a **data civil** do registo. O cliente **não** envia `lactacao_id`. Em `PUT`, o campo não é aceito no body; o servidor **preserva** o vínculo existente salvo alteração de `animal_id` ou `data_hora`, quando recalcula. Registos legados permanecem com `lactacao_id` NULL.
- **Escopo**: `producao_leite` + `lactacoes`; listagens `GET /api/v1/producao` e `GET .../filter/by-date` aceitam filtro opcional `lactacao_id`; tab **Produção** da ficha (`/animais/:id?tab=producao`) agrupa produção por lactação (total, média diária, duração); rota `/animais/:id/producao` redireciona para a tab.
- **Efeito**: bloqueio implícito via validações INT-002/TMP-006 se não houver lactação cobrindo a data; filtro GET restringe resultados; UI informativa no formulário.
- **Implementação**: migration `34_add_lactacao_id_producao_leite`; backfill legado migration `39_backfill_producao_lactacao_id`; `FindLactacaoForProducaoDate`, `ProducaoService`, `ProducaoHandler`; frontend `producao.ts`, `/producao`, `/animais/[id]/producao`; alinhado a [ciclo-rebanho.md](./ciclo-rebanho.md) BR-CICLO-007.
- **Estado**: implementado.

### BR-PRODUCAO-007 — Registro contínuo na ordenha (UI)

- **Enunciado**: Em `/producao/novo`, após um registro bem-sucedido o formulário **permanece aberto** para a próxima vaca: limpa animal, litros e qualidade; **preserva** fazenda e data/hora do contexto da ordenha; foca o seletor de animal. Botão **Concluir** leva à listagem `/producao`. Toast de sucesso pode incluir atalho para a ficha do animal recém-registado, sem interromper o ritmo.
- **Escopo**: UI JWT de novo registro (não altera edição nem a API unitária `POST /api/v1/producao`).
- **Perfis / permissões**: mesmos de POST produção (incl. FUNCIONARIO — BR-ACESSO-015).
- **Efeito**: apenas UX; validações de domínio (lactação, TMP-*, quantidade) mantêm-se por registro.
- **Implementação**: `ProducaoForm` (`continuous`), `frontend/src/app/producao/novo/page.tsx`; `AnimalSelect` `focusToken`.
- **Estado**: implementado.

### BR-PRODUCAO-008 — Modo ordenha (sessão UI com turno)

- **Enunciado**: Existe um fluxo dedicado de **ordenha** (`/producao/ordenha`) em que o utilizador inicia uma **sessão** por fazenda, **dia civil** e **turno** (`MANHA` \| `TARDE`), vê a lista de animais em lactação ativa, regista litros de forma sequencial (próxima / pular / encerrar) e obtém resumo ao encerrar. O turno default é **inferido** da data-hora atual (MANHA `00:00–11:59`, TARDE `12:00–23:59`); o utilizador pode **escolher** Manhã ou Tarde no setup. Cada `POST` grava `data_hora` = **agora** (`TMP-001`); o turno da sessão classifica checklist e bloqueio, não inventa hora. Se já existir produção do animal no mesmo dia civil com `data_hora` na janela do turno da sessão, o modo ordenha **bloqueia** novo registo dessa vaca (UI). Cada registo continua a ser `POST /api/v1/producao` unitário; não há entidade `sessao_ordenha` nem coluna `turno` no banco nesta fase. `/producao/novo` (BR-PRODUCAO-007) não aplica este bloqueio de turno.
- **Escopo**: UI JWT; sessão em `sessionStorage` (chave por fazenda+dia+turno); fonte de verdade de «já neste turno» / bloqueio = produções do dia via API; estado local só para puladas, foco e litros em digitação.
- **Perfis / permissões**: mesmos de `POST` produção — [acessos-perfil.md](./acessos-perfil.md) BR-ACESSO-015 (path `/producao/ordenha`).
- **Efeito**: UX operacional + bloqueio de duplicata no turno (só no modo ordenha); validações de domínio no servidor (BR-PRODUCAO-001–006, TMP-001, INT-002) inalteradas.
- **Implementação**: `frontend/src/app/producao/ordenha/page.tsx`, `lib/ordenha-turno.ts`, `hooks/useOrdenhaSession.ts`, `components/producao/OrdenhaSessionView.tsx`, `OrdenhaAnimalCard.tsx`; atalhos Dashboard e `/producao`; briefing [`BRF-009`](../briefings/BRF-009-modo-ordenha-turno.md).
- **Estado**: implementado.

### BR-PRODUCAO-009 — Aviso de restrição de leite na lista da ordenha

- **Enunciado**: Na lista do modo ordenha (BR-PRODUCAO-008), animais com restrição `AGUARDANDO_LAB` na fazenda devem exibir **badge/aviso** de que o leite não deve ir ao tanque (descarte / balde), sem impedir o registo de volume.
- **Escopo**: UI do modo ordenha; dados de `GET /api/v1/fazendas/:id/restricoes-leite/ativas` — alinhado a [leite-restricoes.md](./leite-restricoes.md) BR-LEITE-002 / BR-LEITE-008.
- **Perfis / permissões**: quem pode usar o modo ordenha (BR-ACESSO-015).
- **Efeito**: apenas informativo na UI (não altera POST produção nem status da restrição).
- **Implementação**: `OrdenhaSessionView` / `OrdenhaAnimalCard` + `listAtivas` (`restricoesLeite.ts`); briefing [`BRF-009`](../briefings/BRF-009-modo-ordenha-turno.md).
- **Estado**: implementado.

---

**Última atualização**: 2026-07-21 (BRF-009 implementado — modo ordenha)
