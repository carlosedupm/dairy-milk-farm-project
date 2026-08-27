# Active Context — CeialMilk

> Descreve o **estado atual**. Não é changelog: entradas concluídas são substituídas, não empilhadas. Histórico está no `git log`. Métricas de completude ficam em [`progress.md`](progress.md).

## Status geral

Stack **Go + Next.js** em produção (Render + Vercel). Fases 2 e 3 fechadas em código; briefings BRF-001 a BRF-009 implementados. **BRF-010** implementado em código (G3 manual pendente).

**Foco atual:** validação operacional Tier 0 em staging e aceite G3 do BRF-010.

## Em andamento

- **Validação operacional Tier 0** — checklist Fase 2, migrations 36/37, M2M em staging, e ações manuais de segurança (`METRICS_TOKEN`, rotação de chave TestSprite). Ver [`docs/tests/staging-validation-tier0.md`](../docs/tests/staging-validation-tier0.md).
- **BRF-010 G3** — fluxo cio→cobertura vinculada, cobertura em prenhe (`PERDA`), delete→status. Briefing `aprovado`. Ver [`docs/briefings/BRF-010-cio-cobertura-vinculo-status.md`](../docs/briefings/BRF-010-cio-cobertura-vinculo-status.md).

## Próximos passos imediatos

1. **Tier 0 staging (Render)** — seções 1–5 de [`docs/tests/staging-validation-tier0.md`](../docs/tests/staging-validation-tier0.md): `METRICS_TOKEN`, TestSprite, regressão Fase 2 manual, M2M em `:8080`, migration 38 em ambiente real.
2. **Validação manual G3** — BRF-010 (cio/cobertura); BRF-006 (geração admin/cron) e BRF-007 (assistente no curral com perfil `FUNCIONARIO`).
3. **Tier 2** — `BR-INTEG-013`/`014` (M2M produção e partos); testes de integração; `BR-ACESSO-010` (convites); assistente fases 2–4.
4. **Recuperação de senha** — adiada até definir SMTP (ver [`deploy/env-vars.md`](deploy/env-vars.md)).

## Módulos em produção

Regras de cada módulo em [`docs/business/`](../docs/business/README.md) — este é só o inventário.

| Área | Módulos |
|------|---------|
| Ciclo reprodutivo | animais, cios, coberturas, toques, gestações, secagens, partos, lactações |
| Produção | produção de leite (modo ordenha por turno), hormônios de lactação, leite para descarte |
| Rebanho | lotes, movimentação, baixa do rebanho, busca contextual de animais |
| Saúde | saúde animal, vacinas/calendário preventivo, `status_saude` derivado |
| Operação | folgas (escala 5x1), alertas proativos + Web Push, auditoria e conformidade |
| Agricultura | safras, custos agrícolas, análise de solo, produção e resultado agrícola |
| Plataforma | RBAC por perfil, cadastro público, vínculo usuário–fazenda, módulo admin |
| Integrações | API M2M `/api/v1/integracoes` (`BR-INTEG-001`–`012`), Swagger público |
| Assistente | assistente multimodal Live (Gemini), fase 1 (consulta) para `FUNCIONARIO` |
| Dev Studio | fases 0–3 |

## Decisões técnicas ativas

### Produto e documentação

- **Ciclo do rebanho leiteiro** é o eixo do produto; requisitos transversais em `docs/business/ciclo-rebanho.md` (`BR-CICLO-*`). Definição de pronto inclui sincronização código ↔ catálogo ↔ memory bank.
- **Toque positivo** exige cobertura (informada ou última sem gestação); sem cobertura → 400. Efeitos em gestação confirmada, `PRENHE`, busca, ficha e resumo pecuário.
- **Produção** lista e valida apenas animais em lactação ativa (`em-lactacao`).
- **Requisito novo nasce como `BR-*` `planejado` + briefing `BRF-NNN`**, aprovado no gate G1 antes da implementação (`docs/briefings/README.md`).
- **Códigos normativos têm fonte única**: a tabela dos `TMP-*` é `docs/business/auditoria.md`. Resumos de domínio (incluindo `.cursor/rules/`) **referenciam** os códigos, nunca reproduzem a numeração — uma cópia em `dominio-pecuaria.mdc` derivou do código e emitia `TMP-004` a `TMP-006` errados; `validate-docs.mjs` agora bloqueia a reincidência. Mesma regra para constantes de cálculo (`diasGestacaoBovino` = 283, `DiasMinimosToque` = 15): citar o nome da constante, não só o número.
- **Harness multi-tool**: `AGENTS.md` é a fonte portável; adapters Cursor (`.cursor/`), Claude (`CLAUDE.md` + `.claude/`), Copilot (`.github/copilot-instructions.md`). Mapa: [`docs/harness/README.md`](../docs/harness/README.md).
- **Padrões e deploy modularizados**: `memory-bank/patterns/` e `memory-bank/deploy/` (índices `systemPatterns.md` / `deploy-notes.md`). Índice de IDs: [`docs/business/INDEX.md`](../docs/business/INDEX.md); legado pré-BRF em `pre-briefing-allowlist.txt`.

### Arquitetura e stack

- Backend em **Go** com **Gin**; camadas `handlers` → `service` → `repository`.
- Frontend em **Next.js 16** (App Router, **webpack** — `next dev --webpack`) com **React 19**.
- **PostgreSQL** mantido (schema existente), acesso via **pgx/v5**.
- **Monorepo** `backend/` + `frontend/`.
- Frontend segue **DRY + composição + abstração de lógica** (`services/`, `lib/`, `hooks/`, layouts compartilhados, Shadcn em `ui/`) — ver `patterns/design.md`.
- **Zoom do navegador, escala de texto do SO e reflow** obrigatórios em toda UI — ver `patterns/ui.md`.

### Segurança

- **JWT RS256** (par de chaves) para a UI; **API key** `cmk_live_*` + scopes para M2M.
- **Refresh tokens** no banco como hash SHA-256, com **rotação** a cada refresh.
- Cookies **HttpOnly** + **Secure**; tokens **nunca** no corpo JSON.
- Bootstrap de sessão no frontend com `ensureSession` (validate + refresh), para não forçar re-login quando o access JWT de 15 min expira durante pausas operacionais (ex.: ordenha).
- **Bcrypt** para senhas; mínimo 8 caracteres (`BR-ACESSO-024`).
- **CORS estrito** para o domínio da Vercel.
- Erros 500 com mensagem genérica ao cliente; detalhe só em log estruturado (`response.ErrorInternal`).
- **CSP Report-Only** no frontend antes de tornar bloqueante; `/metrics` protegido por `METRICS_TOKEN` em produção.
- CI com golangci-lint, govulncheck, `npm audit`, CodeQL e Dependabot; deploy do Render só com checks verdes.

### Observabilidade

- **Sentry** para erros em tempo real; **BetterStack (Logtail)** para agregação de logs.
- **Prometheus** para métricas — implementado em `backend/internal/middleware/metrics.go`.
- **slog** para logging estruturado no backend. Frontend **não tem** logger estruturado.

### Infraestrutura

- Backend no **Render** (Docker); frontend na **Vercel**; PostgreSQL no Render ou Neon.tech.
- **Seed operacional local** (`ENV=development`): após migrations, o API aplica `backend/scripts/seed_dev.sql` (lote + animais `DEV-*` + lactações) salvo `SEED_DEV=false`. Não é migration — não vai a staging/prod. Detalhe: [`techContext.md`](techContext.md), [`deploy/env-vars.md`](deploy/env-vars.md).

## Problemas conhecidos

- **Voz no Chrome Android**: a Web Speech API tem suporte limitado. Há workarounds aplicados (`continuous: false`, pre-warm com `getUserMedia`), mas a precisão pode ser menor que no desktop. Fallback: digitar o comando.
- **Testes da API de integrações**: usar **porta 8080** (backend Go), não 3000 (Next.js). Em `GET /animais/search` e `GET /coberturas`, enviar `fazenda_id` / `identificacao` / `animal_id` como **query params**, não como headers. Respostas típicas: 403 sem scope ou fazenda não vinculada; 404 animal inexistente; 200 com `data: []` sem coberturas.
- **Recuperação de senha** não implementada — aguarda definição de SMTP.

---

**Última atualização**: 2026-08-26
