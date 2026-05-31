import { useMemo } from "react";
import { toast as sonnerToast } from "sonner";

export type ToastApi = {
  success: (message: string, description?: string) => void;
  error: (message: string, description?: string) => void;
  info: (message: string, description?: string) => void;
  warning: (message: string, description?: string) => void;
};

const toastApi: ToastApi = {
  success: (message: string, description?: string) =>
    sonnerToast.success(message, description ? { description } : undefined),
  error: (message: string, description?: string) =>
    sonnerToast.error(message, description ? { description } : undefined),
  info: (message: string, description?: string) =>
    sonnerToast.info(message, description ? { description } : undefined),
  warning: (message: string, description?: string) =>
    sonnerToast.warning(message, description ? { description } : undefined),
};

/** API imperativa — use em mutations, services e páginas finas. */
export const toast = toastApi;

/** Hook React que expõe a mesma API (variantes success / error / info / warning). */
export function useToast(): ToastApi {
  return useMemo(() => toastApi, []);
}
