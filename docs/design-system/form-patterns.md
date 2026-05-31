# Padrões de formulário — CeialMilk

Contrato de validação, erros e feedback de sucesso no frontend. Complementa [tokens.md](tokens.md).

## Regras de negócio (UX)

| Situação | Onde exibir | Componente / API |
|----------|-------------|------------------|
| Erro de validação client | Inline no campo **e** resumo no topo | `FormFieldError` + `FormValidationAlert` (`isValidation`) |
| Erro de API (400/403/404) | Topo do formulário | `FormValidationAlert` + `getApiErrorMessage` |
| Sucesso após guardar | Toast canto superior direito | `toast.success` via [`useToast`](../../frontend/src/hooks/use-toast.ts) |
| Info / aviso transiente | Toast com cor semântica | `toast.info` / `toast.warning` |
| Erro em ação rápida (ex.: excluir linha) | Toast | `toast.error` (diálogo permanece aberto quando aplicável) |

Estados de página («ID inválido», «registro não encontrado») podem usar texto simples; **formulários de domínio** devem seguir a tabela acima.

## Componentes

### `FormValidationAlert`

Arquivo: [`frontend/src/components/ui/form-validation-alert.tsx`](../../frontend/src/components/ui/form-validation-alert.tsx)

- Posição: **topo** do `<form>` ou `CardContent`, antes dos campos.
- A11y: `role="alert"`, `aria-live="polite"`.
- Comportamento: `scrollIntoView` quando a mensagem aparece.
- Títulos: «Verifique os campos» (validação) vs «Não foi possível guardar» (API).
- Códigos TMP/INT: prop `conformidadeCode` ou `parsePrefixedConformidadeMessage`.

### `FormFieldError` e `FormField`

- [`form-field-error.tsx`](../../frontend/src/components/ui/form-field-error.tsx): mensagem inline; `role="alert"`, `aria-live="polite"`.
- [`form-field.tsx`](../../frontend/src/components/ui/form-field.tsx): label + controlo + erro; define `aria-invalid` e `aria-describedby`.

### Validação client

Funções em [`frontend/src/lib/form-validation.ts`](../../frontend/src/lib/form-validation.ts). Retorno:

```typescript
{ valid: boolean; fields: FieldErrors; summary?: string }
```

Fluxo típico no submit:

1. `clearErrors()`
2. `const v = validateXForm(...)`
3. Se `!v.valid` → `setFieldErrors(v.fields)`, `setError(v.summary)`, `setIsValidationError(true)`, return
4. Chamar API; em catch → `getApiErrorMessage` + `setIsValidationError(false)`

### Gestão pecuária

[`GestaoFormLayout`](../../frontend/src/components/gestao/GestaoFormLayout.tsx) centraliza alerta + `FormFieldErrorsProvider` para `*FormFields`.

## Toast

### API

[`frontend/src/hooks/use-toast.ts`](../../frontend/src/hooks/use-toast.ts):

```typescript
import { toast } from "@/hooks/use-toast";
// ou dentro de componente:
import { useToast } from "@/hooks/use-toast";
const toast = useToast();

toast.success("Animal criado");
toast.error("Não foi possível excluir", "Registro em uso.");
toast.info("…");
toast.warning("…");
```

### Infraestrutura e a11y

- Provider: [`Toaster`](../../frontend/src/components/ui/sonner.tsx) em [`Providers`](../../frontend/src/components/layout/Providers.tsx).
- Posição: `top-right`; variantes com `richColors`.
- **Contrato a11y (Sonner):** região live no container (`aria-live="polite"`, `aria-relevant="additions text"`, `aria-atomic="false"`). Toasts individuais usam `role="status"` (sucesso/info) ou equivalente destrutivo da biblioteca — adequado para feedback não bloqueante.
- Erros **persistentes** em formulários longos continuam em `FormValidationAlert`, não em toast.

Documentação técnica adicional: [`frontend/src/components/ui/toast.tsx`](../../frontend/src/components/ui/toast.tsx).

## Erros de API

[`frontend/src/lib/errors.ts`](../../frontend/src/lib/errors.ts):

- `getApiErrorMessage(err, fallback)`
- `getApiErrorConformidadeCode(err)`
- `parsePrefixedConformidadeMessage(message)`

## Proibido em forms de domínio

- `<p className="text-destructive">` como único feedback de validação ou erro de API
- Redirect silencioso após sucesso (usar `toast.success`)
- `confirm()` / `alert()` nativos

## Referências de implementação

| Caso | Ficheiro |
|------|----------|
| Form completo | [`AnimalForm`](../../frontend/src/components/animais/AnimalForm.tsx) |
| Página + mutation | [`animais/novo/page.tsx`](../../frontend/src/app/animais/novo/page.tsx) |
| Gestão | [`gestao/coberturas/novo/page.tsx`](../../frontend/src/app/gestao/coberturas/novo/page.tsx) |
| Dialog | [`CriarAlertaDialog`](../../frontend/src/components/alertas/CriarAlertaDialog.tsx) |
| Exclusão em lista | [`DeleteRecordDialog`](../../frontend/src/components/layout/list/DeleteRecordDialog.tsx) |

Checklist PR: [`frontend/AGENTS.md`](../../frontend/AGENTS.md). Regra Cursor: [`.cursor/rules/frontend-ui-patterns.mdc`](../../.cursor/rules/frontend-ui-patterns.mdc).

**Última atualização**: 2026-05-31
