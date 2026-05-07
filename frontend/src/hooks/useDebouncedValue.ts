"use client";

import { useEffect, useState } from "react";

/** Valor atualizado após `delayMs` sem novas mudanças (ex.: busca em lista). */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}
