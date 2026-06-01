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

  const handleSubmitRapido = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (isDesktop) {
        setPopoverOpen(true);
      } else {
        setDialogOpen(true);
      }
    },
    [isDesktop],
  );

  return {
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
    closeOverlays,
    openSearch,
    handleInputFocus,
    handleInputChange,
    handleSubmitRapido,
  };
}
