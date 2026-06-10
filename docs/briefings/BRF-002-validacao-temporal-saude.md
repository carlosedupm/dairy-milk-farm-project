# Briefing BRF-002 — Validação temporal em casos de saúde

> Fluxo, papéis e gates: [`docs/briefings/README.md`](./README.md). O briefing é uma **ordem de serviço**: referencia regras por ID, não as copia.

## Metadados

| Campo | Valor |
|-------|-------|
| ID | `BRF-002` |
| Data | 2026-06-09 |
| Analista | Cursor (Analista Funcional) |
| Status | implementado |
| Aprovado por (G1) | Desenvolvedor (decisões registradas na seção 5, 2026-06-09) |
| Implementado (G3) | 2026-06-09 — `validateAnimalSaudeTemporal`, frontend `saude-date-limits.ts`, vitest |
| PR vinculado (G2) | — |

## 1. Objetivo

O operador regista casos clínicos na ficha do animal (`animal_saude`) com **data de início** e, opcionalmente, **data de fim** (alta prevista). Hoje a UI limita parcialmente datas futuras, mas o **servidor não aplica** as validações temporais do catálogo (`TMP-001`, `TMP-002`) — permitindo gravação inválida via API, M2M ou assistente. Este trabalho alinha casos de saúde ao resto do ciclo, com exceção acordada: **`data_fim` pode ser futura** (fim de tratamento agendado).

## 2. Regras de negócio (fonte de verdade)

Regras em `docs/business/` que este trabalho implementa ou altera. Regras novas devem já existir no catálogo com estado `planejado` antes do gate G1.

| ID | Módulo | Estado atual | O que muda |
|----|--------|--------------|------------|
| `BR-SAUDE-012` | [`saude-animal.md`](../business/saude-animal.md) | planejado | Criação: validação temporal de `data_inicio` e `data_fim` em casos clínicos |
| `BR-CICLO-012` | [`ciclo-rebanho.md`](../business/ciclo-rebanho.md) | implementado | Alteração de escopo: incluir `animal_saude.data_inicio`; exceção explícita — `data_fim` **não** sujeita a TMP-001 |
| `BR-CICLO-013` | [`ciclo-rebanho.md`](../business/ciclo-rebanho.md) | implementado | Alteração de escopo: incluir `animal_saude.data_inicio` e `data_fim` (quando preenchida) |

**Invariantes e validações aplicáveis** (citar apenas IDs):

- `TMP-001` (BR-CICLO-012): `data_inicio` do caso **não pode ser futura**.
- `TMP-002` (BR-CICLO-013): `data_inicio` e `data_fim` (se informada) **≥ `data_entrada`** e **≥ `data_nascimento`** quando preenchidos.
- `BR-SAUDE-002`: `data_fim` ≥ `data_inicio` (já implementado — manter).
- `BR-SAUDE-003`: animal no rebanho (já implementado — manter).
- **Exceção G1 #2**: `data_fim` **pode ser futura** — não aplicar TMP-001 a `data_fim`.

**Perfis autorizados** (conforme [`acessos-perfil.md`](../business/acessos-perfil.md)):

- Sem alteração de RBAC — **BR-ACESSO-017** permanece; validação temporal aplica-se a qualquer escrita permitida (JWT, M2M `saude:write`, assistente `registrar_saude`).

## 3. Escopo da implementação

### Backend

- **Endpoints** (comportamento alterado, rotas inalteradas):
  - `POST /api/v1/animais/:id/saude`
  - `PUT /api/v1/animais/:id/saude/:saudeId`
  - `POST /api/v1/integracoes/saude` (passa pelo mesmo `AnimalSaudeService.Create`)

- **Camadas tocadas**:
  - Service: `backend/internal/service/animal_saude_service.go` — nova função `validateAnimalSaudeTemporal(animal, in)` chamada em `Create`/`Update` após `ensureAnimalAtivo`; reutilizar `ValidateDataNaoFutura` e `ValidateEventoAposReferenciaAnimal` de `ciclo_integridade_temporal.go`.
  - Handler: sem alteração estrutural (erros de integridade já mapeados pelo padrão existente — verificar `response.ErrorValidation` + `details.conformidade`).
  - Testes: `backend/internal/service/animal_saude_service_test.go`.

- **Migration/constraint**: nenhuma (validação no service).

- **Códigos de erro**:
  - Resposta 400 com `details.conformidade` = `TMP-001` ou `TMP-002` (padrão `ciclo_integridade_temporal.go` / BR-AUDIT-010).
  - Manter `ErrAnimalSaudeDataFimInvalida` quando `data_fim < data_inicio` (BR-SAUDE-002).

- **Exclusão explícita**: casos criados automaticamente por vacina (`vacina_id` preenchido — BR-SAUDE-010) **não** revalidar temporalmente no Update se datas vieram do fluxo de vacina já validado; Create via vacina continua validado em `animal_vacina_service.go`.

### Frontend

- **Páginas/rotas**:
  - `/animais/:id/saude/novo`
  - `/animais/:id/saude/editar/:saudeId`

- **Componentes / lib**:
  - Novo: `frontend/src/lib/saude-date-limits.ts` — `minDateFromAnimal(animal)` (max de `data_entrada` / `data_nascimento`); constantes `SAUDE_CONFORMIDADE = { naoFuturo: 'TMP-001', aposEntrada: 'TMP-002' }`.
  - Alterar: `frontend/src/components/animais/AnimalSaudeFormFields.tsx` — `minDate` do animal em ambos DatePickers; **`maxDate` só em `data_inicio`**; **remover `maxDate` de `data_fim`** (decisão G1 #2).
  - Alterar: `frontend/src/lib/form-validation.ts` — `validateAnimalSaudeForm`: TMP-001 em `data_inicio`; TMP-002 vs. `minDate` do animal; permitir `data_fim` futura se ≥ `data_inicio`.
  - Alterar: `frontend/src/components/animais/AnimalSaudeForm.tsx` — carregar animal (contexto ou prop) para passar limites ao form; hint de conformidade opcional (`GestaoDateMinHint` ou equivalente).

- (Checklist de UI: seguir `.cursor/rules/frontend-ui-patterns.mdc` — não repetir aqui)

### O que NÃO mexer

- Vacinas (`animal_vacina_service.go`, tab Vacinas, BRF-001).
- Alertas / `AlertaGeracaoService` / geração automática.
- RBAC (`perfil_access.go`, `appAccess.ts`) — BR-ACESSO-017 inalterado.
- Sync `status_saude` (BR-SAUDE-004).
- Migrations existentes.
- Backlog opcional «bloqueio edição manual de `status_saude`» — fora deste briefing.

## 4. Casos de teste exigidos

O implementador deve criar/apontar testes para cada caso. Regra sem teste correspondente não passa no gate G3.

- [x] **Caminho feliz**: POST caso ATIVO com `data_inicio` = hoje, sem `data_fim` → 200.
- [x] **Caminho feliz**: POST com `data_fim` **futura** (ex.: +7 dias) e `data_inicio` = hoje → 200 (decisão G1 #2).
- [x] **Borda TMP-001**: POST com `data_inicio` futura → 400, `conformidade` = `TMP-001`.
- [x] **Borda TMP-002**: POST com `data_inicio` anterior à `data_entrada` do animal → 400, `conformidade` = `TMP-002`.
- [x] **Borda TMP-002**: POST com `data_fim` anterior à `data_entrada` (mesmo que futura em relação a hoje) → 400, `conformidade` = `TMP-002`.
- [x] **Borda BR-SAUDE-002**: `data_fim` < `data_inicio` → 400 (regressão).
- [x] **Borda BR-SAUDE-003**: animal baixado → 400 `ANIMAL_FORA_REBANHO` (regressão).
- [x] **M2M**: `POST /api/v1/integracoes/saude` com `data_inicio` futura → 400 TMP-001.
- [x] **RBAC**: FUNCIONARIO PUT/DELETE → 403; POST válido → 200 (regressão BR-ACESSO-017).
- [x] **UI**: `validateAnimalSaudeForm` bloqueia `data_inicio` futura; aceita `data_fim` futura; mensagens pt-BR com referência TMP-*.

## 5. Perguntas em aberto (obrigatório)

| # | Pergunta | Resposta (desenvolvedor) |
|---|----------|--------------------------|
| 1 | Criar **BR-SAUDE-012** novo ou apenas estender **BR-SAUDE-002**? | **Criar BR-SAUDE-012** (regra dedicada). |
| 2 | `data_fim` futura: bloquear (TMP-001) ou permitir agendamento de alta? | **Permitir** — `data_fim` pode ser futura; TMP-001 aplica-se **apenas** a `data_inicio`. |
| 3 | Atualizar enunciado de **BR-CICLO-012/013** no catálogo ou só referenciar saúde via BR-SAUDE-012? | **Atualizar BR-CICLO-012/013** com exceção explícita para `animal_saude.data_fim`. |

## 6. Critérios de aceite (gate G3)

- [x] `cd backend && go test ./... -count=1` OK
- [x] `cd frontend && npm run lint && npm run typecheck && npm run validate:tokens` OK
- [x] `node scripts/validate-br-refs.mjs` OK
- [x] Casos de teste da seção 4 existem e passam
- [x] Comportamento validado no fluxo completo (manual): criar tratamento ATIVO com fim previsto futuro; tentar início futuro → erro
- [x] `BR-SAUDE-012` e alterações em `BR-CICLO-012`/`013` atualizadas para `implementado` com ponteiros ao código
- [x] `memory-bank/activeContext.md` atualizado
- [x] Status deste briefing → `implementado`

## 7. Notas adicionais

- **Lacuna atual**: `validateAnimalSaudeInput` só valida enum e `data_fim >= data_inicio`; UI já usa `maxDate={todayISODate()}` em **ambos** os pickers — implementação deve **remover** max de `data_fim` conforme G1 #2.
- **Padrão de referência**: vacinas em `validateVacinaDataAplicacao` (`animal_vacina_service.go`) — reutilizar helpers de `ciclo_integridade_temporal.go`.
- **Auditoria**: atualizar tabela TMP-* em [`auditoria.md`](../business/auditoria.md) com nota da exceção de `data_fim` em saúde.
