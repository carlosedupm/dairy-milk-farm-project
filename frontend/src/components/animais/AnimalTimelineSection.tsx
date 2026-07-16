"use client";

import { useEffect, useMemo, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { getApiErrorMessage } from "@/lib/errors";
import {
  TIMELINE_PAGE_SIZE,
  animalTimelineQueryKey,
  getTimeline,
  type TimelineFilterTipo,
} from "@/services/animais";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AnimalTimelineList,
  TimelineSkeletonRows,
} from "@/components/animais/AnimalTimelineList";

const FILTER_OPTIONS: { value: TimelineFilterTipo; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "saude", label: "Saúde" },
  { value: "vacinas", label: "Vacinas" },
  { value: "hormonio_lactacao", label: "Hormônio" },
  { value: "alertas", label: "Alertas" },
];

type Props = {
  animalId: number;
  tipoFilter: TimelineFilterTipo;
  onTipoFilterChange: (tipo: TimelineFilterTipo) => void;
};

export function AnimalTimelineSection({
  animalId,
  tipoFilter,
  onTipoFilterChange,
}: Props) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useInfiniteQuery({
    queryKey: animalTimelineQueryKey(animalId, tipoFilter),
    queryFn: ({ pageParam }) =>
      getTimeline(animalId, {
        limit: TIMELINE_PAGE_SIZE,
        offset: pageParam,
        tipo: tipoFilter,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce(
        (sum, page) => sum + page.timeline.length,
        0,
      );
      return loaded < lastPage.total ? loaded : undefined;
    },
  });

  const items = useMemo(
    () => data?.pages.flatMap((page) => page.timeline) ?? [],
    [data?.pages],
  );
  const total = data?.pages[0]?.total ?? 0;
  const allLoaded = !hasNextPage && items.length > 0;

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasNextPage || isFetchingNextPage) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void fetchNextPage();
        }
      },
      { root: null, rootMargin: "200px", threshold: 0 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, items.length, tipoFilter]);

  function handleFilterChange(next: TimelineFilterTipo) {
    if (next === tipoFilter) {
      return;
    }
    onTipoFilterChange(next);
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <Card ref={sectionRef}>
      <CardHeader className="pb-2 space-y-3">
        <CardTitle className="text-base">Histórico</CardTitle>
        <p className="text-sm text-muted-foreground">
          Eventos de saúde, vacinas, alertas e baixa. O ciclo reprodutivo está
          na tab <strong className="font-medium text-foreground">Ciclo</strong>.
        </p>
        <div
          className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory"
          role="tablist"
          aria-label="Filtrar histórico"
        >
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="tab"
              aria-selected={tipoFilter === opt.value}
              className={cn(
                "shrink-0 snap-start rounded-full border px-4 py-2 text-sm font-medium min-h-11 transition-colors",
                tipoFilter === opt.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:bg-muted",
              )}
              onClick={() => handleFilterChange(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <TimelineSkeletonRows />
        ) : isError ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm space-y-2">
            <p>{getApiErrorMessage(error, "Erro ao carregar histórico")}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
              Tentar novamente
            </Button>
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground" role="status">
            Nenhum evento neste filtro
          </p>
        ) : (
          <>
            <AnimalTimelineList
              items={items}
              animalId={animalId}
            />

            <div ref={sentinelRef} className="h-1" aria-hidden />

            {isFetchingNextPage ? (
              <p
                className="flex items-center justify-center gap-2 text-sm text-muted-foreground pt-4"
                role="status"
                aria-live="polite"
              >
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Carregando…
              </p>
            ) : null}

            {allLoaded ? (
              <p className="text-sm text-muted-foreground text-center pt-4" role="status">
                Todos os eventos carregados
                {total > 0 ? ` (${total})` : null}
              </p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
