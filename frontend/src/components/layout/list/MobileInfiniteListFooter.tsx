"use client";

import type { RefObject } from "react";
import { Loader2 } from "lucide-react";
import { MobileInfiniteListSkeleton } from "@/components/layout/list/MobileInfiniteListSkeleton";

export type MobileInfiniteListFooterProps = {
  sentinelRef: RefObject<HTMLDivElement | null>;
  isFetchingNextPage: boolean;
  allLoaded: boolean;
  total: number;
  hasItems: boolean;
  endMessage?: string;
  className?: string;
};

export function MobileInfiniteListFooter({
  sentinelRef,
  isFetchingNextPage,
  allLoaded,
  total,
  hasItems,
  endMessage = "Todos os itens carregados",
  className,
}: MobileInfiniteListFooterProps) {
  if (!hasItems) {
    return null;
  }

  return (
    <div className={className}>
      {isFetchingNextPage ? <MobileInfiniteListSkeleton /> : null}

      {isFetchingNextPage ? (
        <p
          className="flex items-center justify-center gap-2 text-sm text-muted-foreground pt-4 md:hidden"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Carregando…
        </p>
      ) : null}

      {allLoaded ? (
        <p
          className="text-sm text-muted-foreground text-center pt-4 md:hidden"
          role="status"
        >
          {endMessage}
          {total > 0 ? ` (${total})` : null}
        </p>
      ) : null}

      <div ref={sentinelRef} className="h-1 md:hidden" aria-hidden />
    </div>
  );
}
