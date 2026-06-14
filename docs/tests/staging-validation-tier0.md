# Validação operacional Tier 0 (staging / produção)

Checklist consolidado pós-análise de backlog (2026-06-14). Executar em ambiente com PostgreSQL real (Render staging ou produção controlada) **antes** de considerar Fase 2 e Fase 3 «validadas em operação».

## Pré-requisitos

- Backend acessível (`NEXT_PUBLIC_API_URL` no frontend apontando para o ambiente).
- Utilizador admin + fazenda de teste com dados representativos.
- Cliente M2M de teste em `/admin/integracoes` (opcional para secção 3).

## 1. Ações manuais de segurança (hardening 2026-06-10)

| # | Ação | Onde | Verificação |
|---|------|------|-------------|
| 1.1 | Rotacionar API key TestSprite no provedor | Painel TestSprite | Chave antiga revogada; `${env:TESTSPRITE_API_KEY}` no dev local |
| 1.2 | Definir `METRICS_TOKEN` no Render | Dashboard Render → Environment | `curl -H "Authorization: Bearer $TOKEN" https://<api>/metrics` → 200; sem token → 404 em produção |
| 1.3 | Confirmar `checksPass` no deploy | Render + GitHub Actions | Deploy só após CI verde |

Referência: [`memory-bank/deploy-notes.md`](../../memory-bank/deploy-notes.md), [`docs/ops/security-checklist.md`](../ops/security-checklist.md).

## 2. Checklist regressão ciclo (Fase 2)

Executar integralmente [`regressao-ciclo-fase2.md`](./regressao-ciclo-fase2.md).

Registar resultado:

| Data | Ambiente | Executor | Itens OK | Falhas (ID) |
|------|----------|----------|----------|-------------|
| | | | | |

## 3. Migration 36 — vacinas (BRF-001)

| # | Passo | Esperado |
|---|-------|----------|
| 3.1 | Confirmar migration 36 aplicada (`animal_vacinas`, `animal_saude.vacina_id`) | `\d animal_vacinas` no psql ou log de startup sem erro |
| 3.2 | Criar vacina prevista (GERENTE+) | 201; tab Vacinas na ficha |
| 3.3 | FUNCIONARIO regista vacina aplicada | 201; 403 ao agendar prevista sem `data_aplicacao` |
| 3.4 | `POST /api/v1/admin/alertas/gerar` com prevista atrasada >7d | Alerta `VACINA_VENCIDA` ALTA |
| 3.5 | Aplicar vacina | Auto-resolve alerta; caso PREVENTIVO em `animal_saude` |
| 3.6 | Timeline `tipo=vacinas` | Evento visível na ficha |

## 4. Migration 37 — hormônios lactação (BRF-005)

| # | Passo | Esperado |
|---|-------|----------|
| 4.1 | Migration 37 aplicada | Tabelas `animal_hormonio_lactacao_*` |
| 4.2 | 1ª dose após toque prenhe + lactação ativa | 201 |
| 4.3 | Secagem encerra protocolo | Status `ENCERRADO` / motivo `SECAGEM` |
| 4.4 | `/gestao/hormonios-lactacao/pendentes` | Lista animais elegíveis |

## 5. Integração M2M ponta-a-ponta

Base URL: **porta 8080** (backend), não 3000.

| # | Passo | Esperado |
|---|-------|----------|
| 5.1 | `GET /api/v1/integracoes/me` com `cmk_live_*` | 200 + scopes |
| 5.2 | Busca animal `?fazenda_id=&identificacao=` | Só rebanho ativo (BR-INTEG-008) |
| 5.3 | `POST /api/v1/integracoes/toques/lote` | Sucesso parcial documentado (BR-INTEG-006) |
| 5.4 | `POST /api/v1/integracoes/saude` com `Idempotency-Key` | Dedup (BR-INTEG-005) |
| 5.5 | `GET /api/v1/integracoes/alertas?fazenda_id=` | Lista com scope `alertas:read` |

Guia: [`docs/integracoes/README.md`](../integracoes/README.md).

## 6. Validação automatizada local (pré-staging)

Antes de subir para staging, no devcontainer ou CI:

```bash
cd backend && go test ./... -count=1
cd frontend && npm run lint && npm run typecheck
node scripts/validate-br-refs.mjs
```

**Última execução local (2026-06-14):** `go test ./...` OK; `validate-br-refs` OK (217 IDs, 615 ficheiros). Secções 1–5 (staging/produção) **pendentes** — requerem ambiente Render e ações manuais do operador.

## Resultado global

- [ ] Tier 0 completo — data: ______
- [ ] Falhas abertas registadas em `memory-bank/activeContext.md` → Problemas Conhecidos

**Última atualização**: 2026-06-14
