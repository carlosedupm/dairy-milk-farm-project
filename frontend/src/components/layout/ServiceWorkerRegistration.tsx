"use client";

import { useEffect } from "react";

/**
 * Registra o service worker o mais cedo possível no app (no primeiro mount do client).
 * Necessário para o Chrome considerar o PWA instalável em produção (beforeinstallprompt).
 * Montado no Providers para rodar em toda a árvore assim que o JS hidrata.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        if (process.env.NODE_ENV === "development") {
          reg.update();
        }
      })
      .catch(() => {});
  }, []);
  return null;
}
