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
        <DialogContent
          className={
            // Evita centralização vertical (translate-y-1/2 do shadcn): com zoom alto o topo
            // do diálogo sairia da viewport. Cabeçalho fixo + corpo com min-h-0 e scroll interno.
            "left-1/2 top-[max(0.5rem,env(safe-area-inset-top,0px))] flex max-h-[min(90dvh,calc(100dvh-2rem))] w-[min(100vw-1.5rem,28rem)] max-w-[min(100vw-1.5rem,28rem)] -translate-x-1/2 translate-y-0 flex-col gap-0 overflow-hidden p-6 pt-6 sm:rounded-lg"
          }
        >
          <DialogHeader className="shrink-0 space-y-2 pr-8 text-left">
            <DialogTitle>Buscar por identificação</DialogTitle>
            <DialogDescription>
              Brinco, número ou nome — resultados ao parar de digitar; resumo e
              opção de abrir a ficha do animal.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden pb-1">
            {open ? (
              <AnimalSearchPanel
                autoFocus
                onAntesNavegarDetalhe={() => setOpen(false)}
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </AnimalSearchDialogContext.Provider>
  );
}
