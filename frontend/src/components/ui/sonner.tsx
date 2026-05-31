"use client";

/**
 * Provider global de toasts (Sonner).
 * Contrato a11y: região live no container (`aria-live="polite"`).
 * @see docs/design-system/form-patterns.md
 * @see components/ui/toast.tsx
 */
import { useTheme } from "@/contexts/ThemeContext";
import { Toaster as Sonner } from "sonner";

export function Toaster() {
  const { theme } = useTheme();

  return (
    <Sonner
      theme={theme}
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: "font-sans",
        },
      }}
    />
  );
}
