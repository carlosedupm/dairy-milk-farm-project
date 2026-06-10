# Saúde animal

Módulo de registo de casos clínicos por animal (`animal_saude`) com CRUD no backend e sincronização automática de `animais.status_saude`. Inclui o calendário de vacinação (`animal_vacinas`) — BR-SAUDE-007 a 011.

**Implementação principal**

- Banco: migration `backend/migrations/30_add_animal_saude.up.sql` — tabela `animal_saude`, coluna `animais.status_saude`; migration `36_add_animal_vacinas.up.sql` — tabela `animal_vacinas`, coluna `animal_saude.vacina_id`, tipos de alerta `VACINA_VENCIDA`/`VACINA_REFORCO_VENCIDA`.
- Backend: `backend/internal/models/animal_saude.go`, `backend/internal/service/animal_saude_service.go`, `backend/internal/repository/animal_saude_repository.go`, `backend/internal/handlers/animal_saude_handler.go`; vacinas em `animal_vacina.go` (models/repository/service/handler equivalentes).
- Frontend: `frontend/src/services/animalSaude.ts`, `frontend/src/components/animais/AnimalSaudeForm.tsx`, `AnimalSaudeList.tsx`; listagem na tab **Saúde** da ficha (`/animais/:id?tab=saude`); formulários em `/animais/:id/saude/novo`, `/saude/editar/:saudeId`; rota `/animais/:id/saude` redireciona para a tab. Vacinas: `frontend/src/services/animalVacinas.ts`, tab **Vacinas** (`/animais/:id?tab=vacinas`), formulários em `/animais/:id/vacinas/novo`, `/vacinas/editar/:vacinaId`.
- Timeline: `appendCasosSaudeToTimeline` em `backend/internal/service/animal_ciclo_service.go`; UI `AnimalFichaCiclo.tsx`.
- **Assistente Live (GERENTE+)**: function calling `consultar_saude` e `registrar_saude` em `backend/internal/service/assistente_live_service.go` (`ExecuteFunction` → `AnimalSaudeService`); sem tool de exclusão/edição; `FUNCIONARIO` permanece bloqueado do assistente.

---

## Regras

### BR-SAUDE-001 — CRUD por sub-recurso de animal

- **Enunciado**: cada caso de saúde pertence a um animal e é gerido por sub-recurso.
- **Escopo**: animal individual dentro da fazenda do utilizador.
- **Perfis / permissões**:
  - `ADMIN`, `DEVELOPER`, `GESTAO`, `PROPRIETARIO`, `GERENTE`: CRUD completo (`GET|POST|PUT|DELETE`).
  - `FUNCIONARIO`: `GET` (listagem e detalhe) + `POST` (novo caso); `PUT` e `DELETE` → 403.
  - `USER`: sem acesso (403 em qualquer método).
- **Efeito**: bloqueio no servidor para animal/caso inexistente, fora de escopo ou perfil sem permissão de escrita.
- **Implementação**:
  - Rotas: `GET|POST /api/v1/animais/:id/saude`, `GET|PUT|DELETE /api/v1/animais/:id/saude/:saudeId`
  - RBAC API: `backend/internal/auth/perfil_access.go` (`funcionarioAnimaisSaudePath`); ver [acessos-perfil.md](./acessos-perfil.md) — BR-ACESSO-017.
  - RBAC UI: `frontend/src/config/appAccess.ts` (`isFuncionarioAllowedPath`, `canCriarRegistroSaude`, `canEditarRegistroSaude`, `canExcluirRegistroSaude`).
- **Estado**: implementado.

### BR-SAUDE-002 — Validação de domínio do caso de saúde

- **Enunciado**: `tipo_caso` e `status` aceitam apenas valores permitidos; `data_fim` não pode ser anterior à `data_inicio`.
- **Escopo**: criação e edição de casos de saúde.
- **Perfis / permissões**: qualquer perfil com permissão de escrita na rota.
- **Efeito**: bloqueio no servidor com erro de validação.
- **Implementação**:
  - Tipos: `TRATAMENTO`, `PREVENTIVO`, `CIRURGIA`, `OUTRO`
  - Status: `ATIVO`, `CONCLUIDO`, `CANCELADO`
  - Arquivos: `backend/internal/models/animal_saude.go`, `backend/internal/service/animal_saude_service.go`
  - Banco: migration `30_add_animal_saude.up.sql` (`CHECK` + `chk_animal_saude_data_fim`)
- **Estado**: implementado.

### BR-SAUDE-003 — Só animal no rebanho pode receber registo de saúde

- **Enunciado**: o CRUD de saúde exige animal existente e no rebanho operacional.
- **Escopo**: listagem, detalhe, criação, edição e exclusão dos casos.
- **Perfis / permissões**: todos os perfis com acesso à rota; respeita acesso à fazenda.
- **Efeito**: bloqueio no servidor (erro de domínio `ANIMAL_FORA_REBANHO`/não encontrado).
- **Implementação**:
  - Guardas: `ensureAnimalAtivo` + `EnsureAnimalNoRebanho`
  - Arquivo: `backend/internal/service/animal_saude_service.go`
- **Estado**: implementado.

### BR-SAUDE-004 — Sincronização automática do status de saúde do animal

- **Enunciado**: após criar, editar ou excluir caso de saúde, o sistema recalcula `animais.status_saude`.
- **Escopo**: todos os casos ativos (`status=ATIVO`) do animal.
- **Perfis / permissões**: automático no servidor, sem ação manual.
- **Efeito**: atualização de estado persistida no servidor.
- **Regra de cálculo** (`deriveAnimalStatusSaudeFromCasosAtivos`):
  1. Se existir caso ativo `TRATAMENTO` ou `CIRURGIA` → `EM_TRATAMENTO`
  2. Senão, se existir qualquer caso ativo → `DOENTE`
  3. Senão → `SAUDAVEL`
- **Implementação**:
  - Serviço: `syncAnimalStatusSaude` → `ListAtivosByAnimalID` → `UpdateStatusSaude`
  - Arquivos: `backend/internal/service/animal_saude_service.go`, `backend/internal/repository/animal_repository.go`
- **Estado**: implementado.

#### Fluxo de sincronização

```
Create / Update / Delete (AnimalSaudeService)
        │
        ▼
ListAtivosByAnimalID (status = ATIVO)
        │
        ▼
deriveAnimalStatusSaudeFromCasosAtivos
        │
        ▼
UpdateStatusSaude → animais.status_saude
```

- **Disparadores**: `Create`, `Update` e `Delete` em `AnimalSaudeService` chamam `syncAnimalStatusSaude` após persistir o caso.
- **Input**: apenas casos com `status = ATIVO`; casos `CONCLUIDO` ou `CANCELADO` **não** entram no cálculo.
- **Output**: `animais.status_saude` atualizado via `AnimalRepository.UpdateStatusSaude`.
- **Nuance — cadastro manual**: `status_saude` pode ser definido no cadastro/edição do animal (`AnimalService`, assistente virtual). Esse valor permanece até o **próximo** CRUD de caso de saúde, que **recalcula e sobrescreve** o campo. Não há sync bidirecional hoje.

### BR-SAUDE-005 — Casos de saúde na timeline da ficha

- **Enunciado**: cada caso de saúde do animal aparece na timeline paginada (`GET /api/v1/animais/:id/timeline`), intercalado por data com eventos de ciclo.
- **Escopo**: ficha `/animais/:id`; um evento por caso na `data_inicio` (sem evento duplicado em `data_fim`); filtro `tipo=saude`.
- **Perfis / permissões**: quem pode consultar o animal; link para edição na UI apenas para perfis com `canEditarRegistroSaude`.
- **Efeito**: informativo na timeline (`tipo=SAUDE`).
- **Implementação**:
  - Backend: `TimelineRepository` (UNION com `animal_saude`), `AnimalCicloService.ListTimelinePaginated`
  - Frontend: `AnimalTimelineSection.tsx` (ícone Pill, badge «Saúde», chips de filtro, scroll infinito)
- **Estado**: implementado.

### BR-SAUDE-006 — Saúde no contexto de busca

- **Enunciado**: o endpoint `GET /api/v1/animais/:id/contexto` expõe `animal.status_saude` e a lista `tratamentos_ativos[]` (casos ATIVOS de TRATAMENTO ou CIRURGIA com `tipo_caso`, `data_inicio`, `data_fim_prevista` opcional). A busca global exibe badge colorido por status (sem badge de saúde para animais fora do rebanho).
- **Escopo**: busca por identificação (`AnimalSearchPanel`) e consulta contextual do animal.
- **Perfis / permissões**: quem pode consultar o animal na fazenda.
- **Efeito**: informativo na UI (badge + linhas de tratamento no card resumido); dados servidos pelo servidor no contexto.
- **Implementação**:
  - Backend: `AnimalSaudeService.BuildTratamentosAtivosContexto`, `AnimalHandler.GetContextoByID`
  - Frontend: `AnimalStatusSaudeBadge`, `AnimalSearchResultLabel`, `buildAnimalContextoLinhasResumo`
- **Estado**: implementado.

---

## Cenários de exemplo

| # | Acção | Estado dos casos ATIVOS | `animais.status_saude` resultante | Efeito colateral |
|---|-------|-------------------------|-----------------------------------|------------------|
| 1 | POST caso `TRATAMENTO` + `ATIVO` | 1× TRATAMENTO | `EM_TRATAMENTO` | — |
| 2 | PUT `status=CONCLUIDO` no tratamento (sem outros ATIVOS) | nenhum | `SAUDAVEL` | Auto-resolve alerta `TRATAMENTO_VENCIDO` — [BR-ALERTA-010](./alertas.md) |
| 3 | POST caso `PREVENTIVO` + `ATIVO` (sem TRATAMENTO/CIRURGIA) | 1× PREVENTIVO | `DOENTE` | — |
| 4 | TRATAMENTO + PREVENTIVO ambos ATIVOS | 2 casos | `EM_TRATAMENTO` | TRATAMENTO/CIRURGIA têm prioridade sobre outros tipos |
| 5 | PUT `status=CANCELADO` no único caso ATIVO | nenhum | `SAUDAVEL` | Caso cancelado deixa de contar no cálculo |
| 6 | DELETE do último caso ATIVO | nenhum | `SAUDAVEL` | — |

**Alerta de tratamento vencido**: caso `TRATAMENTO` + `ATIVO` + `data_fim IS NULL` com `data_inicio` há mais de 14 dias gera alerta `TRATAMENTO_VENCIDO` na geração diária — ver [alertas.md](./alertas.md) BR-ALERTA-008.

---

## Referências cruzadas

| Regra | Relação |
|-------|---------|
| [BR-CICLO-005](./ciclo-rebanho.md) | **Independente** — saúde não altera lactações ativas |
| [BR-CICLO-007](./ciclo-rebanho.md) | **Independente** — produção de leite não exige `SAUDAVEL` |
| [BR-CICLO-008](./ciclo-rebanho.md) / BR-SAUDE-005 | Timeline unificada na ficha (`tipo=SAUDE`) |
| [BR-BAIXA-002](./baixa-rebanho.md) / BR-SAUDE-003 | CRUD de saúde só com animal no rebanho |
| [BR-ALERTA-008](./alertas.md) / [BR-ALERTA-010](./alertas.md) | Tratamento vencido (>14d) → alerta; conclusão do tratamento → resolve |
| [BR-ACESSO-017](./acessos-perfil.md) | Matriz RBAC API/UI para saúde animal |

---

## Backlog (planejado)

| Item | Estado | Notas |
|------|--------|-------|
| Vacinas / calendário preventivo | implementado | BR-SAUDE-007 a 011 (BRF-001) |
| Validação temporal BR-CICLO-012 em datas de caso | planejado | Datas de caso não validadas contra «hoje» ou entrada do animal |
| Bloqueio de edição manual de `status_saude` com casos ATIVOS | planejado | Gap opcional; hoje cadastro manual pode divergir até próximo CRUD de caso |

---



---

### BR-SAUDE-007 — Vacinas / calendário preventivo

- **Enunciado**: O sistema mantém um calendário de vacinação por animal, permitindo registrar vacinas aplicadas e vacinas previstas com data. Vacinas previstas geram alertas automáticos quando atrasadas.
- **Escopo**: Animal individual dentro da fazenda do utilizador. Complementa o CRUD de casos clínicos (BR-SAUDE-001) com uma tipologia específica de PREVENTIVO com agendamento.
- **Perfis / permissões**:
  - ADMIN, DEVELOPER, GESTAO, PROPRIETARIO, GERENTE: CRUD completo (registrar vacina, agendar vacina prevista, editar, excluir).
  - FUNCIONARIO: GET (listagem de vacinas do animal) + POST (registrar vacina aplicada) + PATCH `/aplicar`; POST sem `data_aplicacao`, PUT e DELETE → 403.
  - USER: sem acesso (403 em qualquer método).
- **Efeito**: bloqueio no servidor para animal fora de escopo ou perfil sem permissão de escrita.
- **Estrutura de dados**:
  - Tabela `animal_vacinas`: id, animal_id, fazenda_id, tipo_vacina (CHECK: AFTOSA, BRUCELOSE, RAIVA, CLOSTRIDIOSES, IBR_BVD, LEPTOSPIROSE, OUTRO), dose, data_prevista (NOT NULL), data_aplicacao (NULL = prevista), validade_dias, data_proximo_reforco, lote, veterinario, observacoes, created_by, created_at, updated_at.
  - Vacina prevista = `data_aplicacao IS NULL`; vacina aplicada = `data_aplicacao NOT NULL`. Status derivado (`PREVISTA`/`APLICADA`/`ATRASADA`/`REFORCO_VENCIDO`) calculado no service (`models.DeriveVacinaStatus`).
- **Regras de domínio**:
  - `data_aplicacao` <= hoje (TMP-001, via BR-CICLO-012) e >= entrada/nascimento do animal (TMP-002) — `validateVacinaDataAplicacao`.
  - `data_prevista` default = `data_aplicacao` quando registro direto de vacina aplicada.
  - Só uma vacina prevista aberta por tipo+animal (409 `VACINA_DUPLICADA`).
  - FUNCIONARIO só registra vacina aplicada: POST sem `data_aplicacao` → 403 `VACINA_AGENDAMENTO_NAO_PERMITIDO` (decisão G1 #4 BRF-001).
  - Ao aplicar (POST aplicada, PATCH `/aplicar` ou PUT prevista→aplicada): auto-resolve de `VACINA_VENCIDA`/`VACINA_REFORCO_VENCIDA` (BR-ALERTA-010 estendido) + caso PREVENTIVO (BR-SAUDE-010).
  - PATCH aplicar em vacina já aplicada → 400 `VACINA_JA_APLICADA`.
- **Implementação**:
  - Migration `backend/migrations/36_add_animal_vacinas.up.sql` (tabela + índices + RLS).
  - Backend: `backend/internal/models/animal_vacina.go`, `backend/internal/repository/animal_vacina_repository.go`, `backend/internal/service/animal_vacina_service.go`, `backend/internal/handlers/animal_vacina_handler.go`.
  - Rotas: `GET|POST /api/v1/animais/:id/vacinas`, `GET|PUT|DELETE /api/v1/animais/:id/vacinas/:vacinaId`, `PATCH .../:vacinaId/aplicar`.
  - Frontend: `frontend/src/services/animalVacinas.ts`, `AnimalVacinaForm.tsx`, `AnimalVacinaFormFields.tsx`, `AnimalVacinaList.tsx`, `AnimalVacinaAplicarDialog.tsx`, `VacinaStatusBadge.tsx`, tab `AnimalFichaTabVacinas.tsx`.
  - RBAC API: `perfil_access.go` (`funcionarioAnimaisVacinasPath` — GET/POST/PATCH aplicar; PUT/DELETE 403).
  - RBAC UI: `appAccess.ts` (`canCriarVacina`, `canAgendarVacina`, `canAplicarVacina`, `canEditarVacina`, `canExcluirVacina`).
- **Estado**: implementado.

### BR-SAUDE-008 — Alerta de vacina atrasada

- **Enunciado**: Quando vacina prevista (data_aplicacao IS NULL) ultrapassa a data_prevista em mais de 7 dias, o sistema gera automaticamente alerta do tipo VACINA_VENCIDA (severidade ALTA). Ao registrar a aplicação (data_aplicacao preenchida), o alerta correspondente é resolvido automaticamente.
- **Escopo**: Geração automática diária + resolução automática no CRUD da vacina.
- **Perfis / permissões**: sistema (criação automática); GERENTE+ (resolução manual); FUNCIONARIO (visualização).
- **Efeito**: alerta automático; auto-resolve ao aplicar vacina.
- **Implementação**:
  - Regra 7 em `AlertaGeracaoService.gerarPorFazenda` (`regraVacinaVencida` + `AnimalVacinaRepository.ListPrevistasVencidasByFazendaID` — animal no rebanho, `data_prevista` ≤ ref − 7 dias, sem `data_aplicacao`).
  - `AnimalVacinaService.afterAplicacao` → `ResolveOpenByAnimal` (`VACINA_VENCIDA` e `VACINA_REFORCO_VENCIDA`).
  - `models.SeveridadePadraoPorTipo` → `VACINA_VENCIDA` = ALTA, Web Push = Sim.
- **Relação com alertas**: BR-ALERTA-016 (regra de geração automática).
- **Estado**: implementado.

### BR-SAUDE-009 — Vacinas na timeline da ficha

- **Enunciado**: Vacinas previstas e aplicadas aparecem na timeline paginada da ficha (GET /api/v1/animais/:id/timeline), com filtro tipo=VACINA. Vacina prevista exibe ícone de relógio; vacina aplicada exibe ícone de check. Vacina atrasada (prevista com data_prevista no passado e sem data_aplicacao) exibe ícone de alerta.
- **Escopo**: Ficha /animais/:id, tab Histórico, filtro Vacinas.
- **Perfis / permissões**: quem pode consultar o animal.
- **Efeito**: informativo na timeline (tipo=VACINA).
- **Implementação**:
  - `TimelineRepository` (UNION em `animal_vacinas`, filtro `tipo=vacinas`, título com sufixo aplicada/atrasada/prevista).
  - Frontend: chip **Vacinas** em `AnimalTimelineSection.tsx`; ícone Syringe em `AnimalTimelineList.tsx`.
- **Estado**: implementado.

### BR-SAUDE-010 — Aplicar vacina cria caso PREVENTIVO em animal_saude

- **Enunciado**: Ao registrar a aplicação de uma vacina (POST com `data_aplicacao` ou `PATCH .../aplicar`), o sistema cria automaticamente um caso em `animal_saude` com `tipo_caso = PREVENTIVO`, `status = CONCLUIDO`, `data_inicio = data_aplicacao` e observação derivada do tipo da vacina, vinculado via FK `animal_saude.vacina_id`.
- **Escopo**: Toda aplicação de vacina (direta ou via PATCH aplicar).
- **Perfis / permissões**: automático no servidor, sem ação manual.
- **Efeito**: registro criado em `animal_saude`; falha na criação do caso não bloqueia a aplicação da vacina (log de warning). Caso `CONCLUIDO` não altera `status_saude` do animal (BR-SAUDE-004 considera apenas ATIVO).
- **Implementação**:
  - Coluna `animal_saude.vacina_id` BIGINT NULL FK → `animal_vacinas(id)` ON DELETE SET NULL (migration 36).
  - `AnimalVacinaService.createCasoPreventivo` (chamado em `afterAplicacao`).
- **Estado**: implementado.

### BR-SAUDE-011 — Validade e reforço de vacina

- **Enunciado**: Uma vacina aplicada pode ter validade (`validade_dias` > 0, opcional). Quando informada, o sistema calcula `data_proximo_reforco = data_aplicacao + validade_dias`; o valor pode ser editado manualmente (prevalece o manual). Vacina aplicada com `data_proximo_reforco` ultrapassada em mais de 7 dias, sem nova dose do mesmo tipo aplicada depois, gera alerta `VACINA_REFORCO_VENCIDA` (ver BR-ALERTA-017).
- **Escopo**: Registro e edição de vacinas aplicadas.
- **Perfis / permissões**: mesma matriz de escrita de vacinas (BR-SAUDE-007).
- **Efeito**: cálculo automático no servidor; alerta automático na geração diária.
- **Implementação**:
  - Colunas `validade_dias` (INT NULL CHECK > 0) e `data_proximo_reforco` (DATE NULL) em `animal_vacinas` (migration 36; constraint `chk_vacina_reforco_aplicada`).
  - Cálculo em `AnimalVacinaService` (`resolveDataProximoReforco` em Create/Update/Aplicar) — valor manual prevalece.
  - Auto-resolve do alerta ao registrar nova dose aplicada (`afterAplicacao` — BR-ALERTA-010 estendido).
- **Estado**: implementado.

---
**Última atualização**: 2026-06-09 (BR-SAUDE-007 a 011 — vacinas / calendário preventivo)
