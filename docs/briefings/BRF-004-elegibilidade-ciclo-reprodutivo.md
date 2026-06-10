# Briefing BRF-004 — Elegibilidade reprodutiva e consistência do ciclo

> Fluxo, papéis e gates: [`docs/briefings/README.md`](./README.md). O briefing é uma **ordem de serviço**: referencia regras por ID, não as copia.

## Metadados

| Campo | Valor |
|-------|-------|
| ID | `BRF-004` |
| Data | 2026-06-09 |
| Analista | Cursor (Analista Funcional) |
| Status | implementado |
| Aprovado por (G1) | Desenvolvedor (decisões registradas na seção 5, 2026-06-09) |
| PR vinculado (G2) | — |

## 1. Objetivo

O sistema permite hoje registar **cio** e **cobertura** em fêmeas recém-nascidas (categoria `BEZERRA`), porque a validação exige apenas sexo feminino e rebanho activo. Exemplo reportado: após um parto que gera a cria, o operador consegue registar cio e cobertura na bezerra — impossível no ciclo de vida real.

Este trabalho reforça a **consistência do ciclo**: bloqueio na escrita por categoria e idade, listagens elegíveis alinhadas (incl. novo `para-cio`), e detecção de dados legados via conformidade **INT-008**.

## 2. Regras de negócio (fonte de verdade)

| ID | Módulo | Estado actual | O que muda |
|----|--------|---------------|------------|
| `BR-CICLO-016` | [`ciclo-rebanho.md`](../business/ciclo-rebanho.md) | implementado | Elegibilidade por categoria: BEZERRA/BEZERRO proibidos em marcos reprodutivos/lactação |
| `BR-CICLO-017` | [`ciclo-rebanho.md`](../business/ciclo-rebanho.md) | implementado | Idade mínima 12 meses para NOVILHA em marcos reprodutivos |
| `BR-CICLO-018` | [`ciclo-rebanho.md`](../business/ciclo-rebanho.md) | implementado | Extensão BR-CICLO-015: `para-cio` + filtros categoria/idade nas listagens |
| `BR-AUDIT-011` | [`auditoria.md`](../business/auditoria.md) | implementado | Conformidade INT-008 (legado) |
| `BR-CIOS-005` | [`cios.md`](../business/cios.md) | implementado | Cio sujeito a BR-CICLO-016/017 |
| `BR-COBERTURAS-007` | [`coberturas.md`](../business/coberturas.md) | implementado | Cobertura sujeita a BR-CICLO-016/017 |

**Invariantes e validações aplicáveis**:

- `INT-008` (BR-AUDIT-011): animal imaturo para marco reprodutivo ou lactação indevida — bloqueio na escrita + painel conformidade para legado.
- `TMP-001` / `TMP-002`: datas dos eventos (já aplicável).
- `INT-002`: produção exige lactação (reforço de categoria em bezerra).
- `BR-CICLO-015`: listagens `para-*` (estender com BR-CICLO-018).

**Matriz resumida** (detalhe em BR-CICLO-016/017):

| Marco | BEZERRA/BEZERRO | NOVILHA &lt;12m | NOVILHA ≥12m / MATRIZ |
|-------|-----------------|-----------------|----------------------|
| Cio, cobertura, toque, parto (matriz) | bloqueado | bloqueado | permitido |
| Secagem, produção | bloqueado | se lactação activa (INT-002) | se lactação activa |

**Perfis autorizados**: sem alteração RBAC; bloqueio no servidor para qualquer escrita permitida (JWT, M2M, assistente).

## 3. Escopo da implementação

### Backend

- **Helper central**: `ValidateElegibilidadeReprodutiva(animal, dataEvento)` — novo em `ciclo_integridade.go` ou `ciclo_elegibilidade.go`:
  - Categoria `BEZERRA` ou `BEZERRO` → erro `INT-008`.
  - Categoria `NOVILHA`: exige `data_nascimento`; data do evento ≥ nascimento + 12 meses civis → senão `INT-008`.
  - Categoria `MATRIZ`: permitido (sem idade mínima).
  - Categoria nula/vazia ou `TOURO`/`BOI`: bloqueado para marcos de matriz (`INT-008`).
- **Services** (Create/Update): `CioService`, `CoberturaService`, `DiagnosticoGestacaoService` (toque), `PartoService`, `SecagemService`, `ProducaoService` (reforço categoria).
- **Repository**:
  - Novo `ListParaCioByFazendaID` — fêmeas elegíveis (NOVILHA ≥12m ou MATRIZ, no rebanho).
  - Actualizar `ListParaCoberturaByFazendaID`, `ListParaToqueByFazendaID`, `ListParaPartoByFazendaID` com mesmo filtro de elegibilidade + condições existentes.
  - SQL partilhado recomendado: fragmento `sqlElegivelReproducao` (categoria + idade).
- **Endpoints**: `GET /api/v1/fazendas/:id/animais/para-cio` — handler `GetParaCioByFazendaID`; registo em `main.go`; whitelist `funcionarioFazendaAnimaisPath` em `perfil_access.go`.
- **M2M**: `POST /integracoes/coberturas` (+ lote) e toques — mesma validação nos services.
- **Conformidade**: `ConformidadeService` — query **INT-008** (cio/cobertura/toque/parto/secagem/produção em animal BEZERRA/BEZERRO ou NOVILHA &lt;12m); snapshot em geração de alertas `NAO_CONFORMIDADE` (BR-ALERTA-008).
- **Migration**: nenhuma.
- **Códigos de erro**: `INT-008` em `details.conformidade`; mensagem pt-BR orientativa (ex.: «Bezerra/bezerro não elegível para reprodução»; «Novilha com menos de 12 meses»).

### Frontend

- **`CioFormFields.tsx`**: `cicloContext="cio"` no `AnimalSelect` (remover dependência só de `femeasOnly` para listagem).
- **`animais.ts`**: tipo `CicloContext` incluir `'cio'`; `listParaCioByFazenda`; entrada em `CICLO_CONTEXT_FETCHERS` e `CICLO_EMPTY_MESSAGES`.
- **`useAnimaisCicloContext.ts`**: suportar contexto `cio`.
- Mensagens empty state orientativas (ex.: «Nenhuma fêmea elegível — animal deve ser novilha com 12+ meses ou matriz»).

### O que NÃO mexer

- Propagação de `status_reprodutivo` (BR-CICLO-002).
- Validações TMP-* e INT-001–007 existentes (excepto adicionar INT-008 à matriz).
- Geração automática de lactação no parto da matriz (BR-PARTOS-002).
- Reclassificação bezerra → matriz no 1.º parto (BR-PARTOS-004) — aplica-se à **matriz**, não à cria.

## 4. Casos de teste exigidos

- [x] Bezerra recém-nascida (pós-parto): `POST /cios` → 400, `conformidade` = `INT-008`.
- [x] Novilha com 11 meses: `POST /coberturas` → 400 `INT-008`.
- [x] Novilha com 13 meses + cio registado: `POST /coberturas` → 200 (regressão).
- [x] Matriz: `POST` cio/cobertura → 200 (regressão).
- [x] Animal categoria NULL: `POST /cios` → 400 `INT-008`.
- [x] `GET .../animais/para-cio` não inclui BEZERRA; `para-cobertura` idem após filtros.
- [x] `CioForm`: lista só elegíveis (`cicloContext=cio`).
- [x] M2M `POST /integracoes/coberturas` em bezerra → 400 `INT-008`.
- [x] `GET .../auditoria/conformidade` inclui INT-008 para registo legado absurdo.
- [x] Bezerro macho: `POST /cios` → bloqueado (BR-CIOS-001, regressão sexo).

## 5. Perguntas em aberto (obrigatório)

| # | Pergunta | Resposta (desenvolvedor) |
|---|----------|--------------------------|
| 1 | Escopo: só bezerra ou auditoria completa? | **Auditoria completa** — categoria + idade + conformidade INT-008. |
| 2 | Formulário de cio: como filtrar lista? | **Novo** `GET .../animais/para-cio` + `cicloContext="cio"` no CioForm. |
| 3 | Idade mínima para NOVILHA? | **12 meses** civis desde `data_nascimento`. |
| 4 | Categoria vazia/nula no cadastro? | **Bloquear** marcos reprodutivos até categoria explícita `NOVILHA` ou `MATRIZ`. |

## 6. Critérios de aceite (gate G3)

- [x] `cd backend && go test ./... -count=1` OK (`ciclo_elegibilidade_test.go`)
- [x] `cd frontend && npm run typecheck` OK
- [x] `node scripts/validate-br-refs.mjs` OK
- [x] Casos de teste da secção 4 cobertos por testes unitários + validação manual recomendada
- [ ] Manual: bezerra pós-parto não aparece em cio/cobertura; tentativa API → INT-008
- [x] Regras BR-* → `implementado` com ponteiros ao código
- [x] `memory-bank/activeContext.md` actualizado
- [x] Status deste briefing → `implementado`

## 7. Notas adicionais

- **Dados legados**: registos absurdos pré-implementação permanecem no banco; INT-008 no painel conformidade; escrita bloqueada de imediato.
- **Constante idade**: `MesesMinimosNovilhaReproducao = 12` em `ciclo_elegibilidade.go`; mensagens UI alinhadas.
- **Postman**: request `List Animals for Cio` em [`docs/postman/`](../../docs/postman/).
