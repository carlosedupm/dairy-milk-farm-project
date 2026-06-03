"use client";

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
import {
  HEADER_SEARCH_DIALOG_ID,
  HEADER_SEARCH_POPOVER_ID,
} from "@/components/layout/headerSearchIds";
import { useAdaptiveSearch } from "@/hooks/useAdaptiveSearch";
import { cn } from "@/lib/utils";

type HeaderBuscaTriggerProps = {
  compact?: boolean;
};

export function HeaderBuscaTrigger({ compact = false }: HeaderBuscaTriggerProps) {
  const {
    identificacao,
    setIdentificacao,
    popoverOpen,
    setPopoverOpen,
    dialogOpen,
    setDialogOpen,
    isDesktop,
    isHome,
    inputId,
    inputRef,
    resetSearch,
    handleInputFocus,
    handleInputClick,
    handleInputChange,
    handleSubmitRapido,
    returnFocusToSearchInput,
  } = useAdaptiveSearch();

  const searchOpen = popoverOpen || dialogOpen;
  const searchPanelId = isDesktop ? HEADER_SEARCH_POPOVER_ID : HEADER_SEARCH_DIALOG_ID;

  const inputClassName = cn(
    "min-h-[44px] min-w-0 pl-9 text-base",
    compact
      ? "flex-1 w-full max-w-none"
      : "w-[min(12rem,22vw)] max-w-[14rem] shrink-0",
  );

  const inputField = (
    <form
      onSubmit={handleSubmitRapido}
      className={cn("relative min-w-0", compact && "flex-1")}
      {...(isHome && isDesktop ? { id: "tour-step-busca" } : {})}
    >
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
        onClick={handleInputClick}
        placeholder="Brinco ou nome"
        aria-label="Pesquisar animal por brinco ou nome"
        aria-haspopup="dialog"
        aria-expanded={searchOpen}
        aria-controls={searchPanelId}
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
          id={HEADER_SEARCH_POPOVER_ID}
          align="end"
          side="bottom"
          sideOffset={8}
          collisionPadding={16}
          className={ANIMAL_SEARCH_POPOVER_CONTENT_CLASS}
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocusToSearchInput();
          }}
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
          id={HEADER_SEARCH_DIALOG_ID}
          className={ANIMAL_SEARCH_DIALOG_CONTENT_CLASS}
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocusToSearchInput();
          }}
        >
          <DialogHeader className="shrink-0 space-y-2 pr-8 text-left">
            <DialogTitle>Buscar animal</DialogTitle>
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
