---
name: corrigir-bug
description: Corrige um bug no CeialMilk com regressão e documentação. Use ao investigar falha, erro 4xx/5xx inesperado, comportamento incorreto na UI ou API, ou quando o usuário reportar um defeito.
---

# Corrigir bug — CeialMilk

## Fluxo

1. **Reproduzir** — passos, perfil RBAC, fazenda, payload/URL. Anote status HTTP e mensagem (`getApiErrorMessage` / log slog).
2. **Localizar camada** — handler (bind/RBAC) → service (regra) → repository (SQL) → UI (`services/` + Query). Não “consertar” só no frontend se a invariante é de servidor.
3. **Consultar domínio** — se tocar ciclo/saúde/produção/`BR-*`, leia `docs/business/<modulo>.md` e a regra [`dominio-pecuaria`](../../rules/dominio-pecuaria.mdc).
4. **Corrigir na camada certa** — erros explícitos em Go; TypeScript strict; respostas via `internal/response`.
5. **Regressão** — teste unitário ou caso manual mínimo que falharia antes da correção (`go test` / `npm run test:unit`).
6. **Validar** — comando `/validar` (ou gates em `AGENTS.md`).
7. **Documentar** — se o **comportamento de produto** mudou, skill `atualizar-documentacao` + `docs/business/`. Se a correção revelar **lacuna de regra**, pare e use `nova-regra-negocio` (não invente `BR-*` ad hoc).

## Não fazer

- Inventar `BR-*` ou alterar Status de briefing
- Silenciar erro 500 sem log estruturado
- Patch só na UI para burlar validação do service
- Empilhar changelog em `activeContext.md`

## Encadeamento

- Regra nova → `nova-regra-negocio`
- Endpoint em falta → `novo-endpoint`
- Schema → `nova-migration`
- Fecho → `atualizar-documentacao`
