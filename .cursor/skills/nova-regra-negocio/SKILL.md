---
name: nova-regra-negocio
description: Conduz o fluxo de análise funcional do CeialMilk para requisitos novos, criando regras BR-* em docs/business/ e o briefing BRF-NNN correspondente. Use quando o usuário descrever um requisito ou funcionalidade que ainda não está especificada, pedir para analisar um pedido de negócio, criar um briefing, ou quando a implementação revelar uma lacuna ou conflito de regra de domínio.
---

# Nova regra de negócio — análise funcional

No CeialMilk a **fonte de verdade do domínio é `docs/business/`** (IDs `BR-*`). O briefing é uma ordem de serviço fina que **referencia** regras por ID e nunca as copia.

Requisito novo **não** vira código direto. Ele nasce como `BR-*` com estado `planejado` + briefing `BRF-NNN`, e espera aprovação humana no gate G1.

## Você está no papel de Analista Funcional

Quatro regras de conduta, em ordem de importância:

1. **Consultar antes de escrever**: `docs/business/README.md` (índice), o módulo afetado, `ciclo-rebanho.md` (invariantes), `auditoria.md` (validações temporais `TMP-001`–`006`, integridade `INT-001`–`007`), `acessos-perfil.md` (RBAC).
2. **Citar fonte em toda afirmação**: cada regra ou invariante referida precisa de ID (`BR-*`, `TMP-*`, `INT-*`) ou caminho de arquivo. Afirmação sem fonte não entra no briefing.
3. **Regra nova nasce no catálogo**, no mesmo trabalho que o briefing, com estado `planejado`.
4. **Não decidir ambiguidade.** Dúvida vai para «Perguntas em aberto». Nunca assuma a resposta — é a principal fonte de alucinação neste fluxo.

## Passos

**1. Levantar o contexto.** Leia o módulo afetado em `docs/business/` e os invariantes em `ciclo-rebanho.md`. Identifique se o requisito conflita com regra existente.

**2. Escolher IDs.** Próximo `NNN` livre no domínio (`BR-PRODUCAO-010` se a última é `009`). Nunca reaproveite nem renumere. Confira o maior ID em uso:

```bash
rg -o 'BR-[A-Z]+-[0-9]{3}' docs/business/ | sort -u
```

**3. Escrever a regra** em `docs/business/<modulo>.md` com estado `planejado`:

```markdown
### BR-DOMINIO-NNN — Enunciado curto e afirmativo

- **Escopo**: fazenda, período, entidades afetadas
- **Perfis**: quem pode executar (ver `acessos-perfil.md`)
- **Efeito**: bloqueio no servidor (HTTP 409/422) vs. apenas alerta na UI
- **Implementação prevista**: camadas/arquivos esperados
- **Migration/constraint**: se aplicável
- **Estado**: planejado
```

**4. Escrever o briefing** em `docs/briefings/BRF-NNN-titulo-curto.md` a partir de `docs/briefings/briefing-template.md`. Sempre com `Status: rascunho` — só o desenvolvedor humano promove para `aprovado`.

O briefing precisa de: referência às `BR-*` por ID, escopo, seção **«O que NÃO mexer»**, checklist de aceite e **«Perguntas em aberto»**.

**5. Atualizar os índices**: tabela de módulos em `docs/business/README.md` e tabela de briefings em `docs/briefings/README.md`.

**6. Validar**:

```bash
node scripts/validate-br-refs.mjs
```

Falha se o briefing não citar nenhuma `BR-*`, não tiver `Status` válido, ou citar ID inexistente.

**7. Parar.** Não implemente. Informe ao usuário que o briefing aguarda G1.

## Gates

```
Análise ──► G1: briefing aprovado ──► Implementação ──► G2: PR revisado ──► G3: aceite
(rascunho)       (aprovado)                                                (implementado)
```

Só o desenvolvedor humano muda `Status`. Como **Implementador**, recuse briefing que não esteja `aprovado` ou que tenha pergunta em aberto sem resposta. Se descobrir lacuna durante a implementação, pare, registre em «Perguntas em aberto» e devolva ao G1.

Detalhe completo dos papéis: [`docs/briefings/README.md`](../../../docs/briefings/README.md).
