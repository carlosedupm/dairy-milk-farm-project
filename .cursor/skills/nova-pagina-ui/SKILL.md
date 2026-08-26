---
name: nova-pagina-ui
description: Cria ou altera página, listagem, formulário ou dialog no frontend Next.js do CeialMilk usando os componentes obrigatórios do design system. Use ao adicionar tela, tabela com ações, filtro de período, seleção de animal, campo de data, ou ao refatorar uma página que ficou grande demais.
---

# Nova página / listagem / formulário — frontend

O checklist canônico de 8 itens está em [`frontend/AGENTS.md`](../../../frontend/AGENTS.md) e a regra `frontend-ui-patterns.mdc` carrega automaticamente ao editar `frontend/src/`. Esta skill é o roteiro de execução.

## Regra de ouro

Antes de criar um componente, **procure o existente**. Este projeto tem componentes prontos para praticamente todo padrão de tela, e duplicá-los é o erro mais comum:

```bash
rg -l "ResponsiveListContainer|PeriodFilter|AnimalSelect" frontend/src/app
```

Use uma página existente como referência viva: `/animais`, `/gestao/coberturas`, `/producao`, `/alertas`.

## Componentes obrigatórios

Nunca use o primitivo do HTML quando existe o componente do projeto.

| Precisa de | Use | Nunca use |
|------------|-----|-----------|
| Data | `DatePicker` / `DatePickerUnificado` (`DD/MM/AAAA` + calendário) | `<Input type="date">` |
| Data + hora | `DateTimePickerUnificado` (alias `DateTimePickerPtBr`) | dois campos soltos |
| Escolher animal | `AnimalSelect` — `useAnimaisOperacionalList` (operacional) ou `useAnimaisCicloContext` (forms de ciclo) | `<select>` de animais |
| Litros | `LitrosInput` | input numérico cru |
| Erro de validação | `FormFieldError` no campo **+** `FormValidationAlert` no topo | `alert()`, texto solto |
| Erro de API | `getApiErrorMessage` + `getApiErrorConformidadeCode` (`src/lib/errors.ts`) | `err.message` |
| Sucesso | `toast.success` / `toast.info` / `toast.warning` (`src/hooks/use-toast.ts`) | banner improvisado |
| Lista com ações | `ResponsiveListContainer`, `MobileListCard`, `ListRowActionsMenu`, `DeleteRecordDialog`, `QueryListContent`, `ListPaginationBar` | `<table>` cru |
| Filtro de período | `PeriodFilter` + `useFilterSync` + `src/lib/filter-url.ts` | estado local sem URL |
| Toolbar responsiva | `ResponsiveFiltersShell` (vira Dialog abaixo de `md`) | media query manual |
| Contagem no título | `formatListCountSuffix` → `(N de M)` | string concatenada |
| Estado vazio | `EmptyState` | `<p>Nenhum registro</p>` |

`useAnimaisOperacionalList` vive em `src/components/gestao/useAnimaisMap.ts`, não em `src/hooks/`.

## Filtros na URL

Período vai para a URL como `start`/`end` via `parseYmdParam` / `serializeYmdParam` — cada data é válida independentemente. O filtro **efetivo** da lista usa `parseDateRange`, que exige o par completo. O default de 30 dias é aplicado **só no server-side** (`src/lib/period-filter.ts`).

## Página fina

`page.tsx` orquestra; não implementa. Extraia para `src/components/<domínio>/`: `*Table`, `*ListToolbar`, `*Dialog`. Lógica pesada vai para `src/hooks/use<Dominio>Page.ts` — referências: `useAlertasPage`, `useFolgasPage`.

## Fazenda ativa

`useFazendaAtiva()` (de `src/contexts/FazendaContext.tsx`) e **sempre** aguarde `isReady` antes de pedir seleção de fazenda, senão a UI pisca pedindo fazenda que já está escolhida.

## Cores

Só tokens semânticos (`feedback-*`, `surface-*`) — ver `docs/design-system/tokens.md`. Cor literal (`#hex`, `text-red-500`) é barrada pelo CI em `npm run validate:tokens`.

## Acessibilidade

Assuma navegador com zoom e fonte ampliada: o layout precisa refluir sem cortar informação essencial. Detalhe em `memory-bank/patterns/ui.md`.

## DRY

Labels, mapas de status e formatadores vão para `src/services/*` ou `*-utils.ts`. Não copie entre páginas.

## Validar

```bash
cd frontend && npm run test:unit && npm run typecheck && npm run lint:ci && npm run validate:tokens
```

Se `tailwind.config.ts` não cobrir a pasta onde você usou `className` (ex.: `contexts/`), o estilo é removido no build — confira o `content`.

Ao terminar, use a skill `atualizar-documentacao`.
