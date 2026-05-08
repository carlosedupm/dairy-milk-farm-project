"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Subscribes to `window.matchMedia` (client-only) using `useSyncExternalStore`.
 * Initial render is `false` no SSR e durante a hidratação inicial.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (callback: () => void) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", callback);
      return () => m.removeEventListener("change", callback);
    },
    [query]
  );

  const getSnapshot = useCallback(
    () => window.matchMedia(query).matches,
    [query]
  );

  const getServerSnapshot = () => false;

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
