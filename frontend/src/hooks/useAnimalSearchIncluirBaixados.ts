"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "ceialmilk:animal-search-incluir-baixados";

const listeners = new Set<() => void>();

function readStoredIncluirBaixados(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeStoredIncluirBaixados(value: boolean): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  } catch {
    // ignore quota / private mode
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emitChange(): void {
  listeners.forEach((listener) => listener());
}

function getSnapshot(): boolean {
  return readStoredIncluirBaixados();
}

function getServerSnapshot(): boolean {
  return false;
}

/** Preferência «Incluir animais baixados» na busca global (persiste na sessão do browser). */
export function useAnimalSearchIncluirBaixados() {
  const incluirBaixados = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const setIncluirBaixados = useCallback((value: boolean) => {
    writeStoredIncluirBaixados(value);
    emitChange();
  }, []);

  return { incluirBaixados, setIncluirBaixados, hydrated: true };
}
