"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

type AssistenteContextValue = {
  assistenteOpen: boolean;
  setAssistenteOpen: (open: boolean) => void;
  openAssistente: () => void;
  closeAssistente: () => void;
};

const AssistenteContext = createContext<AssistenteContextValue | null>(null);

export function AssistenteProvider({ children }: { children: ReactNode }) {
  const [assistenteOpen, setAssistenteOpen] = useState(false);
  const openAssistente = useCallback(() => setAssistenteOpen(true), []);
  const closeAssistente = useCallback(() => setAssistenteOpen(false), []);

  return (
    <AssistenteContext.Provider
      value={{
        assistenteOpen,
        setAssistenteOpen,
        openAssistente,
        closeAssistente,
      }}
    >
      {children}
    </AssistenteContext.Provider>
  );
}

export function useAssistente(): AssistenteContextValue {
  const ctx = useContext(AssistenteContext);
  if (!ctx) {
    throw new Error("useAssistente must be used within AssistenteProvider");
  }
  return ctx;
}
