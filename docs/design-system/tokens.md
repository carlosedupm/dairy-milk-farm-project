# Design Tokens — CeialMilk

Tokens semânticos consolidados para o frontend CeialMilk. Objetivo: uma alteração de cor primária ou escala tipográfica exige editar **um** lugar (`globals.css`) com documentação e JSON espelhados.

## Arquitetura (dual-layer)

```
Primitivos Shadcn (--primary, --background, …)
        ↓ aliases
Semânticos (--color-surface-primary, --color-feedback-warning, …)
        ↓ mapeamento
Tailwind (bg-surface-primary, text-feedback-warning, …)
        ↓ espelho
JSON W3C (frontend/design-tokens/tokens.json)
```

- **Runtime**: [`frontend/src/app/globals.css`](../../frontend/src/app/globals.css)
- **Classes**: [`frontend/tailwind.config.ts`](../../frontend/tailwind.config.ts)
- **Dicionário exportável**: [`frontend/design-tokens/tokens.json`](../../frontend/design-tokens/tokens.json)

Componentes existentes foram **migrados para tokens semânticos** (2026-05-30), exceto `LandingPage` e módulo `dev-studio` (cores literais intencionais). Novos componentes devem preferir tokens semânticos; o CI executa `npm run validate:tokens` para garantir paridade CSS↔JSON e ausência de cores literais proibidas.

---

## RF01 — Cores semânticas

### Surface

| Token | CSS var | Classe Tailwind | Light (HSL) | Dark (HSL) | Uso |
|-------|---------|-----------------|-------------|------------|-----|
| `color.surface.primary` | `--color-surface-primary` | `bg-surface-primary` | 40 18% 97% | 152 18% 11% | Fundo da página |
| `color.surface.secondary` | `--color-surface-secondary` | `bg-surface-secondary` | 40 18% 93% | 152 12% 20% | Fundos suaves, listas |
| `color.surface.elevated` | `--color-surface-elevated` | `bg-surface-elevated` | 0 0% 100% | 152 16% 14% | Cards, painéis |
| `color.surface.overlay` | `--color-surface-overlay` | `bg-surface-overlay` | 0 0% 100% | 152 16% 14% | Popovers, dialogs |

### Text

| Token | CSS var | Classe Tailwind | Uso |
|-------|---------|-----------------|-----|
| `color.text.primary` | `--color-text-primary` | `text-content-primary` | Texto principal |
| `color.text.secondary` | `--color-text-secondary` | `text-content-secondary` | Metadados, hints |
| `color.text.inverse` | `--color-text-inverse` | `text-content-inverse` | Texto sobre fundo escuro |
| `color.text.onBrand` | `--color-text-on-brand` | `text-content-onBrand` | Texto sobre brand primary |

### Border

| Token | CSS var | Classe Tailwind | Uso |
|-------|---------|-----------------|-----|
| `color.border.default` | `--color-border-default` | `border-border` (legado) | Bordas padrão |
| `color.border.input` | `--color-border-input` | `border-input` (legado) | Inputs |
| `color.border.focus` | `--color-border-focus` | `ring-ring` (legado) | Foco |

### Brand / Accent

| Token | CSS var | Classe Tailwind | Uso |
|-------|---------|-----------------|-----|
| `color.brand.primary` | `--color-brand-primary` | `bg-brand-primary` | Ações primárias, links |
| `color.brand.secondary` | `--color-brand-secondary` | `bg-brand-secondary` | Ações secundárias |
| `color.accent.default` | `--color-accent-default` | `bg-accent` (legado) | Hover, destaque suave |

### Feedback

| Token | CSS var | Classe Tailwind | Light (HSL) | Dark (HSL) | Uso |
|-------|---------|-----------------|-------------|------------|-----|
| `color.feedback.success` | `--color-feedback-success` | `text-feedback-success` / `bg-feedback-success` | 152 55% 32% | 152 48% 48% | Sucesso, conformidade |
| `color.feedback.warning` | `--color-feedback-warning` | `text-feedback-warning` / `bg-feedback-warning` | 32 95% 44% | 38 92% 50% | Avisos, atenção |
| `color.feedback.error` | `--color-feedback-error` | `text-feedback-error` / `bg-feedback-error` | = destructive | = destructive | Erros, validação |
| `color.feedback.info` | `--color-feedback-info` | `text-feedback-info` / `bg-feedback-info` | 217 91% 48% | 217 91% 60% | Informação |

Variantes `-foreground`: `text-feedback-success-foreground`, etc.

---

## Mapeamento legado → semântico

Use esta tabela na **próxima task** de refatoração de componentes.

| Legado | Token semântico | Classe recomendada |
|--------|-----------------|-------------------|
| `--background` / `bg-background` | `color.surface.primary` | `bg-surface-primary` |
| `--card` / `bg-card` | `color.surface.elevated` | `bg-surface-elevated` |
| `--muted` / `bg-muted` | `color.surface.secondary` | `bg-surface-secondary` |
| `--foreground` / `text-foreground` | `color.text.primary` | `text-content-primary` |
| `--muted-foreground` / `text-muted-foreground` | `color.text.secondary` | `text-content-secondary` |
| `--primary` / `bg-primary` | `color.brand.primary` | `bg-brand-primary` |
| `--secondary` / `bg-secondary` | `color.brand.secondary` | `bg-brand-secondary` |
| `--destructive` / `text-destructive` | `color.feedback.error` | `text-feedback-error` |
| `text-amber-600 dark:text-amber-400` | `color.feedback.warning` | `text-feedback-warning` |
| `border-amber-500/40 bg-amber-500/10` | `color.feedback.warning` | `border-feedback-warning/40 bg-feedback-warning/10` |
| `text-green-600 dark:text-green-500` | `color.feedback.success` | `text-feedback-success` |
| `border-green-600/40 bg-green-500/10` | `color.feedback.success` | `border-feedback-success/40 bg-feedback-success/10` |
| `text-blue-600 dark:text-blue-400` | `color.feedback.info` | `text-feedback-info` |
| `text-red-500` / `bg-red-50` | `color.feedback.error` | `text-feedback-error` / `bg-feedback-error/10` |
| `text-base` | `typography.fontSize.base` | `text-base` |
| `text-sm` | `typography.fontSize.sm` | `text-sm` |
| `shadow-sm` | `shadow.elevation1` | `shadow-elevation1` |
| `shadow-md` | `shadow.elevation2` | `shadow-elevation2` |
| `shadow-lg` | `shadow.elevation3` | `shadow-elevation3` |
| `shadow-xl` | `shadow.elevation4` | `shadow-elevation4` |
| `rounded-md` | `borderRadius.md` | `rounded-md` |
| `rounded-lg` | `borderRadius.lg` | `rounded-lg` |

**Exceções intencionais (fora do escopo de migração):** `LandingPage` e módulo `dev-studio` usam cores literais para marketing/diferenciação visual.

---

## RF02 — Tipografia

**Família:** Inter (`--font-inter` via `next/font` em `layout.tsx`).

| Token | CSS var | Classe | Valor | Uso |
|-------|---------|--------|-------|-----|
| `typography.fontSize.xs` | `--font-size-xs` | `text-xs` | 12px / 0.75rem | Badges (uso restrito) |
| `typography.fontSize.sm` | `--font-size-sm` | `text-sm` | 14px / 0.875rem | **Small mínimo (RF02)** |
| `typography.fontSize.base` | `--font-size-base` | `text-base` | 16px / 1rem | **Body mínimo (RF02)** |
| `typography.fontSize.lg` | `--font-size-lg` | `text-lg` | 18px / 1.125rem | Subtítulos |
| `typography.fontSize.xl` | `--font-size-xl` | `text-xl` | 20px / 1.25rem | Títulos de página |
| `typography.fontSize.2xl` | `--font-size-2xl` | `text-2xl` | 24px / 1.5rem | Títulos de secção |

| Token | CSS var | Classe | Valor |
|-------|---------|--------|-------|
| `typography.fontWeight.normal` | `--font-weight-normal` | `font-normal` | 400 |
| `typography.fontWeight.medium` | `--font-weight-medium` | `font-medium` | 500 |
| `typography.fontWeight.semibold` | `--font-weight-semibold` | `font-semibold` | 600 |
| `typography.fontWeight.bold` | `--font-weight-bold` | `font-bold` | 700 |

| Token | CSS var | Classe | Valor |
|-------|---------|--------|-------|
| `typography.lineHeight.tight` | `--line-height-tight` | `leading-tight` | 1.25 |
| `typography.lineHeight.snug` | `--line-height-snug` | `leading-snug` | 1.375 |
| `typography.lineHeight.normal` | `--line-height-normal` | `leading-normal` | 1.5 |
| `typography.lineHeight.relaxed` | `--line-height-relaxed` | `leading-relaxed` | 1.625 |

| Token | CSS var | Classe | Valor |
|-------|---------|--------|-------|
| `typography.letterSpacing.tight` | `--letter-spacing-tight` | `tracking-tight` | -0.025em |
| `typography.letterSpacing.normal` | `--letter-spacing-normal` | `tracking-normal` | 0 |
| `typography.letterSpacing.wide` | `--letter-spacing-wide` | `tracking-wide` | 0.025em |

---

## RF03 — Espaçamento (grid 4px)

Base: **1 unidade Tailwind = 4px** (`0.25rem`). Escala padrão Tailwind 1–24:

| Token | rem | px | Classe exemplo |
|-------|-----|----|----|
| `spacing.1` | 0.25 | 4 | `p-1`, `gap-1` |
| `spacing.2` | 0.5 | 8 | `p-2`, `gap-2` |
| `spacing.3` | 0.75 | 12 | `p-3` |
| `spacing.4` | 1 | 16 | `p-4` |
| `spacing.5` | 1.25 | 20 | `p-5`, `space-y-5` (formulários) |
| `spacing.6` | 1.5 | 24 | `p-6` |
| `spacing.7` | 1.75 | 28 | `p-7` |
| `spacing.8` | 2 | 32 | `p-8` |
| `spacing.9` | 2.25 | 36 | `p-9` |
| `spacing.10` | 2.5 | 40 | `p-10` |
| `spacing.11` | 2.75 | 44 | `min-h-11` (alvo toque) |
| `spacing.12` | 3 | 48 | `p-12` |
| `spacing.14` | 3.5 | 56 | `p-14` |
| `spacing.16` | 4 | 64 | `p-16` |
| `spacing.20` | 5 | 80 | `p-20` |
| `spacing.24` | 6 | 96 | `p-24` |

Valores ímpares (13, 15, 17–23) seguem o mesmo grid (+4px por passo).

---

## RF04 — Border radius (×6)

Base: `--radius: 0.625rem` (10px).

| Token | CSS var | Classe | Valor (com base 10px) |
|-------|---------|--------|------------------------|
| `borderRadius.none` | `--radius-none` | `rounded-none` | 0 |
| `borderRadius.sm` | `--radius-sm` | `rounded-sm` | 6px |
| `borderRadius.md` | `--radius-md` | `rounded-md` | 8px |
| `borderRadius.lg` | `--radius-lg` | `rounded-lg` | 10px |
| `borderRadius.xl` | `--radius-xl` | `rounded-xl` | 14px |
| `borderRadius.full` | `--radius-full` | `rounded-full` | 9999px |

---

## RF04 — Sombras / elevação (×4)

| Token | CSS var | Classe semântica | Legado Tailwind |
|-------|---------|------------------|-----------------|
| `shadow.elevation1` | `--shadow-elevation-1` | `shadow-elevation1` | `shadow-sm` |
| `shadow.elevation2` | `--shadow-elevation-2` | `shadow-elevation2` | `shadow-md` |
| `shadow.elevation3` | `--shadow-elevation-3` | `shadow-elevation3` | `shadow-lg` |
| `shadow.elevation4` | `--shadow-elevation-4` | `shadow-elevation4` | `shadow-xl` |

No modo escuro, as sombras usam opacidade ligeiramente maior para manter percepção de profundidade.

---

## RF05 — Breakpoints

Alinhados ao Tailwind (`tailwind.config.ts` → `theme.screens`):

| Token | Valor | Uso típico no projeto |
|-------|-------|------------------------|
| `breakpoint.sm` | 640px | CTAs full-width → inline |
| `breakpoint.md` | 768px | Tabela desktop vs cards mobile (`ResponsiveListContainer`) |
| `breakpoint.lg` | 1024px | Nav desktop vs drawer mobile |
| `breakpoint.xl` | 1280px | Layouts amplos |
| `breakpoint.2xl` | 1536px | Monitores grandes |

Prefixos responsivos: `sm:`, `md:`, `lg:`, `xl:`, `2xl:`.

---

## Como alterar a cor primária

1. Editar `--primary` e `--ring` em `:root` e `.dark` em [`globals.css`](../../frontend/src/app/globals.css).
2. Atualizar `color.primitive.primary` e `color.brand.primary` em [`tokens.json`](../../frontend/design-tokens/tokens.json).
3. Verificar contraste WCAG AA (texto sobre `--primary-foreground`, links, botões).
4. Testar toggle light/dark no Header.
5. Rodar `npm run validate:tokens` no frontend (paridade CSS ↔ JSON + lint de cores literais).

Paleta rural de referência (modo claro): primária verde pastagem `152 42% 36%`; fundo off-white `40 18% 97%`.

---

**Última atualização**: 2026-05-30
