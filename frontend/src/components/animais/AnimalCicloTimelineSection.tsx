"use client";

import { useEffect, useMemo, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { getApiErrorMessage } from "@/lib/errors";
import {
  TIMELINE_PAGE_SIZE,
  animalTimelineQueryKey,
  getTimeline,
  type ProximaAcao,
} from "@/services/animais";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Loader2, Eye } from "lucide-react";
import { isPathAllowedForPerfil } from "@/config/appAccess";
import { useAuth } from "@/contexts/AuthContext";
import {
  AnimalCicloTimelineVisual,
  CicloTimelineSkeleton,
} from "@/components/animais/AnimalCicloTimelineVisual";
import {
  buildMarcosPrevistos,
  type CicloMarco,
  type CicloMarcoConcluido,
} from "@/components/animais/animalCicloTimelineUtils";
import { takeProximasAcoes } from "@/components/animais/animalProximasAcoesUtils";

type Props = {
  animalId: number;
  proximasAcoes?: ProximaAcao[];
  foraDoRebanho?: boolean;
  /** Oculta o Card wrapper (ex.: mini-timeline na Visão Geral). */
  bare?: boolean;
  /** Limita marcos concluídos (sem paginação). */
  maxItems?: number;
  title?: string;
};

export function AnimalCicloTimelineSection({
  animalId,
  proximasAcoes,
  foraDoRebanho = false,
  bare = false,
  maxItems,
  title = "Linha do tempo",
}: Props) {
  const { user } = useAuth();
  const canRegistrarCio = isPathAllowedForPerfil(user?.perfil, "/gestao/cios");
  const sentinelRef = useRef<HTMLDivElement>(null);
  const paginated = maxItems == null;

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
    queryKey: animalTimelineQueryKey(animalId, "ciclo"),
    queryFn: ({ pageParam }) =>
      getTimeline(animalId, {
        limit: maxItems ?? TIMELINE_PAGE_SIZE,
        offset: pageParam,
        tipo: "ciclo",
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (maxItems != null) {
        return undefined;
      }
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
  const allLoaded = paginated && !hasNextPage && items.length > 0;

  const marcosPrevistos = useMemo(() => {
    if (foraDoRebanho || !proximasAcoes?.length) {
      return [];
    }
    return buildMarcosPrevistos(takeProximasAcoes(proximasAcoes));
  }, [foraDoRebanho, proximasAcoes]);

  const marcosCiclo = useMemo((): CicloMarco[] => {
    const concluidos: CicloMarcoConcluido[] = items.map((item) => ({
      status: "concluido",
      tipo: item.tipo,
      data: item.data,
      titulo: item.titulo,
      detalhe: item.detalhe,
      registrado_por: item.registrado_por,
      ref_id: item.ref_id,
    }));
    return [...marcosPrevistos, ...concluidos];
  }, [items, marcosPrevistos]);

  const showEmpty =
    !isLoading && !isError && marcosCiclo.length === 0;

  useEffect(() => {
    if (!paginated) {
      return;
    }
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
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, items.length, paginated]);

  const body = (
    <>
      {isLoading ? (
        <CicloTimelineSkeleton />
      ) : isError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm space-y-2">
          <p>{getApiErrorMessage(error, "Erro ao carregar ciclo")}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : showEmpty ? (
        <EmptyState
          icon={Eye}
          title="Nenhum evento de ciclo reprodutivo registrado"
          description="Registre um cio para iniciar o ciclo"
          primaryAction={
            canRegistrarCio
              ? {
                  label: "Registrar cio",
                  href: `/gestao/cios/novo?animal_id=${animalId}`,
                  icon: Eye,
                }
              : undefined
          }
          className={bare ? "py-8" : undefined}
        />
      ) : (
        <>
          <AnimalCicloTimelineVisual marcos={marcosCiclo} animalId={animalId} />
          {paginated ? (
            <>
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
          ) : null}
        </>
      )}
    </>
  );

  if (bare) {
    return body;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}
