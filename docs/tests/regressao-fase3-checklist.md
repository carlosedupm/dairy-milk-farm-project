# Checklist de regressão — Fase 3 (saúde, alertas, vacinas, hormônios)

Complementa [`regressao-ciclo-fase2.md`](./regressao-ciclo-fase2.md) para entregas BRF-001 a BRF-005. Executar após Tier 0 ou em paralelo com secções 3–4 de [`staging-validation-tier0.md`](./staging-validation-tier0.md).

## Saúde animal (BR-SAUDE-001–013)

| # | Cenário | Perfil | Esperado |
|---|---------|--------|----------|
| S1 | POST caso TRATAMENTO ATIVO | FUNCIONARIO | `status_saude` → EM_TRATAMENTO |
| S2 | PUT status CONCLUIDO | GERENTE+ | Sync SAUDAVEL; resolve TRATAMENTO_VENCIDO |
| S3 | PUT `status_saude` manual com caso ATIVO | GERENTE+ | 400 STATUS_SAUDE_DERIVADO |
| S4 | POST saúde com `data_inicio` futura | qualquer escrita | 400 TMP-001 |
| S5 | Timeline `tipo=saude` | consulta | Eventos na ficha |

## Alertas (BR-ALERTA-001–017)

| # | Cenário | Esperado |
|---|---------|----------|
| A1 | Geração diária admin | Sem duplicar ABERTO+EM_ANDAMENTO (BR-ALERTA-009) |
| A2 | FUNCIONARIO ABERTO → EM_ANDAMENTO | 200 |
| A3 | FUNCIONARIO → RESOLVIDO | 403 |
| A4 | Push CRÍTICA/ALTA | Notificação se subscription + fazenda ativa |
| A5 | Filtro período `/alertas` | BR-ALERTA-014 |

## Vacinas (BR-SAUDE-007–011)

| # | Cenário | Esperado |
|---|---------|----------|
| V1 | Prevista atrasada >7d | VACINA_VENCIDA |
| V2 | Reforço vencido | VACINA_REFORCO_VENCIDA |
| V3 | Aplicar | Auto-resolve + PREVENTIVO |

## Hormônios lactação (BR-HORM-001–011)

| # | Cenário | Esperado |
|---|---------|----------|
| H1 | Sem lactação ativa | 400 SEM_LACTACAO_ATIVA |
| H2 | Intervalo <14d entre doses | 400 HORMONIO_INTERVALO_MINIMO |
| H3 | Janela 70d pré-parto | 400 HORMONIO_JANELA_PRE_PARTO |
| H4 | Pendentes na gestão | Lista 1ª dose ou próxima ≤ hoje |

## Elegibilidade reprodutiva (BRF-004 / BR-CICLO-016–018)

| # | Cenário | Esperado |
|---|---------|----------|
| E1 | Cobertura em BEZERRA | 400 INT-008 |
| E2 | NOVILHA <12m em cio | 400 INT-008 |
| E3 | `para-cio` na UI | Só elegíveis |

---

**Registo de execução**

| Data | Ambiente | Executor | Notas |
|------|----------|----------|-------|
| | | | |

**Última atualização**: 2026-06-14
