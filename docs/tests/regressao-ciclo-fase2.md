# Regressão integrada — Ciclo do rebanho (Fase 2)

Checklist manual para fechar a Fase 2. Executar em ambiente com migrações 1–24 aplicadas e utilizador de gestão com fazenda vinculada.

## Pré-requisitos

- API e frontend a correr (`DATABASE_URL`, seed admin).
- Fazenda ativa no header; matriz fêmea de teste disponível.

## Fluxo feliz (API ou UI)

| # | Passo | Verificação |
|---|--------|-------------|
| 1 | Cadastrar cobertura na matriz | `status_reprodutivo` → SERVIDA; `GET /animais/:id/contexto` timeline inclui COBERTURA |
| 2 | Toque **positivo** com `cobertura_id` | PRENHE; gestação CONFIRMADA; resumo pecuário +1 prenhe |
| 3 | Secagem (se gestação ativa) | Lactação ativa encerrada; status SECA |
| 4 | Parto (+ crias opcional) | Lactação aberta; PARIDA; crias vivas no rebanho se aplicável |
| 5 | Produção de leite | 400 se sem lactação ativa; sucesso com lactação |
| 6 | Restrição leite (AGUARDANDO_LAB) | Só animal em lactação; painel na home |
| 7 | `GET /fazendas/:id/auditoria/conformidade` | `total: 0` no fluxo feliz |

## Checks INT-001–INT-006 (dados legado ou cenário forçado)

| Código | Como provocar (dev) | Esperado na API |
|--------|---------------------|-----------------|
| INT-001 | Duas lactações ativas no mesmo animal | Lista com codigo INT-001 |
| INT-002 | Produção sem lactação que cubra a data (ex.: data anterior ao parto ou sem lactação cadastrada) | INT-002 |
| INT-003 | Gestação CONFIRMADA sem toque POSITIVO | INT-003 |
| INT-004 | Restrição AGUARDANDO_LAB sem lactação | INT-004 |
| INT-005 | Animal PRENHE sem gestação confirmada | INT-005 (MEDIA) |
| INT-006 | Toque POSITIVO sem cobertura_id | INT-006 |

## Perfis

- **FUNCIONARIO**: POST toques, produção, restrições; sem painel conformidade na home.
- **GERENTE/GESTAO/PROPRIETARIO**: painel conformidade na home; timeline com «Registado por» quando `created_by` preenchido.

## UI (1.2)

- Home: secção **Conformidade dos dados** (gestão).
- Ficha `/animais/:id`: histórico com «Registado por Nome» nos eventos recentes.

## Validação temporal (TMP-001–006)

Checklist dedicado: [validacao-temporal-ciclo.md](./validacao-temporal-ciclo.md) — datas futuras, piso do animal, cronologia cio→cobertura→toque→parto→secagem→produção, baixa sem `data_saida` futura.

## Automatizado

- `cd backend && go test ./internal/service/... -count=1`
- TestSprite `TC001`–`TC009` em `testsprite_tests/` (API base).
- Playwright: `frontend/tests/e2e/` (auth/navegação; estender para gestão quando necessário).

**Última atualização**: 2026-06-27
