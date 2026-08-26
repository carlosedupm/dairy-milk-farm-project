---
applyTo: "frontend/src/**/*.{ts,tsx,jsx,js},frontend/src/app/globals.css,frontend/tailwind.config.ts,frontend/design-tokens/**"
---

# Design tokens — CeialMilk (Copilot)

Fonte: `docs/design-system/tokens.md`. Validar: `npm run validate:tokens`.

- Preferir classes semânticas (`text-feedback-warning`, `bg-feedback-success/10`, `surface-*`).
- Não usar literais de cor Tailwind de feedback (`text-amber-*`, `bg-green-*`, etc.) em UI de produto.
- Runtime em `frontend/src/app/globals.css`; JSON em `frontend/design-tokens/tokens.json`.
