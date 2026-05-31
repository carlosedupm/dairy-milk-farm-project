/**
 * Toast — contrato CeialMilk sobre Sonner.
 *
 * **Uso:** preferir `toast` / `useToast` de `@/hooks/use-toast` para disparar mensagens.
 * Este ficheiro documenta a infraestrutura e reexporta o provider global.
 *
 * **Acessibilidade (Sonner):**
 * - Container: `aria-live="polite"`, `aria-relevant="additions text"`, `aria-atomic="false"`.
 * - Cada toast: `role="status"` (variantes neutras) ou tratamento destrutivo da lib.
 * - Botão fechar: `aria-label` localizado.
 *
 * **Quando usar toast vs FormValidationAlert:**
 * - Sucesso, info e avisos transientes → toast.
 * - Erros de validação ou API em formulário → FormValidationAlert (+ inline no campo).
 * - Erro rápido em diálogo de exclusão → toast.error (modal aberto).
 *
 * @see docs/design-system/form-patterns.md
 */
export { Toaster } from "@/components/ui/sonner";
