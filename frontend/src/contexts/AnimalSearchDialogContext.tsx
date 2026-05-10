"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AnimalSearchPanel } from "@/components/animais/AnimalSearchPanel";

type Ctx = {
  openDialog: () => void;
};

const AnimalSearchDialogContext = createContext<Ctx | null>(null);

export function useAnimalSearchDialog(): Ctx | null {
  return useContext(AnimalSearchDialogContext);
}

export function AnimalSearchDialogProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const openDialog = useCallback(() => setOpen(true), []);

  const value = useMemo(() => ({ openDialog }), [openDialog]);

  return (
    <AnimalSearchDialogContext.Provider value={value}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[min(90dvh,36rem)] w-[min(100vw-1.5rem,28rem)] max-w-[min(100vw-1.5rem,28rem)] flex-col gap-4 overflow-y-auto overflow-x-hidden">
          <DialogHeader className="shrink-0 space-y-2 text-left">
            <DialogTitle>Buscar por identificação</DialogTitle>
            <DialogDescription>
              Brinco, número ou nome — resultados ao parar de digitar; resumo e
              opção de abrir a ficha do animal.
            </DialogDescription>
          </DialogHeader>
          {open ? (
            <AnimalSearchPanel
              autoFocus
              onAntesNavegarDetalhe={() => setOpen(false)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </AnimalSearchDialogContext.Provider>
  );
}
