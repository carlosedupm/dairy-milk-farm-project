---
applyTo: "backend/internal/service/**/*.go,backend/internal/handlers/**/*.go,docs/business/**/*.md,frontend/src/components/gestao/**/*,frontend/src/app/gestao/**/*,frontend/src/app/producao/**/*,frontend/src/components/producao/**/*"
---

# Domínio pecuário — CeialMilk (Copilot)

Consulte `.cursor/rules/dominio-pecuaria.mdc` (ou `.claude/rules/dominio-pecuaria.md`) e o módulo em `docs/business/`.

- Ciclo: cio → cobertura → toque → gestação → secagem → parto → lactação → produção.
- Constantes nomeadas no backend (`diasGestacaoBovino`, `DiasMinimosToque`, …) — grep antes de calcular.
- Códigos TMP-001–006: tabela só em `docs/business/auditoria.md`.
- Não inventar `BR-*`; regra nova → briefing G1.
- Animal baixado = só consulta; uma lactação ativa por animal.
