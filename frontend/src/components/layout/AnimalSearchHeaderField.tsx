"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Search } from "lucide-react";
import { AnimalSearchPanel } from "@/components/animais/AnimalSearchPanel";
import {
  ANIMAL_SEARCH_DIALOG_CONTENT_CLASS,
  ANIMAL_SEARCH_POPOVER_CONTENT_CLASS,
} from "@/components/animais/animalSearchOverlay";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { useAnimalSearchDialog } from "@/contexts/AnimalSearchDialogContext";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";

type AnimalSearchHeaderFieldProps = {
  /** Mobile: ocupa espaço flexível na barra */
  compact?: boolean;
};

export function AnimalSearchHeaderField({
  compact = false,
}: AnimalSearchHeaderFieldProps) {
  const searchCtx = useAnimalSearchDialog();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [identificacao, setIdentificacao] = useState("");
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const resetSearch = useCallback(() => {
    setIdentificacao("");
    setPopoverOpen(false);
    setDialogOpen(false);
  }, []);

  const closeOverlays = useCallback(() => {
    setPopoverOpen(false);
    setDialogOpen(false);
  }, []);

  const openSearch = useCallback(() => {
    inputRef.current?.focus();
    if (isDesktop) {
      setPopoverOpen(true);
    } else {
      setDialogOpen(true);
    }
  }, [isDesktop]);

  useEffect(() => {
    if (!searchCtx) return;
    searchCtx.registerSearchField({ openSearch });
    return () => searchCtx.registerSearchField(null);
  }, [searchCtx, openSearch]);

  const handleInputFocus = useCallback(() => {
    if (isDesktop) {
      setPopoverOpen(true);
      return;
    }
    setDialogOpen(true);
    inputRef.current?.blur();
  }, [isDesktop]);

  const handleInputChange = useCallback(
    (value: string) => {
      setIdentificacao(value);
      if (value.trim().length > 0) {
        if (isDesktop) {
          setPopoverOpen(true);
        } else {
          setDialogOpen(true);
        }
      }
    },
    [isDesktop],
  );

  function handleSubmitRapido(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isDesktop) {
      setPopoverOpen(true);
    } else {
      setDialogOpen(true);
    }
  }

  const inputClassName = cn(
    "min-h-[44px] min-w-0 pl-9 text-base",
    compact
      ? "flex-1 w-full max-w-none"
      : "w-[min(12rem,22vw)] max-w-[14rem] shrink-0",
  );

  const inputField = (
    <form onSubmit={handleSubmitRapido} className={cn("relative min-w-0", compact && "flex-1")}>
      <Search
        className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        ref={inputRef}
        id={inputId}
        value={identificacao}
        onChange={(event) => handleInputChange(event.target.value)}
        onFocus={handleInputFocus}
        placeholder="Brinco ou nome"
        aria-label="Pesquisar animal por identificação"
        className={inputClassName}
        autoComplete="off"
      />
    </form>
  );

  if (isDesktop) {
    return (
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverAnchor asChild>{inputField}</PopoverAnchor>
        <PopoverContent
          align="end"
          side="bottom"
          sideOffset={8}
          collisionPadding={16}
          className={ANIMAL_SEARCH_POPOVER_CONTENT_CLASS}
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          {popoverOpen ? (
            <AnimalSearchPanel
              variant="header"
              hideInput
              identificacao={identificacao}
              onIdentificacaoChange={setIdentificacao}
              onAntesNavegarDetalhe={resetSearch}
            />
          ) : null}
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <>
      {inputField}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className={ANIMAL_SEARCH_DIALOG_CONTENT_CLASS}
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <DialogHeader className="shrink-0 space-y-2 pr-8 text-left">
            <DialogTitle>Buscar por identificação</DialogTitle>
            <DialogDescription>
              Brinco, número ou nome — resultados ao parar de digitar; resumo e
              opção de abrir a ficha do animal.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden pb-1">
            {dialogOpen ? (
              <AnimalSearchPanel
                variant="header"
                autoFocus
                identificacao={identificacao}
                onIdentificacaoChange={setIdentificacao}
                onAntesNavegarDetalhe={resetSearch}
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
