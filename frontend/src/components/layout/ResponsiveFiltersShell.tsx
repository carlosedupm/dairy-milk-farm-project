"use client";

import { useState, type ReactNode } from "react";
import { Filter } from "lucide-react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  children: ReactNode;
  hasActiveFilters: boolean;
  onClear: () => void;
  activeCount?: number;
  title?: string;
  description?: string;
  /** Conteúdo extra no rodapé mobile (ex.: contagem de resultados). */
  mobileFooterExtra?: ReactNode;
};

export function ResponsiveFiltersShell({
  children,
  hasActiveFilters,
  onClear,
  activeCount = 0,
  title = "Filtros",
  description = "Ajuste os critérios da listagem. Os resultados atualizam automaticamente.",
  mobileFooterExtra,
}: Props) {
  const isMd = useMediaQuery("(min-width: 768px)");
  const [open, setOpen] = useState(false);

  const clearButton = hasActiveFilters ? (
    <Button
      type="button"
      variant="outline"
      className="min-h-[44px]"
      onClick={onClear}
    >
      Limpar filtros
    </Button>
  ) : null;

  if (isMd) {
    return (
      <div className="space-y-4">
        {children}
        {clearButton ? (
          <div className="flex flex-wrap gap-2">{clearButton}</div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        className="min-h-[44px] w-full gap-2 sm:w-auto"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Filter className="h-4 w-4 shrink-0" aria-hidden />
        <span>{title}</span>
        {activeCount > 0 ? (
          <Badge variant="secondary" className="tabular-nums">
            {activeCount}
          </Badge>
        ) : null}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-4 sm:max-w-lg"
          aria-describedby="responsive-filters-desc"
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription id="responsive-filters-desc">
              {description}
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto py-2">{children}</div>
          {mobileFooterExtra ? (
            <div className="shrink-0 space-y-2 border-t border-border pt-2">
              {mobileFooterExtra}
            </div>
          ) : null}
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
            {clearButton}
            <Button
              type="button"
              className="min-h-[44px] w-full sm:w-auto"
              onClick={() => setOpen(false)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
