"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { usePathname } from "next/navigation";
import { useAnimalSearchDialog } from "@/contexts/AnimalSearchDialogContext";
import { useMediaQuery } from "@/hooks/useMediaQuery";

export function useAdaptiveSearch() {
  const searchCtx = useAnimalSearchDialog();
  const pathname = usePathname();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const isHome = pathname === "/";
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [identificacao, setIdentificacao] = useState("");
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  /** Evita reabrir popover/dialog quando o foco volta ao input após fechar (Radix onCloseAutoFocus). */
  const skipOpenOnFocusRef = useRef(false);

  const resetSearch = useCallback(() => {
    setIdentificacao("");
    skipOpenOnFocusRef.current = true;
    setPopoverOpen(false);
    setDialogOpen(false);
  }, []);

  const closeOverlays = useCallback(() => {
    skipOpenOnFocusRef.current = true;
    setPopoverOpen(false);
    setDialogOpen(false);
  }, []);

  const handlePopoverOpenChange = useCallback((open: boolean) => {
    if (!open) {
      skipOpenOnFocusRef.current = true;
    }
    setPopoverOpen(open);
  }, []);

  const handleDialogOpenChange = useCallback((open: boolean) => {
    if (!open) {
      skipOpenOnFocusRef.current = true;
    }
    setDialogOpen(open);
  }, []);

  const returnFocusToSearchInput = useCallback(() => {
    skipOpenOnFocusRef.current = true;
    inputRef.current?.focus();
  }, []);

  const openSearchOverlay = useCallback(() => {
    if (isDesktop) {
      setPopoverOpen(true);
      return;
    }
    setDialogOpen(true);
    inputRef.current?.blur();
  }, [isDesktop]);

  const openSearch = useCallback(() => {
    inputRef.current?.focus();
    openSearchOverlay();
  }, [openSearchOverlay]);

  useEffect(() => {
    if (!searchCtx) return;
    searchCtx.registerSearchField({ openSearch });
    return () => searchCtx.registerSearchField(null);
  }, [searchCtx, openSearch]);

  const handleInputFocus = useCallback(() => {
    if (skipOpenOnFocusRef.current) {
      skipOpenOnFocusRef.current = false;
      return;
    }
    openSearchOverlay();
  }, [openSearchOverlay]);

  const handleInputClick = useCallback(() => {
    if (popoverOpen || dialogOpen) {
      return;
    }
    skipOpenOnFocusRef.current = false;
    openSearchOverlay();
  }, [popoverOpen, dialogOpen, openSearchOverlay]);

  const handleInputChange = useCallback(
    (value: string) => {
      setIdentificacao(value);
      if (value.trim().length > 0) {
        openSearchOverlay();
      }
    },
    [openSearchOverlay],
  );

  const handleSubmitRapido = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      openSearchOverlay();
    },
    [openSearchOverlay],
  );

  return {
    identificacao,
    setIdentificacao,
    popoverOpen,
    setPopoverOpen: handlePopoverOpenChange,
    dialogOpen,
    setDialogOpen: handleDialogOpenChange,
    isDesktop,
    isHome,
    inputId,
    inputRef,
    resetSearch,
    closeOverlays,
    openSearch,
    returnFocusToSearchInput,
    handleInputFocus,
    handleInputClick,
    handleInputChange,
    handleSubmitRapido,
  };
}
