# Briefing BRF-003 — status_saude derivado (bloqueio manual)

> Fluxo, papéis e gates: [`docs/briefings/README.md`](./README.md). O briefing é uma **ordem de serviço**: referencia regras por ID, não as copia.

## Metadados

| Campo | Valor |
|-------|-------|
| ID | `BRF-003` |
| Data | 2026-06-09 |
| Analista | Cursor (Analista Funcional) |
| Status | implementado |
| Aprovado por (G1) | Desenvolvedor (decisões registradas na seção 5, 2026-06-09) |
| PR vinculado (G2) | — |

## 1. Objetivo

O campo `animais.status_saude` é **recalculado automaticamente** a partir dos casos clínicos ATIVOS (BR-SAUDE-004), mas hoje ainda pode ser **alterado manualmente** no cadastro/edição do animal e via assistente — gerando divergência visível em badges, filtros e busca até o próximo CRUD na tab Saúde.

Este trabalho torna o status **derivado** quando existem casos ATIVOS (bloqueio no servidor), remove a escolha manual no cadastro genérico (default `SAUDAVEL`) e permite marcar **cria não saudável** no fluxo de parto para nascer com `DOENTE` ou `EM_TRATAMENTO`.

## 2. Regras de negócio (fonte de verdade)

| ID | Módulo | Estado atual | O que muda |
|----|--------|--------------|------------|
| `BR-SAUDE-013` | [`saude-animal.md`](../business/saude-animal.md) | implementado | Criação: bloqueio de edição manual com casos ATIVOS; cadastro genérico sem picker |
| `BR-SAUDE-004` | [`saude-animal.md`](../business/saude-animal.md) | implementado | Alteração: nuance «cadastro manual» substituída por referência a BR-SAUDE-013 |
| `BR-PARTOS-008` | [`partos.md`](../business/partos.md) | implementado | Criação: flag «cria não saudável» no parto → `status_saude` inicial da bezerra/bezerro |

**Invariantes e validações aplicáveis**:

- `BR-SAUDE-004` — derivação `EM_TRATAMENTO` > `DOENTE` > `SAUDAVEL` a partir de casos `status=ATIVO`.
- `BR-SAUDE-003` / `BR-BAIXA-002` — animal no rebanho para edição.
- `BR-SAUDE-006` — badge de busca passa a refletir valor coerente (sem divergência manual).

**Perfis autorizados**:

- Bloqueio aplica-se a quem pode `PUT /api/v1/animais/:id` (GERENTE+, etc.) — sem mudança de RBAC.
- Parto com flag cria: quem pode `POST /api/v1/partos` (incl. FUNCIONARIO — BR-ACESSO-015).

## 3. Escopo da implementação

### Backend

- **`AnimalService.Update`**:
  - Injetar contagem/lista de casos ATIVOS (interface mínima sobre `AnimalSaudeRepository.ListAtivosByAnimalID` — padrão `gestacaoRepo`).
  - Se existir ≥1 caso ATIVO **e** `status_saude` no payload **diferir** do valor já persistido → **400** `STATUS_SAUDE_DERIVADO` (mensagem: concluir/cancelar casos na tab Saúde ou aguardar sync).
  - Se payload não altera `status_saude` (outros campos) → 200.
  - Opcional: se valor enviado == `deriveAnimalStatusSaudeFromCasosAtivos(ativos)` → 200 (formulário coerente).

- **`AnimalService.Create`** (cadastro genérico):
  - **Ignorar** `status_saude` do body; forçar `SAUDAVEL` (decisão G1 #2).
  - Validar enum se mantido por compatibilidade API — preferir strip + default.

- **`CriaService.insertCriaVivaComAnimalGeradoTx`** / modelo `Cria`:
  - Novo campo opcional `status_saude_inicial` ou boolean `cria_nao_saudavel` + enum quando true.
  - Default: `SAUDAVEL`. Se flag/parto indica não saudável → `DOENTE` ou `EM_TRATAMENTO` conforme G1 #4.
  - Persistir em `animals.status_saude` na criação da cria viva (única exceção ao default SAUDAVEL sem casos).

- **Assistente** (`editar_animal`, Live + legado): propagar `STATUS_SAUDE_DERIVADO`.
  - **`cadastrar_animal`**: não aceitar `status_saude` custom — default SAUDAVEL (alinhar prompt).

- **Códigos de erro**:
  - `STATUS_SAUDE_DERIVADO` 400 — alteração manual bloqueada com casos ATIVOS.

- **Migration**: nenhuma (campos transitórios no POST parto/cria ou coluna opcional em `crias` — ver nota sec. 7).

- **Testes**: `animal_service_test.go`, `cria_service_test.go` ou `parto_service_test.go`, regressão `animal_saude_service_test.go`.

### Frontend

- **`AnimalForm.tsx`**:
  - **Criar**: remover Select `status_saude` (animal nasce `SAUDAVEL`); hint opcional «Registe casos na tab Saúde».
  - **Editar**: se `GET .../saude` tem casos ATIVO → Select **disabled** + tooltip + link `/animais/:id?tab=saude` (decisão G1 #3); exibir `AnimalStatusSaudeBadge` com valor actual.

- **`PartoFormFields.tsx`** / `cria-constants.ts`:
  - Por cria **VIVA**: checkbox «Cria nasceu não saudável»; quando marcado, Select `DOENTE` | `EM_TRATAMENTO` (default `DOENTE`).
  - Enviar no payload de `crias[]` para `POST /partos`.

- **`PartoEditCriasPanel.tsx`**: mesma flag ao registrar cria tardia (paridade).

- Tratar 400 `STATUS_SAUDE_DERIVADO` no submit do animal.

### O que NÃO mexer

- Algoritmo `deriveAnimalStatusSaudeFromCasosAtivos` / sync pós CRUD saúde (BR-SAUDE-004).
- Validação temporal BRF-002 / vacinas.
- Alertas `TRATAMENTO_VENCIDO`.
- Auto-criação de caso clínico no parto (fora do escopo — só `status_saude` inicial).

## 4. Casos de teste exigidos

- [x] Animal **sem** casos ATIVOS: `PUT` altera `status_saude` → 200.
- [x] Animal com TRATAMENTO ATIVO: `PUT status_saude=SAUDAVEL` → 400 `STATUS_SAUDE_DERIVADO`.
- [x] Animal com casos ATIVOS: `PUT` só `raca` (status inalterado) → 200.
- [x] Concluir último caso ATIVO → `PUT status_saude` permitido.
- [x] `POST /animais` com `status_saude=DOENTE` no body → animal criado com `SAUDAVEL`.
- [x] `POST /partos` cria viva saudável → bezerra/bezerro `status_saude=SAUDAVEL`.
- [x] `POST /partos` cria viva com flag não saudável + `EM_TRATAMENTO` → animal gerado com `EM_TRATAMENTO`.
- [x] Assistente `editar_animal` + casos ATIVOS + `status_saude` → erro orientativo.
- [x] UI editar: select disabled com casos ATIVOS; cadastro sem campo status.
- [x] UI parto: checkbox + select visíveis só para cria VIVA.

## 5. Perguntas em aberto (obrigatório)

| # | Pergunta | Resposta (desenvolvedor) |
|---|----------|--------------------------|
| 1 | Com casos ATIVOS, bloqueio no PUT? | **400 `STATUS_SAUDE_DERIVADO`** se tentar alterar `status_saude`. |
| 2 | Cadastro genérico (`POST /animais`)? | **Sempre `SAUDAVEL`**; remover picker manual. |
| 3 | UI edição animal? | **Campo disabled + tooltip + link tab Saúde**. |
| 4 | Exceção parto / cria viva? | **Checkbox «cria não saudável»** no formulário de parto → `DOENTE` ou `EM_TRATAMENTO` no animal gerado. |
| 5 | Flag parto: só `DOENTE` ou escolher `DOENTE`/`EM_TRATAMENTO`? | **Select com ambos** quando checkbox marcado (default `DOENTE`). |

## 6. Critérios de aceite (gate G3)

- [x] `cd backend && go test ./... -count=1` OK
- [x] `cd frontend && npm run lint && npm run typecheck && npm run validate:tokens` OK
- [x] `node scripts/validate-br-refs.mjs` OK
- [x] Casos de teste da seção 4 existem e passam
- [x] Manual: animal com tratamento ATIVO → editar animal → status bloqueado; concluir tratamento → editar permitido
- [x] Manual: parto com cria doente → badge busca coerente
- [x] `BR-SAUDE-013`, `BR-PARTOS-008` → `implementado`; nuance BR-SAUDE-004 atualizada
- [x] `memory-bank/activeContext.md` atualizado
- [x] Status deste briefing → `implementado`

## 7. Notas adicionais

- **Persistência da flag parto**: preferir campo no payload `crias[]` sem migration (`status_saude_inicial` transitório aplicado só na criação do animal); se necessário auditoria, migration opcional em `crias` — decisão implementador, desde que OpenAPI/Postman documentados.
- **Cria gerada** ([`cria_service.go`](backend/internal/service/cria_service.go) `insertCriaVivaComAnimalGeradoTx`): `resolveStatusSaudeCriaViva` define `StatusSaude` (`SAUDAVEL` ou `DOENTE`/`EM_TRATAMENTO` via payload).
- **Assistente Live** já orienta usar `registrar_saude` em vez de `editar_animal` para tratamentos — reforçar no system prompt após bloqueio.
