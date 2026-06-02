# Agricultura — regras de domínio

Módulo agrícola: áreas, safras/culturas, custos, produções, receitas e análises de solo.

## BR-AGRI-001 — Data de plantio (safra/cultura)

- **Enunciado**: A data de plantio opcional não pode ser anterior a 5 anos nem estar fora do ano civil da safra; não pode ser futura nem posterior à colheita informada.
- **Escopo**: criação de safra/cultura por área e ano.
- **Perfis**: quem tem acesso ao módulo Agricultura (RBAC existente).
- **Efeito**: bloqueio na validação client (picker + submit); backend aceita datas sem TMP dedicado.
- **Implementação**: `CreateSafraCulturaDialog`, `resolvePlantioDateLimits`, `validateSafraCulturaForm` em `frontend/src/lib/agricultura-date-limits.ts` e `form-validation.ts`.
- **Estado**: implementado

## BR-AGRI-002 — Data de colheita (safra/cultura)

- **Enunciado**: A data de colheita opcional deve ser ≥ data de plantio (se informada), dentro do ano civil da safra e não pode ser futura.
- **Escopo**: criação de safra/cultura.
- **Efeito**: bloqueio client; ao alterar plantio, colheita inválida é limpa.
- **Implementação**: `resolveColheitaDateLimits`, `validateSafraCulturaForm`, `handlePlantioChange` em `CreateSafraCulturaDialog`.
- **Estado**: implementado

## BR-AGRI-003 — Datas de custo, produção e receita

- **Enunciado**: A data de custo, produção ou receita deve estar no período da safra/cultura (entre plantio e colheita quando existirem; senão ano civil da safra) e não pode ser futura.
- **Escopo**: formulários `POST` por `safra_cultura_id`.
- **Efeito**: bloqueio client (`minDate`/`maxDate` no picker + `validateCustoAgriculturaForm`, `validateProducaoAgriculturaForm`, `validateReceitaAgriculturaForm`).
- **Implementação**: `resolveSafraCulturaDateRange`; páginas em `frontend/src/app/agricultura/safras-culturas/[id]/*/novo/`.
- **Estado**: implementado

## BR-AGRI-004 — Datas de análise de solo

- **Enunciado**: Data de coleta e data de resultado não podem ser futuras; resultado ≥ coleta quando informado.
- **Escopo**: nova análise por área.
- **Efeito**: bloqueio client.
- **Implementação**: `resolveAnaliseSoloColetaLimits`, `resolveAnaliseSoloResultadoLimits`, `validateAnaliseSoloForm`; `frontend/src/app/agricultura/areas/[id]/analises-solo/nova/page.tsx`.
- **Estado**: implementado

**Última atualização**: 2026-06-02
