"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useInfiniteQuery } from "@tanstack/react-query";
import { formatDateTimePtBr } from "@/lib/format";
import { getApiErrorMessage } from "@/lib/errors";
import {
  TIMELINE_PAGE_SIZE,
  animalTimelineQueryKey,
  getTimeline,
  type TimelineFilterTipo,
} from "@/services/animais";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, Loader2, Pill } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { canEditarRegistroSaude } from "@/config/appAccess";
import { cn } from "@/lib/utils";

const FILTER_OPTIONS: { value: TimelineFilterTipo; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "ciclo", label: "Ciclo" },
  { value: "saude", label: "Saúde" },
  { value: "alertas", label: "Alertas" },
];

type Props = {
  animalId: number;
};

function timelineTipoLabel(tipo: string): string {
  if (tipo === "SAUDE") return "Saúde";
  if (tipo === "ALERTA") return "Alerta";
  return tipo;
}

function TimelineSkeletonRows() {
  return (
    <ul className="space-y-3 min-w-0" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <li
          key={i}
          className="border-b border-border pb-3 last:border-0 last:pb-0 animate-pulse"
        >
          <div className="flex gap-2 mb-2">
            <div className="h-5 w-16 rounded bg-muted" />
            <div className="h-4 w-28 rounded bg-muted" />
          </div>
          <div className="h-4 w-3/4 max-w-xs rounded bg-muted" />
        </li>
      ))}
    </ul>
  );
}

export function AnimalTimelineSection({ animalId }: Props) {
  const { user } = useAuth();
  const canEditSaude = canEditarRegistroSaude(user?.perfil);
  const sectionRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [tipoFilter, setTipoFilter] = useState<TimelineFilterTipo>("todos");

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

  const items = data?.pages.flatMap((page) => page.timeline) ?? [];
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
    setTipoFilter(next);
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <Card ref={sectionRef}>
      <CardHeader className="pb-2 space-y-3">
        <CardTitle className="text-base">Histórico</CardTitle>
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
            <ul className="space-y-3 min-w-0">
              {items.map((item, idx) => {
                const isSaude = item.tipo === "SAUDE";
                const isAlerta = item.tipo === "ALERTA";
                const saudeEditHref =
                  isSaude && item.ref_id != null && canEditSaude
                    ? `/animais/${animalId}/saude/${item.ref_id}/editar`
                    : null;

                return (
                  <li
                    key={`${item.tipo}-${item.ref_id ?? idx}-${item.data}-${idx}`}
                    className="border-b border-border pb-3 last:border-0 last:pb-0 min-w-0"
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                      {isSaude ? (
                        <Pill
                          className="h-4 w-4 shrink-0 text-muted-foreground"
                          aria-hidden
                        />
                      ) : null}
                      {isAlerta ? (
                        <Bell
                          className="h-4 w-4 shrink-0 text-muted-foreground"
                          aria-hidden
                        />
                      ) : null}
                      <Badge variant="outline" className="shrink-0">
                        {timelineTipoLabel(item.tipo)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTimePtBr(item.data)}
                      </span>
                    </div>
                    {saudeEditHref ? (
                      <Link
                        href={saudeEditHref}
                        className="font-medium break-words hover:underline block py-0.5"
                      >
                        {item.titulo}
                      </Link>
                    ) : isAlerta ? (
                      <Link
                        href="/alertas"
                        className="font-medium break-words hover:underline block py-0.5"
                      >
                        {item.titulo}
                      </Link>
                    ) : (
                      <p className="font-medium break-words">{item.titulo}</p>
                    )}
                    {item.detalhe ? (
                      <p className="text-sm text-muted-foreground break-words">
                        {item.detalhe}
                      </p>
                    ) : null}
                    {item.registrado_por ? (
                      <p className="text-xs text-muted-foreground mt-1">
                        Registado por {item.registrado_por}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>

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
