# Briefing BRF-007 — Assistente FUNCIONARIO fase 1 (consulta)

> Fluxo, papéis e gates: [`docs/briefings/README.md`](./README.md).

## Metadados

| Campo | Valor |
|-------|-------|
| ID | `BRF-007` |
| Data | 2026-06-14 |
| Analista | Plano assistente FUNCIONARIO |
| Status | implementado |
| Aprovado por (G1) | Desenvolvedor (2026-06-14) |
| PR vinculado (G2) | — |

## 1. Objetivo

Liberar o Assistente Virtual para o perfil **FUNCIONARIO** em **modo consulta**: buscar animal e contar/listar animais da fazenda ativa por voz/texto, sem operações de escrita destrutiva ou cadastro.

## 2. Regras de negócio (fonte de verdade)

| ID | Módulo | Estado atual | O que muda |
|----|--------|--------------|------------|
| `BR-ACESSO-006` | [`acessos-perfil.md`](../business/acessos-perfil.md) | parcial | Fase 1: capability `assistente.consulta` para FUNCIONARIO |

**Plano de fases:** [`docs/ops/assistente-funcionario-fases.md`](../ops/assistente-funcionario-fases.md).

**Capability fase 1:** `assistente.consulta`

| Tool Live | Intent texto | RBAC espelhado |
|-----------|--------------|----------------|
| `listar_animais` | `consultar_animais_fazenda`, `listar_animais_fazenda` | GET animais / contagem |
| `detalhar_animal` | `detalhar_animal` | GET animal + contexto |

**Bloqueado na fase 1:** `cadastrar_animal`, `registrar_producao_animal`, `excluir_animal`, saúde, alertas write, etc.

## 3. Escopo da implementação

### Frontend

- `appAccess.ts`: `FUNCIONARIO: ["assistente.consulta"]`; `showAssistenteForPerfil` true.

### Backend

- `perfil_access.go`: whitelist `/api/v1/assistente/*` para FUNCIONARIO.
- `assistente_live_service.go`: filtrar declarations + `ExecuteFunction` por perfil.
- `assistente_service.go`: `Executar` valida intent por perfil.

### O que NÃO mexer

- Fases 2–4 (produção, alertas, saúde).
- RBAC GERENTE+ inalterado.

## 4. Casos de teste exigidos

- [ ] FUNCIONARIO: «quantas vacas na fazenda?» → `listar_animais` / intent consulta OK.
- [ ] FUNCIONARIO: «detalhes do animal X» → `detalhar_animal` OK.
- [ ] FUNCIONARIO: `cadastrar_animal` → 403 / erro de domínio.
- [ ] FUNCIONARIO: `registrar_producao_animal` → bloqueado.
- [ ] GERENTE+: assistente completo inalterado.

## 5. Perguntas em aberto

| # | Pergunta | Resposta (desenvolvedor) |
|---|----------|--------------------------|
| 1 | Incluir `listar_fazendas` no modo consulta? | Não — usa fazenda ativa do contexto |

## 6. Critérios de aceite (gate G3)

- [x] `go test ./...` + `validate-br-refs` OK
- [x] FAB assistente visível para FUNCIONARIO (`appAccess.ts`)
- [x] BR-ACESSO-006 atualizado com fase 1 implementada
- [x] `memory-bank/activeContext.md` atualizado

## 7. Notas adicionais

Referência operacional: [`docs/ops/assistente-funcionario-fases.md`](../ops/assistente-funcionario-fases.md).

**Última atualização**: 2026-06-14
