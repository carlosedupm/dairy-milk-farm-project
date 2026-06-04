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

const MIN_HEADER_SEARCH_PANEL_CHARS = 2;

export function useAdaptiveSearch() {
  const searchCtx = useAnimalSearchDialog();
  const pathname = usePathname();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const isHome = pathname === "/";
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [identificacao, setIdentificacao] = useState("");
  const [panelActive, setPanelActive] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  /** Evita reabrir popover/dialog quando o foco volta ao input após fechar (Radix onCloseAutoFocus). */
  const skipOpenOnFocusRef = useRef(false);

  const activateSearchPanel = useCallback(() => {
    setPanelActive(true);
    if (isDesktop) {
      setPopoverOpen(true);
      return;
    }
    setDialogOpen(true);
    inputRef.current?.blur();
  }, [isDesktop]);

  const deactivateSearchPanel = useCallback(() => {
    setPanelActive(false);
    setIdentificacao("");
    skipOpenOnFocusRef.current = true;
    setPopoverOpen(false);
    setDialogOpen(false);
  }, []);

  const resetSearch = useCallback(() => {
    deactivateSearchPanel();
  }, [deactivateSearchPanel]);

  const closeOverlays = useCallback(() => {
    deactivateSearchPanel();
  }, [deactivateSearchPanel]);

  const handlePopoverOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        deactivateSearchPanel();
        return;
      }
      setPopoverOpen(true);
    },
    [deactivateSearchPanel],
  );

  const handleDialogOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        deactivateSearchPanel();
        return;
      }
      setDialogOpen(true);
    },
    [deactivateSearchPanel],
  );

  const returnFocusToSearchInput = useCallback(() => {
    skipOpenOnFocusRef.current = true;
    inputRef.current?.focus();
  }, []);

  const openSearch = useCallback(() => {
    inputRef.current?.focus();
    activateSearchPanel();
  }, [activateSearchPanel]);

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
    activateSearchPanel();
  }, [activateSearchPanel]);

  const handleInputClick = useCallback(() => {
    if (panelActive) {
      return;
    }
    skipOpenOnFocusRef.current = false;
    activateSearchPanel();
  }, [panelActive, activateSearchPanel]);

  const handleInputChange = useCallback(
    (value: string) => {
      setIdentificacao(value);
      if (
        !panelActive &&
        value.trim().length >= MIN_HEADER_SEARCH_PANEL_CHARS
      ) {
        activateSearchPanel();
      }
    },
    [panelActive, activateSearchPanel],
  );

  const handleSubmitRapido = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      activateSearchPanel();
    },
    [activateSearchPanel],
  );

  return {
    identificacao,
    setIdentificacao,
    panelActive,
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
