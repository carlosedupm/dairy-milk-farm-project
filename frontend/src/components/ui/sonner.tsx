"use client";

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
