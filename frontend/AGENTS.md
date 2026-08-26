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
- **Design tokens**: [`docs/design-system/tokens.md`](../docs/design-system/tokens.md) — cores semânticas (`feedback-*`, `surface-*`); runtime em `src/app/globals.css`; JSON em `design-tokens/tokens.json`; regra Cursor [`.cursor/rules/design-tokens.mdc`](../.cursor/rules/design-tokens.mdc); validar com `npm run validate:tokens`
- **A11y**: assumir zoom do navegador e fonte ampliada — reflow sem cortar informação essencial ([`memory-bank/patterns/ui.md`](../memory-bank/patterns/ui.md))
- **Regra Cursor**: [`.cursor/rules/frontend-ui-patterns.mdc`](../.cursor/rules/frontend-ui-patterns.mdc) — ativa ao editar ficheiros em `frontend/src/`

## Checklist UI (antes de PR)

Ao criar ou alterar página, listagem ou formulário. Caminhos abaixo são relativos a `frontend/src/`. Roteiro de execução: skill `nova-pagina-ui`.

1. **Data**: `DatePicker` / `DatePickerUnificado` (input `DD/MM/AAAA` + calendário; não `Input type="date"`); data+hora → `DateTimePickerUnificado` / alias `DateTimePickerPtBr` (input data + selects inline hora/minuto).
2. **Animal**: `AnimalSelect` — operacional (`useAnimaisOperacionalList`, em `components/gestao/useAnimaisMap.ts`) ou **`cicloContext`** em forms de ciclo (`useAnimaisCicloContext`).
3. **Erros e sucesso**: validação client → `FormFieldError` no campo + `FormValidationAlert` no topo do form (`isValidation` quando aplicável); API → `getApiErrorMessage` + `getApiErrorConformidadeCode`; sucesso → `toast.success` / `toast.info` / `toast.warning` via `hooks/use-toast.ts` (`useToast()` ou `toast`); ver [`docs/design-system/form-patterns.md`](../docs/design-system/form-patterns.md).
4. **Listagem com ações**: `ResponsiveListContainer`, `MobileListCard`, `ListRowActionsMenu`, `DeleteRecordDialog`, `QueryListContent`, `ListPaginationBar`.
5. **Página fina**: extrair `*Table`, `*ListToolbar`, `*Dialog` para `components/<domínio>/`; lógica pesada em `hooks/use*Page.ts`.
6. **Filtros de listagem**: `useFilterSync` + params URL (`lib/filter-url.ts`); período `start`/`end` na URL via `parseYmdParam` / `serializeYmdParam` (cada data válida independente); filtro efetivo da lista/API com `parseDateRange` (par completo); UI → **`PeriodFilter`**; default 30 dias só server-side (`lib/period-filter.ts`); toolbar com `ResponsiveFiltersShell` (Dialog abaixo de `md`); título `(N de M)` via `formatListCountSuffix`.
7. **Fazenda ativa**: `useFazendaAtiva()` + `isReady` antes de pedir seleção de fazenda.
8. **DRY**: labels/maps em `services/*` ou `*-utils.ts` — não copiar entre páginas.

Referências: `/animais` (`AnimaisListToolbar`, `lib/animais-filter-sync.ts`); `/gestao/coberturas` e `/gestao/cios` (`GestaoPeriodListToolbar`); `/alertas` (`useAlertasPage`); `/producao` (`ProducaoListToolbar`); dialog com animal/data: `RestricoesLeiteHomePanel`.

## Comandos

```bash
npm run dev                   # :3000 (webpack, não Turbopack)
```

Gates de merge que o CI aplica ao frontend — rode todos antes do PR:

```bash
npm run test:unit             # Vitest
npm run typecheck             # tsc --noEmit
npm run lint:ci               # ESLint com cache (o CI usa este, não `lint`)
npm run validate:tokens       # paridade CSS↔JSON + cores literais proibidas
npm run build                 # job frontend-build
```

O CI roda também `npm audit --audit-level=high`. `npm run test:e2e` (Playwright) é validação **local**, não está no CI.

Detalhe: [`../memory-bank/systemPatterns.md`](../memory-bank/systemPatterns.md).
