"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Pagination = ({ className, ...props }: React.ComponentProps<"nav">) => (
  <nav
    role="navigation"
    aria-label="Paginação"
    className={cn("mx-auto flex w-full justify-center", className)}
    {...props}
  />
);

const PaginationContent = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn("flex flex-row items-center gap-1", className)}
    {...props}
  />
));
PaginationContent.displayName = "PaginationContent";

const PaginationItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ className, ...props }, ref) => (
  <li ref={ref} className={cn("", className)} {...props} />
));
PaginationItem.displayName = "PaginationItem";

export type ListPaginationBarProps = {
  /** Total de registros após filtros */
  total: number;
  /** Tamanho da página (limit) */
  pageSize: number;
  /** Offset atual (0-based) */
  offset: number;
  /** Chamado quando o usuário navega entre páginas */
  onOffsetChange: (nextOffset: number) => void;
  /** Opções de tamanho de página; se omitido, não exibe o seletor */
  pageSizeOptions?: number[];
  /** Chamado quando o tamanho da página muda (novo offset será 0 na página) */
  onPageSizeChange?: (nextSize: number) => void;
  className?: string;
};

/**
 * Barra de paginação para listagens com API offset/limit.
 * Botões e área de toque alinhados ao restante do app (min 44px).
 */
export function ListPaginationBar({
  total,
  pageSize,
  offset,
  onOffsetChange,
  pageSizeOptions,
  onPageSizeChange,
  className,
}: ListPaginationBarProps) {
  const safePageSize = Math.max(1, pageSize);
  const pageCount = Math.max(1, Math.ceil(total / safePageSize));
  const currentPage = Math.min(
    pageCount - 1,
    Math.floor(offset / safePageSize)
  );
  const from = total === 0 ? 0 : currentPage * safePageSize + 1;
  const to = Math.min(total, (currentPage + 1) * safePageSize);

  const goPrev = () => {
    const next = Math.max(0, offset - safePageSize);
    if (next !== offset) onOffsetChange(next);
  };

  const goNext = () => {
    const next = offset + safePageSize;
    if (next < total) onOffsetChange(next);
  };

  const disabledPrev = offset <= 0;
  const disabledNext = offset + safePageSize >= total || total === 0;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <p className="text-center text-sm text-muted-foreground sm:text-left">
        {total === 0
          ? "Nenhum registro."
          : `Mostrando ${from}–${to} de ${total}`}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
        {pageSizeOptions &&
          pageSizeOptions.length > 0 &&
          onPageSizeChange && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                Por página
              </span>
              <Select
                value={String(safePageSize)}
                onValueChange={(v) => onPageSizeChange(Number(v))}
              >
                <SelectTrigger className="h-11 min-h-[44px] w-[88px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pageSizeOptions.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        <Pagination className="mx-0 w-auto justify-end">
          <PaginationContent>
            <PaginationItem>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="min-h-[44px] min-w-[44px]"
                aria-label="Página anterior"
                disabled={disabledPrev}
                onClick={goPrev}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </PaginationItem>
            <PaginationItem>
              <span className="flex min-h-[44px] min-w-[44px] items-center justify-center px-2 text-sm tabular-nums">
                {total === 0 ? "0 / 0" : `${currentPage + 1} / ${pageCount}`}
              </span>
            </PaginationItem>
            <PaginationItem>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="min-h-[44px] min-w-[44px]"
                aria-label="Próxima página"
                disabled={disabledNext}
                onClick={goNext}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}

export { Pagination, PaginationContent, PaginationItem };
