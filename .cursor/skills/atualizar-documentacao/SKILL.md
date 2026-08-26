---
name: atualizar-documentacao
description: Sincroniza a documentação do CeialMilk (memory-bank/ e docs/business/) após mudanças no código. Use ao concluir uma funcionalidade, corrigir um bug relevante, adicionar dependência, estabelecer um padrão novo, alterar deploy ou mudar comportamento de produto — e sempre que o usuário pedir para atualizar o memory-bank, o activeContext, o progress ou o catálogo de negócio.
---

# Atualizar documentação — CeialMilk

Documentação desatualizada é pior que ausente: leva agentes e humanos a decisões erradas. Atualize **no mesmo trabalho** que o código, nunca depois.

## Decidir o que atualizar

Não atualize tudo por reflexo. Case a mudança com o arquivo:

| O que você mudou | Atualize |
|------------------|----------|
| Comportamento de produto, validação de domínio, permissão por perfil | **`docs/business/<modulo>.md`** (obrigatório) + `docs/business/README.md` se criou módulo |
| Regra que atravessa módulos ou toca o fluxo da vaca | `docs/business/ciclo-rebanho.md` |
| Concluiu/iniciou funcionalidade, novo risco, nova decisão técnica | `memory-bank/activeContext.md` |
| Marco atingido, completude mudou | `memory-bank/progress.md` (**fonte única de métricas**) |
| Dependência Go/npm, versão de stack, config de env | `memory-bank/techContext.md` |
| Padrão arquitetural, de API, de segurança | módulo em `memory-bank/patterns/` (+ índice `systemPatterns.md` se novo ficheiro) |
| Padrão de UI novo | `frontend/AGENTS.md` + `.cursor/rules/frontend-ui-patterns.mdc` (não em `patterns/`) |
| Deploy, variável de ambiente, migração | módulo em `memory-bank/deploy/` (+ índice `deploy-notes.md`) |
| Endpoint novo | `memory-bank/patterns/api.md` + `docs/postman/`; se M2M, `docs/integracoes/README.md` e `docs/openapi/integracoes-v1.openapi.yaml` |
| Regra Cursor / skill / adapter multi-tool | espelhar Claude (`.claude/`) e Copilot (`.github/instructions/`) no mesmo PR — ver `docs/harness/README.md` |
| Objetivo, fase ou público-alvo do produto | `memory-bank/projectbrief.md`, `memory-bank/productContext.md` |

Nada na tabela corresponde? Provavelmente não há doc a atualizar. Não invente entrada.

## Regras que evitam a degradação dos arquivos

Estes arquivos já foram inflados por changelog uma vez. Não repita:

1. **`activeContext.md` descreve o *agora*, não o histórico.** Ao concluir algo, **substitua** a entrada anterior — não empilhe. Teto prático: 120 linhas. Quem quer histórico usa `git log`.
2. **Métricas só em `progress.md`.** Nunca duplique percentuais de completude em `activeContext.md`.
3. **Padrões de UI só em `frontend/AGENTS.md` e `.cursor/rules/frontend-ui-patterns.mdc`.** `patterns/ui.md` é ponteiro fino — não reexplique o checklist.
4. **Sem seção de histórico cronológico.** Nada de "2026-08-16 — fizemos X". O que importa é o estado atual.
5. **Verifique antes de afirmar.** Versão de dependência vem de `backend/go.mod` ou `frontend/package.json`, não de memória.

## Formato de uma regra em `docs/business/`

ID estável `BR-<DOMINIO>-NNN` — nunca renumere; regra nova ganha ID novo. Campos mínimos:

```markdown
### BR-PRODUCAO-010 — Enunciado curto e afirmativo

- **Escopo**: fazenda, período, entidades afetadas
- **Perfis**: quem pode executar (ver `acessos-perfil.md`)
- **Efeito**: bloqueio no servidor (HTTP 409/422) vs. apenas alerta na UI
- **Implementação**: `backend/internal/service/x.go`, `frontend/src/app/y/page.tsx`
- **Migration/constraint**: `backend/migrations/NNNNNN_nome.up.sql` (se aplicável)
- **Estado**: implementado | parcial | planejado
```

Se a regra nasceu de um briefing, mude o estado para `implementado` e adicione os ponteiros ao código — ver `docs/briefings/README.md`.

## Fechamento

Atualize a linha `**Última atualização**: YYYY-MM-DD` de todo arquivo que você tocou.

Valide que nada ficou órfão — ambos são gates de CI (job `docs-validate`):

```bash
node scripts/validate-br-refs.mjs
node scripts/validate-docs.mjs
```

`validate-br-refs` falha se código ou briefing citar `BR-*`, `TMP-*` ou `INT-*` que não exista no catálogo.

`validate-docs` falha se um link markdown relativo não resolver, se um caminho de código citado em backticks (`backend/...`, `frontend/...`, `scripts/...`) não existir, ou se `activeContext.md` / `progress.md` passarem de 150 linhas. O teto é intencional: esses arquivos descrevem o estado atual, e passar dele significa que voltou a acumular changelog.

Falha também se qualquer arquivo fora de `docs/business/` **definir** um código `TMP-NNN`. A tabela canônica é `docs/business/auditoria.md`; referenciar os códigos é normal, redefini-los não — uma cópia da tabela no harness derivou do código e passou a indicar códigos errados.

## Checklist

```
- [ ] docs/business/<modulo>.md atualizado (se mudou comportamento de produto)
- [ ] activeContext.md reflete o estado atual, sem entrada empilhada
- [ ] progress.md atualizado (se marco ou completude mudaram)
- [ ] techContext.md atualizado (se dependência ou versão mudaram)
- [ ] módulo em `memory-bank/patterns/` atualizado (se padrão novo)
- [ ] módulo em `memory-bank/deploy/` atualizado (se deploy ou env var)
- [ ] adapters Claude/Copilot alinhados (se mudou regra/skill Cursor)
- [ ] Data de "Última atualização" em cada arquivo tocado
- [ ] node scripts/validate-br-refs.mjs passa
- [ ] node scripts/validate-docs.mjs passa
```
