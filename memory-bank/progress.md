# Progress — CeialMilk

> **Fonte única das métricas de completude.** Não duplicar percentuais em `activeContext.md`.
> Não é changelog: histórico de entregas está no `git log` e nos briefings em `docs/briefings/`.

## Completude

| Dimensão | % | Nota |
|----------|---|------|
| Geral | **99%** | Fases 2 e 3 fechadas em código |
| Infraestrutura | 97% | CI com lint, govulncheck, CodeQL, Dependabot, gate de deploy `checksPass` |
| Documentação | 99% | memory bank modular (`patterns/`, `deploy/`), catálogo + INDEX BR-*, harness multi-tool (`docs/harness/`) |
| Implementação | 95% | ciclo integrado, auditoria, M2M, saúde, alertas; agricultura em consolidação |
| Testes | 80% | unitários Go, cross-tenant, Vitest no CI, E2E Playwright local, TestSprite TC001–TC009 |
| Deploy | 92% | Render + Vercel em produção, gated por CI |

Marcos: início em 2025-09-07; migração Java → Go concluída em 2026-01-24. Time de 1 desenvolvedor.

## Fases fechadas

**Meta 1 — Fundação.** CRUD de fazendas, animais, produção e gestão pecuária; folgas; RBAC; JWT; deploy Render + Vercel; catálogo `docs/business/`.

**Meta 2 — Ciclo integrado do rebanho (Fase 2).** Ficha do animal com timeline (`BR-CICLO-008`); secagem encerra lactação ativa (`BR-CICLO-005/006`); dashboard pecuário com KPIs e drill-down (`BR-CICLO-009`, `BR-GESTACOES-004`); produção exige lactação ativa (`BR-CICLO-007`); `AnimalCicloService`; toque positivo vincula cobertura → gestação → `PRENHE` (`BR-TOQUES-002`); perfil `FUNCIONARIO` com POST de toques e produção (`BR-ACESSO-015`); auditoria de usuário com `created_by` (migrations 23–24, `BR-AUDIT-005`); API e UI de conformidade (`BR-AUDIT-003/006`).

**Meta 2b — Integrações M2M.** Migration 25, perfil `INTEGRACAO`, chaves `cmk_live_*` com scopes; rotas `/api/v1/integracoes` (animais, coberturas, toques unitário e em lote, saúde, alertas) com idempotência e auditoria em `integracao_chamadas`; admin CRUD + UI `/admin/integracoes`; OpenAPI 3.0 + Swagger UI públicos. Regras `BR-INTEG-001`–`012`.

**Meta 3 — Saúde e inteligência (Fase 3).** Módulo de saúde animal com sync de `status_saude`; alertas automáticos de ciclo, saúde e conformidade + Web Push; assistente Live com tools de saúde e alertas; assistente `FUNCIONARIO` fase 1 (BRF-007); alerta de hormônio de lactação pendente (BRF-006); modo ordenha por turno (BRF-009); links de eventos do ciclo na ficha (BRF-008).

Briefings BRF-001 a BRF-009: todos `implementado`. Ver [`docs/briefings/README.md`](../docs/briefings/README.md).

## Backlog aberto

### Validação operacional (bloqueia o fechamento do Tier 0)

- [ ] Execução manual do checklist de regressão Fase 2 em staging — [`docs/tests/regressao-ciclo-fase2.md`](../docs/tests/regressao-ciclo-fase2.md)
- [ ] Tier 0 seções 1–5 em Render — [`docs/tests/staging-validation-tier0.md`](../docs/tests/staging-validation-tier0.md): `METRICS_TOKEN`, rotação TestSprite, M2M em `:8080`, migration 38
- [ ] Validação manual G3 de BRF-006 (geração admin/cron) e BRF-007 (assistente no curral)
- [ ] Validação M2M com cliente real (lote de toques pós-veterinário)

### Testes

- [ ] Testes de integração cobrindo 70%+ dos fluxos de ciclo, saúde, alertas e M2M
- [ ] Testes automatizados dedicados ao módulo agrícola

### Funcionalidades

- [ ] **BRF-010** (`rascunho`) — cio obrigatório na cobertura; cobertura em prenhe; campos IA MVP; delete→status; cio silencioso (`BR-COBERTURAS-008`–`011`, `BR-CIOS-006`) — aguarda G1
- [ ] `BR-INTEG-013`/`014` — escopos M2M de produção e partos
- [ ] `BR-ACESSO-010` — convites de usuário
- [ ] Assistente fases 2–4
- [ ] Recuperação de senha — **adiada** até definir SMTP (ver [`deploy/env-vars.md`](deploy/env-vars.md))
- [ ] Predições avançadas de reprodução e produção — roadmap Fase 3+
- [ ] Validação integrada final do módulo agrícola (dados reais, permissões, cenários de erro)

### Plataforma

- [ ] BetterStack (Logtail) em produção — configuração pendente
- [ ] OpenAPI da API JWT completa — fora de escopo atual
- [ ] Otimizações de performance — sem gargalo documentado; só agir com medição

---

**Última atualização**: 2026-08-26
