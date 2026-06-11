# Briefing BRF-005 — Hormônios de lactação (Lactropin, Bust, …)

> Fluxo, papéis e gates: [`docs/briefings/README.md`](./README.md). O briefing é uma **ordem de serviço**: referencia regras por ID, não as copia.

## Metadados

| Campo | Valor |
|-------|-------|
| ID | `BRF-005` |
| Data | 2026-06-09 |
| Analista | Cursor (Analista Funcional) |
| Status | implementado |
| Aprovado por (G1) | Desenvolvedor (decisões registradas na seção 5, 2026-06-09) |
| PR vinculado (G2) | — |
| Implementado (G3) | 2026-06-10 — migration 37, backend + frontend + testes; catálogo BR-HORM-001–011 e BR-ACESSO-025 atualizados |

## 1. Objetivo

O operador da fazenda precisa **registrar cada aplicação de hormônio de lactação** (hoje **Lactropin**, mas também produtos como **Bust**) em vacas **lactando e prenhes**, seguindo o protocolo veterinário: a **1ª dose** só depois do **1º toque confirmado como prenha** registrado **após o início da lactação atual**; repetição **a cada 14 dias** até **faltarem 70 dias para o parto previsto** ou **encerramento manual** por **baixa de produção**. O sistema **agenda a próxima dose na ficha**, oferece **listagem de vacas que precisam de aplicação hoje** e **não** gera alertas na central `/alertas`.

## 2. Regras de negócio (fonte de verdade)

Regras em `docs/business/` que este trabalho implementa ou altera.

| ID | Módulo | Estado atual | O que muda |
|----|--------|--------------|------------|
| `BR-HORM-001` | [`hormonios-lactacao.md`](../business/hormonios-lactacao.md) | implementado | CRUD aplicações + protocolo |
| `BR-HORM-002` | [`hormonios-lactacao.md`](../business/hormonios-lactacao.md) | implementado | Catálogo produtos LACTROPIN/BUST/OUTRO |
| `BR-HORM-003` | [`hormonios-lactacao.md`](../business/hormonios-lactacao.md) | implementado | Elegibilidade rebanho + lactação ativa |
| `BR-HORM-004` | [`hormonios-lactacao.md`](../business/hormonios-lactacao.md) | implementado | 1ª dose após 1º toque prenhe pós-início lactação |
| `BR-HORM-005` | [`hormonios-lactacao.md`](../business/hormonios-lactacao.md) | implementado | Gestação CONFIRMADA + vínculos |
| `BR-HORM-006` | [`hormonios-lactacao.md`](../business/hormonios-lactacao.md) | implementado | Intervalo mínimo 14 dias |
| `BR-HORM-007` | [`hormonios-lactacao.md`](../business/hormonios-lactacao.md) | implementado | Teto 70 dias antes do parto previsto |
| `BR-HORM-008` | [`hormonios-lactacao.md`](../business/hormonios-lactacao.md) | implementado | Protocolo ATIVO/ENCERRADO + secagem |
| `BR-HORM-009` | [`hormonios-lactacao.md`](../business/hormonios-lactacao.md) | implementado | Listagem pendentes (sem alerta) |
| `BR-HORM-010` | [`hormonios-lactacao.md`](../business/hormonios-lactacao.md) | implementado | Timeline tipo=hormonio_lactacao |
| `BR-HORM-011` | [`hormonios-lactacao.md`](../business/hormonios-lactacao.md) | implementado | Caso PREVENTIVO CONCLUIDO (BR-SAUDE-010) |
| `BR-ACESSO-025` | [`acessos-perfil.md`](../business/acessos-perfil.md) | implementado | RBAC hormônios lactação |

**Invariantes e validações aplicáveis**:

- `TMP-001` (BR-CICLO-012): `data_aplicacao` não futura.
- `TMP-002` (BR-CICLO-013): `data_aplicacao` ≥ entrada/nascimento do animal.
- `TMP-003` (BR-CICLO-014): `data_aplicacao` ≥ data do 1º toque prenhe da lactação (BR-HORM-004).
- `BR-SAUDE-003`: só animal no rebanho.
- `BR-LACTACAO-003` / `BR-SECAGENS-002`: secagem encerra lactação e protocolo.
- `INT-007` (BR-AUDIT-007): animal baixado fora do escopo operacional.

**Perfis autorizados** (conforme [`acessos-perfil.md`](../business/acessos-perfil.md)):

- ADMIN, DEVELOPER, GESTAO, PROPRIETARIO, GERENTE: CRUD aplicações + `PATCH .../protocolo/encerrar`.
- FUNCIONARIO: `GET` (listagem/detalhe/protocolo/pendentes) + `POST` (registrar aplicação); `PUT`/`DELETE`/`PATCH encerrar` → 403.
- USER: sem acesso (403).

## 3. Escopo da implementação

### Backend

- **Endpoints**:
  - `GET|POST /api/v1/animais/:id/hormonios-lactacao` — listar / registrar aplicação.
  - `GET|PUT|DELETE /api/v1/animais/:id/hormonios-lactacao/:aplicacaoId` — detalhe / editar / excluir (GERENTE+).
  - `GET /api/v1/animais/:id/hormonios-lactacao/protocolo` — protocolo da lactação ativa ou último.
  - `PATCH /api/v1/animais/:id/hormonios-lactacao/protocolo/encerrar` — encerrar (GERENTE+); body: `motivo_encerramento` (`BAIXA_PRODUCAO`|`OUTRO`), `observacoes` opcional.
  - `GET /api/v1/fazendas/:id/hormonios-lactacao/pendentes` — vacas elegíveis com dose pendente ou vencida.
  - Estender `GET /api/v1/animais/:id/timeline` com `tipo=hormonio_lactacao`.

- **Camadas tocadas**:
  - Handler: `backend/internal/handlers/animal_hormonio_lactacao_handler.go` (novo).
  - Service: `backend/internal/service/animal_hormonio_lactacao_service.go` (novo) — elegibilidade, protocolo, cálculo `data_proxima_aplicacao`, caso PREVENTIVO.
  - Repository: `backend/internal/repository/animal_hormonio_lactacao_repository.go` (novo); consultas em `DiagnosticoGestacaoRepository` (1º POSITIVO pós-`lactacao.data_inicio`); `GestacaoRepository.GetAtivaConfirmadaByAnimalID`; `AnimalRepository.ListEmLactacaoByFazendaID`.
  - Model: `backend/internal/models/animal_hormonio_lactacao.go` (novo).
  - Timeline: `backend/internal/repository/timeline_repository.go` (UNION aplicações).
  - Secagem: `backend/internal/service/secagem_service.go` — encerrar protocolo ATIVO da lactação (`motivo_encerramento = SECAGEM`) ou lazy-check no service de hormônio.
  - Routes: `backend/cmd/api/main.go`.
  - Auth: `backend/internal/auth/perfil_access.go` (BR-ACESSO-025).

- **Migration/constraint** — `37_add_hormonios_lactacao.up.sql`:
  - Tabela `animal_hormonio_lactacao_protocolos`:
    - `produto` CHECK (`LACTROPIN`, `BUST`, `OUTRO`).
    - `status` CHECK (`ATIVO`, `ENCERRADO`).
    - `motivo_encerramento` CHECK (`BAIXA_PRODUCAO`, `PRE_PARTO`, `SECAGEM`, `OUTRO`) NULL iff ENCERRADO.
    - FKs: `animal_id`, `fazenda_id`, `lactacao_id`, `gestacao_id`, `toque_referencia_id` → `diagnosticos_gestacao(id)`.
    - Índice único parcial: 1 protocolo `ATIVO` por `lactacao_id`.
  - Tabela `animal_hormonio_lactacao_aplicacoes`:
    - `protocolo_id`, `produto`, `data_aplicacao`, `data_proxima_aplicacao`, `numero_dose`, `lote`, `observacoes`.
  - Coluna `animal_saude.hormonio_lactacao_aplicacao_id` BIGINT NULL FK ON DELETE SET NULL.
  - RLS habilitado (padrão migrations 19/30/36).
  - Validações temporais TMP-* no service (CHECK frágil para subquery).

- **Códigos de erro**:
  - `HORMONIO_NAO_ENCONTRADO` 404.
  - `HORMONIO_SEM_TOQUE_PRENHE` 400.
  - `SEM_GESTACAO_ATIVA` 400.
  - `SEM_LACTACAO_ATIVA` 400.
  - `HORMONIO_INTERVALO_MINIMO` 400.
  - `HORMONIO_JANELA_PRE_PARTO` 400.
  - `PROTOCOLO_ENCERRADO` 400.
  - `PRODUTO_INVALIDO` 400.
  - `ANIMAL_FORA_REBANHO` 400 (BR-SAUDE-003).

### Frontend

- **Páginas/rotas**:
  - Tab **Hormônio lactação** na ficha (`/animais/:id?tab=hormonio-lactacao`) — protocolo, próxima dose, histórico, encerrar (GERENTE+).
  - Formulário: `/animais/:id/hormonios-lactacao/novo`, edição `/animais/:id/hormonios-lactacao/:aplicacaoId/editar`.
  - Pendentes: `/gestao/hormonios-lactacao/pendentes` + card/link no hub `/gestao` (decisão G1 #1).
  - Timeline: chip **Hormônio** na tab Histórico.

- **Componentes**:
  - `AnimalHormonioLactacaoForm.tsx` + `AnimalHormonioLactacaoFormFields.tsx`.
  - `AnimalHormonioLactacaoList.tsx` + tabela desktop.
  - `HormonioLactacaoProtocoloCard.tsx` — status, produto referência, parto previsto, dias até teto 70d.
  - `HormonioLactacaoEncerrarDialog.tsx` — motivo baixa produção/outro.
  - `HormoniosLactacaoPendentesPage.tsx` — listagem fazenda.
  - `AnimalFichaTabHormonioLactacao.tsx`.
  - Extensão: `AnimalTimelineSection.tsx`, `appAccess.ts` (`canCriarHormonioLactacao`, `canEditarHormonioLactacao`, `canEncerrarProtocoloHormonio`, …).

- (Checklist de UI: seguir `.cursor/rules/frontend-ui-patterns.mdc` — não repetir aqui)

### O que NÃO mexer

- `alerta_geracao_service.go`, tipos/CHECK de `alertas`.
- Módulo `animal_vacinas` / tab Vacinas.
- `restricoes_leite`, detecção automática de queda de produção.
- Migrations existentes (1–36).

## 4. Casos de teste exigidos

- [x] **Elegibilidade toque**: vaca lactando sem toque positivo após início da lactação → POST → 400 `HORMONIO_SEM_TOQUE_PRENHE`.
- [x] **TMP-003**: toque positivo dia 100 da lactação; POST aplicação dia 50 → 400 com `TMP-003`.
- [x] **Caminho feliz**: lactação ativa; toque prenhe dia 85; gestação com parto previsto; POST dia 90 `LACTROPIN` → protocolo ATIVO, `numero_dose=1`, `data_proxima=104`.
- [x] **2ª dose**: POST dia 104 → `numero_dose=2`; POST dose 3 com `BUST` permitido (decisão G1 #2).
- [x] **Teto 70d**: parto previsto 2026-12-01 → última aplicação permitida 2026-09-22; POST 2026-09-23 → 400 `HORMONIO_JANELA_PRE_PARTO`; dose em 2026-09-22 → `data_proxima=NULL`.
- [x] **Intervalo**: 2ª dose 7 dias após 1ª → 400 `HORMONIO_INTERVALO_MINIMO`.
- [x] **Encerramento baixa produção**: GERENTE+ PATCH encerrar → ENCERRADO; POST nova dose → 400 `PROTOCOLO_ENCERRADO`.
- [x] **Secagem**: após secagem, protocolo ENCERRADO/SECAGEM; POST → 400.
- [x] **Pendentes**: elegível sem dose aparece; `data_proxima <= hoje` aparece; janela 70d/parto não aparece; encerrado não aparece.
- [x] **RBAC FUNCIONARIO**: POST OK; PUT/DELETE/PATCH encerrar → 403.
- [x] **RBAC USER**: qualquer rota → 403.
- [x] **Timeline**: `tipo=hormonio_lactacao` retorna aplicações.
- [x] **BR-HORM-011**: POST cria `animal_saude` PREVENTIVO CONCLUIDO com FK.
- [x] **Migration down**: rollback 37 sem erro.

## 5. Perguntas em aberto (obrigatório)

| # | Pergunta | Resposta (desenvolvedor) |
|---|----------|--------------------------|
| 1 | Listagem pendentes só em **Gestão** ou também painel na **home**? | **Página em Gestão** (`/gestao/hormonios-lactacao/pendentes`) + link no hub `/gestao` — sem painel na home nesta entrega. |
| 2 | **Trocar produto** no meio do protocolo (Lactropin → Bust)? | **Permitir por dose**; protocolo guarda `produto` da 1ª dose como referência informativa (`BR-HORM-002`). |
| 3 | Início do protocolo e janela temporal (revisão veterinária 2026-06-09)? | **1ª dose** após 1º toque prenhe pós-início da lactação; repetir 14/14d até **70 dias antes do parto** ou encerramento manual **baixa produção** (GERENTE+). |
| 4 | Alertas automáticos? | **Não** — listagem de pendentes substitui alertas (`BR-HORM-009`). |

## 6. Critérios de aceite (gate G3)

- [x] `cd backend && go test ./... -count=1` OK
- [x] `cd frontend && npm run lint && npm run typecheck && npm run validate:tokens` OK
- [x] `node scripts/validate-br-refs.mjs` OK
- [x] Casos de teste da seção 4 existem e passam
- [x] Comportamento validado manualmente: toque → 1ª dose → 2ª dose 14d → encerrar por baixa produção; teto 70d antes do parto
- [x] `BR-HORM-001` a `BR-HORM-011` e `BR-ACESSO-025` atualizadas para `implementado` com ponteiros ao código
- [x] `memory-bank/activeContext.md` atualizado
- [x] Status deste briefing → `implementado`

## 7. Notas adicionais

- **Domínio**: Lactropin/Bust são rBST — conformidade sanitária é responsabilidade da fazenda; o sistema operacionaliza o protocolo veterinário descrito.
- **Referência de implementação**: espelhar estrutura de `AnimalVacinaService` (BRF-001) sem fluxo prevista/aplicar; elegibilidade cruzada com `DiagnosticoGestacaoService` e `GestacaoRepository`.
- **Cálculo parto previsto**: `data_prevista_parto = cobertura.data + 283 dias` (`diasGestacaoBovino` em `diagnostico_gestacao_service.go`).
- **Invalidação TanStack Query**: após mutações, invalidar `['hormonios-lactacao', animalId]`, `['hormonios-lactacao-pendentes', fazendaId]`, `['timeline', animalId]`, `['animal-saude', animalId]`.
- **Assistente Live**: fora do escopo deste briefing; extensão futura (`registrar_hormonio_lactacao`) se necessário.
