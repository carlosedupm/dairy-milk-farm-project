# Frontend — CeialMilk

Instruções específicas do app Next.js. Contexto global: [`../AGENTS.md`](../AGENTS.md).

## Stack

Next.js 16 (App Router), React 19, TypeScript strict, Tailwind, Shadcn/UI, TanStack Query, Axios.

## Estrutura

```
frontend/src/
├── app/          # App Router (pages, layouts)
├── components/   # UI reutilizável
├── contexts/
├── hooks/
├── services/     # Chamadas API
└── lib/
```

## Convenções

- Componentes funcionais com TypeScript strict
- Estado servidor: TanStack Query; chamadas API via `services/`
- Estilo: Tailwind + Shadcn; `tailwind.config.ts` deve incluir pastas com `className` (ex.: `contexts/`)
- **A11y**: assumir zoom do navegador e fonte ampliada — reflow sem cortar informação essencial (`systemPatterns.md`)

## Comandos

```bash
npm run dev                   # :3000
npm run lint
npx tsc --noEmit
npm run test:e2e              # Playwright
```

Detalhe: [`../memory-bank/systemPatterns.md`](../memory-bank/systemPatterns.md).
