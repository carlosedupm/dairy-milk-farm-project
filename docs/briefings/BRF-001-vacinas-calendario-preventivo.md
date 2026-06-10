# Briefing BRF-001 — Vacinas / calendário preventivo

> Fluxo, papéis e gates: [`docs/briefings/README.md`](./README.md). O briefing é uma **ordem de serviço**: referencia regras por ID, não as copia.

## Metadados

| Campo | Valor |
|-------|-------|
| ID | `BRF-001` |
| Data | 2026-06-09 |
| Analista | OWL (Hermes Agent) |
| Status | implementado |
| Aprovado por (G1) | Desenvolvedor (decisões registradas na seção 5, 2026-06-09) |
| PR vinculado (G2) | — |
| Implementado (G3) | 2026-06-09 — migration 36, backend + frontend + testes; catálogo atualizado (BR-SAUDE-007–011, BR-ALERTA-016/017, BR-ACESSO-022) |

## 1. Objetivo

O operador da fazenda precisa manter um **calendário de vacinação** por animal, registrando tanto vacinas já aplicadas quanto vacinas previstas com data. Quando uma vacina prevista está atrasada (mais de 7 dias além da data prevista), o sistema deve gerar automaticamente um alerta para que a equipe tome ação. Ao registrar a aplicação da vacina, o alerta correspondente deve ser resolvido automaticamente. As vacinas devem aparecer na timeline da ficha do animal.

## 2. Regras de negócio (fonte de verdade)

Regras em `docs/business/` que este trabalho implementa ou altera. Regras novas devem já existir no catálogo com estado `planejado` antes do gate G1.

| ID | Módulo | Estado atual | O que muda |
|----|--------|--------------|------------|
| `BR-SAUDE-007` | [`saude-animal.md`](../business/saude-animal.md) | planejado | Criação: CRUD de vacinas por animal (tabela `animal_vacinas`) |
| `BR-SAUDE-008` | [`saude-animal.md`](../business/saude-animal.md) | planejado | Criação: alerta `VACINA_VENCIDA` + auto-resolve |
| `BR-SAUDE-009` | [`saude-animal.md`](../business/saude-animal.md) | planejado | Criação: vacinas na timeline da ficha |
| `BR-SAUDE-010` | [`saude-animal.md`](../business/saude-animal.md) | planejado | Criação: aplicar vacina cria caso `PREVENTIVO` em `animal_saude` (decisão G1 #1) |
| `BR-SAUDE-011` | [`saude-animal.md`](../business/saude-animal.md) | planejado | Criação: validade/reforço (`validade_dias`, `data_proximo_reforco`) (decisão G1 #5) |
| `BR-ALERTA-016` | [`alertas.md`](../business/alertas.md) | planejado | Criação: regra 7 de geração automática (`VACINA_VENCIDA`) |
| `BR-ALERTA-017` | [`alertas.md`](../business/alertas.md) | planejado | Criação: regra 8 de geração automática (`VACINA_REFORCO_VENCIDA`) (decisão G1 #5) |

**Invariantes e validações aplicáveis** (citar apenas IDs):

- `TMP-001` (BR-CICLO-012): `data_aplicacao` não pode ser futura.
- `TMP-002` (BR-CICLO-013): `data_aplicacao` ≥ `animal.data_entrada`.
- `BR-SAUDE-003`: vacina só para animal no rebanho.
- `BR-ALERTA-009`: deduplicação de alertas abertos (mesmo tipo + animal).
- `BR-ALERTA-010`: resolução automática de alertas ao resolver evento-fonte.
- `INT-007` (BR-AUDIT-007): baixa deve encerrar ciclo aberto — vacinas previstas de animal baixado não geram novos alertas (filtro `data_saida IS NULL` na geração).

**Perfis autorizados** (conforme [`acessos-perfil.md`](../business/acessos-perfil.md)):

- ADMIN, DEVELOPER, GESTAO, PROPRIETARIO, GERENTE: CRUD completo em `animal_vacinas` (incl. agendar prevista).
- FUNCIONARIO: GET (listagem/detalhe) + POST (**registrar vacina aplicada** — `data_aplicacao` obrigatória, validado no servidor) + PATCH aplicar; agendar prevista, PUT e DELETE → 403.
- USER: sem acesso (403).
- Alertas `VACINA_VENCIDA` / `VACINA_REFORCO_VENCIDA`: FUNCIONARIO visualiza; GERENTE+ resolve/ignora (BR-ALERTA-007).

## 3. Escopo da implementação

### Backend

- **Endpoints**:
  - `GET /api/v1/animais/:id/vacinas` — listar vacinas do animal (paginação opcional, filtro por status: prevista/aplicada/todas).
  - `POST /api/v1/animais/:id/vacinas` — registrar vacina (aplicada ou prevista).
  - `GET /api/v1/animais/:id/vacinas/:vacinaId` — detalhe de uma vacina.
  - `PUT /api/v1/animais/:id/vacinas/:vacinaId` — editar vacina (GERENTE+).
  - `PATCH /api/v1/animais/:id/vacinas/:vacinaId/aplicar` — marcar vacina prevista como aplicada (preenche `data_aplicacao`, GERENTE+ ou FUNCIONARIO).
  - `DELETE /api/v1/animais/:id/vacinas/:vacinaId` — excluir vacina (GERENTE+).
  - Estender `GET /api/v1/animais/:id/timeline` com `tipo=VACINA` (inclui previstas futuras — decisão G1 #3).
  - Estender `AlertaGeracaoService.GerarAlertasDiarios` com regra 7 (`VACINA_VENCIDA`) e regra 8 (`VACINA_REFORCO_VENCIDA` — decisão G1 #5).
  - Aplicar vacina cria caso `PREVENTIVO` em `animal_saude` com FK `vacina_id` (decisão G1 #1 — BR-SAUDE-010).
  - Campos de reforço: `validade_dias` (INT > 0, opcional) e `data_proximo_reforco` (calculada de `data_aplicacao + validade_dias` quando informado; editável manualmente — BR-SAUDE-011).

- **Camadas tocadas**:
  - Handler: `backend/internal/handlers/animal_vacina_handler.go` (novo).
  - Handler: `backend/internal/handlers/alerta_handler.go` (estender geração).
  - Service: `backend/internal/service/animal_vacina_service.go` (novo).
  - Service: `backend/internal/service/alerta_geracao_service.go` (estender regra 7).
  - Service: `backend/internal/service/animal_ciclo_service.go` (estender timeline).
  - Repository: `backend/internal/repository/animal_vacina_repository.go` (novo).
  - Repository: `backend/internal/repository/alerta_repository.go` (estender índices).
  - Repository: `backend/internal/repository/timeline_repository.go` (estender UNION).
  - Model: `backend/internal/models/animal_vacina.go` (novo).
  - Model: `backend/internal/models/alerta.go` (estender `SeveridadePadraoPorTipo`).
  - Routes: `backend/cmd/api/main.go` (registrar rotas).
  - Auth: `backend/internal/auth/perfil_access.go` (estender whitelist).

- **Migration/constraint**:
  - `36_add_animal_vacinas.up.sql`: tabela `animal_vacinas` com:
    - `tipo_vacina` CHECK (AFTOSA, BRUCELOSE, RAIVA, CLOSTRIDIOSES, IBR_BVD, LEPTOSPIROSE, OUTRO) — padrão VARCHAR+CHECK das demais tabelas.
    - `validade_dias` INT NULL CHECK (`validade_dias > 0`); `data_proximo_reforco` DATE NULL (BR-SAUDE-011).
    - CHECK `chk_vacina_data_aplicacao_validade` (`data_aplicacao IS NOT NULL OR data_proximo_reforco IS NULL` — reforço só faz sentido após aplicação).
    - Validação TMP-001/TMP-002 e `data_aplicacao >= data_entrada` no service (subquery em CHECK é frágil).
    - Índices: `idx_vacinas_animal`, `idx_vacinas_prevista` (parcial: `data_aplicacao IS NULL`), `idx_vacinas_reforco` (parcial: `data_aplicacao IS NOT NULL AND data_proximo_reforco IS NOT NULL`).
    - RLS habilitado (padrão migration 19/30).
    - Coluna `animal_saude.vacina_id` BIGINT NULL FK → `animal_vacinas(id)` ON DELETE SET NULL (BR-SAUDE-010).
    - Tipos novos no CHECK de `alertas.tipo`: `VACINA_VENCIDA`, `VACINA_REFORCO_VENCIDA` (dedup garantida pelo índice existente `uq_alertas_aberto_tipo_animal` — cobre qualquer tipo automático).

- **Códigos de erro**:
  - `VACINA_NAO_ENCONTRADA` 404.
  - `VACINA_DUPLICADA` 409 (se tentar criar prevista para mesmo tipo+animal com prevista aberta).
  - `VACINA_DATA_INVALIDA` 400 (data futura, data < entrada — TMP-001/TMP-002).
  - `VACINA_AGENDAMENTO_NAO_PERMITIDO` 403 (FUNCIONARIO tentando POST sem `data_aplicacao` — decisão G1 #4).
  - `VACINA_JA_APLICADA` 400 (PATCH aplicar em vacina já aplicada).
  - `ANIMAL_FORA_REBANHO` 400 (BR-SAUDE-003).

### Frontend

- **Páginas/rotas**:
  - Tab **Vacinas** na ficha do animal (`/animais/:id?tab=vacinas`) — nova tab ou seção dentro de Saúde.
  - Formulário de registro: inline na tab ou página `/animais/:id/vacinas/novo`.
  - Formulário de edição: `/animais/:id/vacinas/:vacinaId/editar` (GERENTE+).
  - Ação rápida "Aplicar" em vacinas previstas (PATCH aplicar).
  - Extensão da timeline: chip "Vacinas" com ícones por status.

- **Componentes**:
  - `AnimalVacinaForm.tsx` + `AnimalVacinaFormFields.tsx` — formulário compartilhado novo/editar.
  - `AnimalVacinaList.tsx` — listagem (cards mobile, tabela desktop).
  - `AnimalVacinaTable.tsx` — tabela desktop.
  - `VacinaStatusBadge.tsx` — badge por status (prevista/aplicada/atrasada).
  - `AnimalVacinaAplicarDialog.tsx` — diálogo de confirmação para aplicar vacina.
  - Extensão: `AnimalTimelineSection.tsx` — chip "Vacinas" + timeline entry.
  - Extensão: `AnimalSaudePage.tsx` — link para tab Vacinas.
  - Extensão: `appAccess.ts` — `canCriarVacina`, `canEditarVacina`, `canExcluirVacina`, `canAplicarVacina`, `isAplicarVacinaPathAllowedForFuncionario`.

- (Checklist de UI: seguir `.cursor/rules/frontend-ui-patterns.mdc` — não repetir aqui)

### O que NÃO mexer

- CRUD de casos clínicos (`animal_saude`) — BR-SAUDE-001 a 006 permanecem inalterados.
- Geração automática de alertas existente (regras 1-6) — apenas estender com regra 7.
- Tabela `alertas` — apenas novo índice parcial, sem alterar colunas existentes.
- RBAC de outros módulos (folgas, produção, gestão) — não alterar.
- Migrations existentes (1-35) — não modificar.

## 4. Casos de teste exigidos

O implementador deve criar/apontar testes para cada caso. Regra sem teste correspondente não passa no gate G3.

- [ ] **Caminho feliz**: criar vacina prevista → listar → aplicar (PATCH) → verificar `data_aplicacao` preenchida.
- [ ] **Caminho feliz**: criar vacina aplicada diretamente (POST com `data_aplicacao`) → verificar timeline.
- [ ] **Caminho feliz**: geração automática cria `VACINA_VENCIDA` para vacina prevista com `data_prevista` há >7 dias.
- [ ] **Caminho feliz**: ao aplicar vacina, alerta `VACINA_VENCIDA` correspondente → `RESOLVIDO`.
- [ ] **Borda TMP-001**: POST com `data_aplicacao` futura → 400.
- [ ] **Borda TMP-002**: POST com `data_aplicacao` < `animal.data_entrada` → 400.
- [ ] **Borda BR-SAUDE-003**: POST para animal baixado (`data_saida` não nula) → 400.
- [ ] **Borda BR-ALERTA-009**: não criar segundo `VACINA_VENCIDA` aberto para mesmo animal.
- [ ] **Borda INT-007**: vacina prevista de animal baixado não gera alerta `VACINA_VENCIDA`.
- [ ] **RBAC FUNCIONARIO**: PUT/DELETE vacina → 403; PATCH aplicar → 200; POST sem `data_aplicacao` (agendar) → 403 (decisão G1 #4).
- [ ] **RBAC USER**: qualquer método → 403.
- [ ] **Timeline**: `GET /api/v1/animais/:id/timeline?tipo=VACINA` retorna entries de vacina (aplicadas, previstas futuras e atrasadas).
- [ ] **BR-SAUDE-010**: aplicar vacina cria caso `PREVENTIVO` em `animal_saude` com `vacina_id` preenchido.
- [ ] **BR-SAUDE-011**: POST/PATCH com `validade_dias` calcula `data_proximo_reforco = data_aplicacao + validade_dias`; valor manual prevalece quando informado.
- [ ] **BR-ALERTA-017**: geração automática cria `VACINA_REFORCO_VENCIDA` para vacina aplicada com `data_proximo_reforco` há >7 dias sem nova dose do mesmo tipo.
- [ ] **Migration down**: rollback da 36 recria estado anterior sem erros.

## 5. Perguntas em aberto (obrigatório)

| # | Pergunta | Resposta (desenvolvedor) |
|---|----------|--------------------------|
| 1 | A vacina aplicada deve atualizar `animal_saude` (criar caso PREVENTIVO) automaticamente, ou são registros independentes? | **Criar caso PREVENTIVO automaticamente** ao aplicar (ver `BR-SAUDE-010`; vínculo via FK `animal_saude.vacina_id`). |
| 2 | Deve haver um template de calendário padrão por especie/raca (ex.: calendário obrigatório de Aftosa) ou cada cadastro é manual? | **Cadastro manual** nesta entrega; template de calendário fica para versão futura. |
| 3 | A timeline deve mostrar vacinas previstas futuras ou apenas as atrasadas/aplicadas? | **Mostrar todas**: aplicadas, previstas futuras e atrasadas (`BR-SAUDE-009`). |
| 4 | O funcionario pode agendar vacina prevista (POST com `data_aplicacao` NULL) ou só registrar aplicada? | **Só registrar aplicada** (POST com `data_aplicacao` obrigatória) e `PATCH aplicar`. Agendar prevista é GERENTE+. Validado no servidor. |
| 5 | Vacinas têm validade? Se sim, deve gerar alerta de "vencida" (dose de reforço) além de "atrasada"? | **Sim** — `validade_dias` opcional com cálculo automático de `data_proximo_reforco` (editável manualmente). Alerta `VACINA_REFORCO_VENCIDA` separado (`BR-SAUDE-011` / `BR-ALERTA-017`). |

## 6. Critérios de aceite (gate G3)

- [ ] `cd backend && go test ./... -count=1` OK
- [ ] `cd frontend && npm run lint && npm run typecheck && npm run validate:tokens` OK
- [ ] `node scripts/validate-br-refs.mjs` OK (BR-SAUDE-007/008/009/010/011 e BR-ALERTA-016/017 existem no catálogo)
- [ ] Casos de teste da seção 4 existem e passam
- [ ] Comportamento validado no fluxo completo (manual): registrar prevista → aguardar 7 dias (ou mock) → alerta gerado → aplicar vacina → alerta resolvido
- [ ] `BR-SAUDE-007` a `BR-SAUDE-011` e `BR-ALERTA-016`/`BR-ALERTA-017` atualizadas para `implementado` com ponteiros ao código
- [ ] `memory-bank/activeContext.md` atualizado
- [ ] Status deste briefing → `implementado`

## 7. Notas adicionais

- **Convenção SIGLA**: usar `IBR_BVD` no ENUM (sem barra) para compatibilidade com PostgreSQL ENUM type.
- **Animal identificação na UI**: seguir padrão de `AnimalStatusSaudeBadge` — criar `VacinaStatusBadge` com cores: prevista (azul/info), aplicada (verde/success), atrasada (vermelho/error).
- **Invalidação TanStack Query**: após mutações em vacinas, invalidar `['vacinas', animalId]`, `['alertas', fazendaId]`, `['timeline', animalId]`.
- **PeriodicFilter na listagem**: seguir padrão de `AlertasListToolbar` e `ProducaoListToolbar` — default 30 dias para vacinas previstas.
- **Referência de padrão**: CRUD de `animal_saude` (BR-SAUDE-001) é o modelo mais próximo — seguir mesma estrutura de handler/service/repository/form.
- **Ref estendida aplicar**: 
  - Backend: criar `AnimalVacinaService.AplicarVacina` que faz `BEGIN → UPDATE data_aplicacao → maybeResolveVacinaVencida → COMMIT`
  - Vacina aplicar 
