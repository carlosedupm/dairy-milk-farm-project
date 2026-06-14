# Briefing BRF-006 — Alerta automático de hormônio de lactação pendente

> Fluxo, papéis e gates: [`docs/briefings/README.md`](./README.md).

## Metadados

| Campo | Valor |
|-------|-------|
| ID | `BRF-006` |
| Data | 2026-06-14 |
| Analista | Análise backlog CeialMilk |
| Status | rascunho |
| Aprovado por (G1) | — |
| PR vinculado (G2) | — |

## 1. Objetivo

Quando um animal elegível a hormônio de lactação tem **1ª dose pendente** ou **dose de manutenção com `data_proxima_aplicacao` vencida** (≤ hoje), o sistema deve gerar alerta automático **ALTA** com Web Push — alinhado a vacinas atrasadas (BR-ALERTA-016) e à listagem operacional existente em `/gestao/hormonios-lactacao/pendentes` (BR-HORM-009). Hoje a equipe só descobre pendências visitando a listagem manualmente.

## 2. Regras de negócio (fonte de verdade)

| ID | Módulo | Estado atual | O que muda |
|----|--------|--------------|------------|
| `BR-ALERTA-018` | [`alertas.md`](../business/alertas.md) | planejado | Nova regra de geração automática `HORMONIO_LACTACAO_PENDENTE` |
| `BR-HORM-012` | [`hormonios-lactacao.md`](../business/hormonios-lactacao.md) | planejado | Alerta na geração diária; auto-resolve ao registrar dose |
| `BR-HORM-009` | [`hormonios-lactacao.md`](../business/hormonios-lactacao.md) | implementado | Atualizar texto: passa a incluir alerta (não só listagem) |

**Invariantes aplicáveis:**

- `BR-HORM-003`–`007`: mesmos critérios de elegibilidade da listagem de pendentes.
- `BR-ALERTA-009`: deduplicação por tipo + animal.
- `BR-ALERTA-010`: auto-resolve ao `POST` nova aplicação ou ao cumprir intervalo.
- `INT-007` / rebanho ativo: animal baixado não gera alerta.

**Perfis:**

- Geração: sistema (`sistema@interno.ceialmilk`).
- FUNCIONARIO: visualiza; `ABERTO` → `EM_ANDAMENTO` (BR-ALERTA-007).
- GERENTE+: resolve/ignora.

## 3. Escopo da implementação

### Backend

- **Migration**: estender `CHECK` de `alertas.tipo` com `HORMONIO_LACTACAO_PENDENTE`.
- **AlertaGeracaoService**: regra 9 — reutilizar lógica de `ListPendentesByFazendaID` ou query equivalente filtrada por animal.
- **AnimalHormonioLactacaoService**: hook `afterCreate` → `ResolveOpenByAnimal` tipo `HORMONIO_LACTACAO_PENDENTE`.
- **models/alerta.go**: `SeveridadePadraoPorTipo` → ALTA + Web Push.

### Frontend

- Badge/listagem `/alertas` — tipo novo no filtro e `alertas-utils`.
- Link drill-down → `/gestao/hormonios-lactacao/pendentes` ou ficha `?tab=hormonio-lactacao`.

### O que NÃO mexer

- Intervalos BR-HORM-006/007; elegibilidade BR-HORM-004/005.
- Listagem pendentes (mantém como está).

## 4. Casos de teste exigidos

- [ ] Animal elegível sem protocolo na lactação → gera 1 alerta na geração diária.
- [ ] Protocolo ATIVO com `data_proxima_aplicacao` ≤ hoje → gera alerta.
- [ ] Animal fora da janela 70d pré-parto → não gera.
- [ ] Animal baixado → não gera.
- [ ] Dedup: segundo run não duplica ABERTO.
- [ ] POST aplicação → alerta RESOLVIDO.
- [ ] Teste unitário `alerta_geracao_service_test.go`.

## 5. Perguntas em aberto

| # | Pergunta | Resposta (desenvolvedor) |
|---|----------|--------------------------|
| 1 | Severidade MEDIA em vez de ALTA para reduzir ruído de push? | |
| 2 | Um alerta por animal ou um por protocolo/lactação? | Proposta: **um por animal** (BR-ALERTA-009) |

## 6. Critérios de aceite (gate G3)

- [ ] `go test ./...` + `validate-br-refs` OK
- [ ] Geração manual admin + cron sem duplicar
- [ ] BR-ALERTA-018 / BR-HORM-012 → `implementado`
- [ ] `memory-bank/activeContext.md` atualizado

## 7. Notas adicionais

Gap identificado na análise de backlog 2026-06-14: BR-HORM-009 documentava explicitamente «sem alerta»; BRF-006 corrige inconsistência operacional vs vacinas.

**Última atualização**: 2026-06-14
