# Design Tokens — CeialMilk

Dicionário exportável de tokens do design system.

## Arquivos

| Arquivo | Propósito |
|---------|-----------|
| [`tokens.json`](tokens.json) | Dicionário W3C DTCG (exportável para Figma, Style Dictionary, etc.) |
| [`../../src/app/globals.css`](../src/app/globals.css) | **Fonte de runtime** — CSS custom properties (light/dark) |
| [`../../tailwind.config.ts`](../tailwind.config.ts) | Mapeamento para classes Tailwind |

## Manutenção

1. Alterar valores em `globals.css` (primitivos ou semânticos).
2. Atualizar `tokens.json` com os mesmos valores.
3. Atualizar [`docs/design-system/tokens.md`](../../docs/design-system/tokens.md) se houver mudança de mapeamento ou uso.
4. Rodar `npm run validate:tokens` no frontend.
5. Verificar contraste WCAG AA após mudanças de cor.

Documentação completa: [`docs/design-system/tokens.md`](../../docs/design-system/tokens.md).

**Última atualização**: 2026-05-30
