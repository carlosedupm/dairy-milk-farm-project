# Checklist — Validação temporal do ciclo pecuário

Regressão manual após alterações em `ciclo_integridade_temporal.go`, services de ciclo ou pickers da UI.

**Referências:** `docs/business/ciclo-rebanho.md` (BR-CICLO-012–014), `docs/business/auditoria.md` (TMP-001–006), `docs/tests/regressao-ciclo-fase2.md`.

**Pré-requisitos:** backend em `localhost:8080`, frontend em dev, utilizador com gestão na fazenda de teste, pelo menos uma matriz com cobertura e lactação quando aplicável.

---

## 1. Datas futuras (TMP-001 / BR-CICLO-012)

| # | Ação | Resultado esperado |
|---|------|-------------------|
| 1.1 | Gestão → novo cio: tentar data/hora de amanhã (picker ou API) | Bloqueado na UI; POST devolve 400 com `details.conformidade`: `TMP-001` |
| 1.2 | Nova produção: `data_hora` futura | Idem |
| 1.3 | Registrar baixa: `data_saida` amanhã | Idem; texto de ajuda na UI menciona que não pode ser futura |
| 1.4 | Cadastro animal: `data_nascimento` ou `data_entrada` futura | Idem |

## 2. Piso do animal (TMP-002 / BR-CICLO-013)

| # | Ação | Resultado esperado |
|---|------|-------------------|
| 2.1 | Animal com `data_entrada` conhecida: cio com data anterior à entrada | 400 `TMP-002` |
| 2.2 | Cadastro: `data_nascimento` > `data_entrada` (ambas ≤ hoje) | 400 `TMP-002` |

## 3. Cronologia (TMP-003–006 / BR-CICLO-014)

| # | Ação | Resultado esperado |
|---|------|-------------------|
| 3.1 | Cobertura com `cio_id`: data da cobertura **antes** do cio vinculado | 400 `TMP-003` |
| 3.2 | Toque positivo com `cobertura_id`: data do toque **antes** da cobertura | 400 `TMP-003` |
| 3.3 | Parto com `gestacao_id`: data do parto **antes** da confirmação da gestação | 400 `TMP-004` |
| 3.4 | Secagem com lactação ativa: `data_secagem` **antes** do `data_inicio` da lactação | 400 `TMP-005` |
| 3.5 | Produção após secagem (lactação com `data_fim`): `data_hora` **depois** do fim da lactação | 400 `TMP-006` (ou INT-002 se sem lactação na data) |

## 4. UI — pickers

| # | Ação | Resultado esperado |
|---|------|-------------------|
| 4.1 | Calendário em formulário de evento (ex.: secagem novo) | Dias após hoje desativados |
| 4.2 | DateTimePicker em cio/cobertura com dia = hoje | Hora/minuto não permitem instante futuro |
| 4.3 | Filtro de listagem de coberturas (intervalo de datas) | **Sem** limite `maxDate=hoje` (pode escolher datas futuras no filtro) |

## 5. Legado baixa agendada

| # | Ação | Resultado esperado |
|---|------|-------------------|
| 5.1 | Se existir animal com `data_saida` futura (dado antigo) | Continua visível em «Com baixa» / conformidade até corrigido; **nova** baixa não permite data futura |

---

## API rápida (opcional)

```bash
# Exemplo: cio futuro (substituir token e animal_id)
curl -s -X POST http://localhost:8080/api/v1/cios \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"animal_id":1,"fazenda_id":1,"data_detectado":"2099-01-01T10:00:00Z"}' | jq .
```

Verificar corpo com `error.details.conformidade` = `TMP-001`.

---

**Última atualização**: 2026-05-25
