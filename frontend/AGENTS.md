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
- **Regra Cursor**: [`.cursor/rules/frontend-ui-patterns.mdc`](../.cursor/rules/frontend-ui-patterns.mdc) — ativa ao editar ficheiros em `frontend/src/`

## Checklist UI (antes de PR)

Ao criar ou alterar página, listagem ou formulário:

1. **Data**: `DatePicker` (não `Input type="date"`); data+hora → `DateTimePickerPtBr`.
2. **Animal**: `AnimalSelect` — operacional (`useAnimaisOperacionalList`) ou **`cicloContext`** em forms de ciclo (`useAnimaisCicloContext`).
3. **Erros**: `FormValidationAlert` + `getApiErrorMessage` (não `<p className="text-destructive">`).
4. **Listagem com ações**: `ResponsiveListContainer`, `MobileListCard`, `ListRowActionsMenu`, `DeleteRecordDialog`, `QueryListContent`, `ListPaginationBar`.
5. **Página fina**: extrair `*Table`, `*ListToolbar`, `*Dialog` para `components/<domínio>/`; lógica pesada em `hooks/use*Page.ts`.
6. **Fazenda ativa**: `useFazendaAtiva()` + `isReady` antes de pedir seleção de fazenda.
7. **DRY**: labels/maps em `services/*` ou `*-utils.ts` — não copiar entre páginas.

Referências: `/animais` (`AnimalTable`, `AnimaisListToolbar`); `/gestao/coberturas` (`CoberturaTable`, `CoberturasListToolbar`); `/alertas` (`AlertasTable`, `AlertasListToolbar`, `useAlertasPage`); dialog com animal/data: `RestricoesLeiteHomePanel`.

## Comandos

```bash
npm run dev                   # :3000
npm run lint
npx tsc --noEmit
npm run test:e2e              # Playwright
```

Detalhe: [`../memory-bank/systemPatterns.md`](../memory-bank/systemPatterns.md).
