# Guia de Code Review (Gate G2) — CeialMilk

Aplicado no gate **G2** do fluxo de briefings (`docs/briefings/README.md`): revisão antes de merge na `main`.

## Bloqueadores (reprovar o PR)

1. **Segurança**
   - Secret/credencial no diff
   - Endpoint sem validação de vínculo com fazenda (IDOR)
   - `err.Error()` ou detalhes internos em resposta HTTP ao cliente
   - Redirect com URL externa não validada
2. **Arquitetura**
   - Lógica de domínio em handler (deve estar em service) ou SQL fora de repository
   - Contradição com padrão documentado em `systemPatterns.md` sem atualizar a doc no mesmo PR
3. **Domínio**
   - Mudança de comportamento de produto sem atualizar `docs/business/` (BR-*)
   - Validação de regra BR-* apenas no frontend (servidor deve bloquear)
4. **Qualidade**
   - CI vermelho (lint, testes, builds, audits)
   - Mudança de comportamento sem teste correspondente

## Pontos de atenção (comentar, não necessariamente bloquear)

- Nomes e mensagens em PT-BR consistentes com o restante do produto
- Queries N+1 ou sem índice em tabelas grandes
- Acessibilidade no frontend (zoom/reflow conforme `systemPatterns.md`)
- Padrões de UI da regra `frontend-ui-patterns.mdc` (DatePicker, AnimalSelect, páginas finas)
- Migrações: reversíveis quando possível; nomeadas sequencialmente

## Checklist do revisor

- [ ] Li o briefing/BR associado (se houver) e o diff cumpre o escopo
- [ ] Rodei ou verifiquei o CI completo
- [ ] Validei caso de acesso cross-tenant para endpoints novos
- [ ] Docs (`docs/business/`, memory-bank) atualizados se comportamento mudou

## Processo

1. PRs pequenos e focados (ideal < ~400 linhas de diff de código).
2. Autor descreve **o que** e **por quê**; revisor não deve precisar adivinhar.
3. Aprovação de 1 revisor + CI verde → merge (squash preferido).

**Última atualização**: 2026-06-10
