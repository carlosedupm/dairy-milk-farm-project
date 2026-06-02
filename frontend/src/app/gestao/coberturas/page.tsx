"use client";

import { Suspense, useMemo, useState } from "react";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { useQuery } from "@tanstack/react-query";
import { listByFazenda } from "@/services/coberturas";
import { useAnimaisOperacionalList } from "@/components/gestao/useAnimaisMap";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { GestaoListLayout } from "@/components/gestao/GestaoListLayout";
import { CoberturaTable } from "@/components/gestao/CoberturaTable";
import {
  CoberturasListToolbar,
  coberturasFilterStateToParams,
} from "@/components/gestao/CoberturasListToolbar";
import { QueryListContent } from "@/components/layout/QueryListContent";
import { useFilterSync } from "@/hooks/useFilterSync";
import { useMobileInfiniteList } from "@/hooks/useMobileInfiniteList";
import { ListPaginationBar } from "@/components/ui/pagination";
import { MobileInfiniteListFooter } from "@/components/layout/list/MobileInfiniteListFooter";
import type { Cobertura } from "@/services/coberturas";
import { formatListCountSuffix } from "@/lib/filter-url";
import {
  coberturasFilterFields,
  emptyCoberturasUrlFilterState,
  filterCoberturas,
  hasActiveCoberturaFilters,
} from "@/lib/coberturas-filter";
import { buildGestaoNovoHref } from "@/lib/gestaoNovoUrl";

function Content() {
  const { fazendaAtiva } = useFazendaAtiva();
  const fazendaId = fazendaAtiva?.id ?? 0;

  const { filters, setFilters, clearFilters, hasActiveFilters } =
    useFilterSync({
      pathname: "/gestao/coberturas",
      defaults: emptyCoberturasUrlFilterState(),
      fields: coberturasFilterFields,
    });

  const { data: items = [], isLoading, error, refetch } = useQuery({
    queryKey: ["coberturas", fazendaId],
    queryFn: () => listByFazenda(fazendaId),
    enabled: fazendaId > 0,
  });

  const { data: animais = [] } = useAnimaisOperacionalList(fazendaId);

  const filterParams = useMemo(
    () => coberturasFilterStateToParams(filters),
    [filters],
  );

  const filteredItems = useMemo(
    () => filterCoberturas(items, filterParams),
    [items, filterParams],
  );

  const [pageSize, setPageSize] = useState(25);
  const [offset, setOffset] = useState(0);

  const filterKey = JSON.stringify(filterParams);
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    setOffset(0);
  }

  const mobileInfinite = useMobileInfiniteList<
    Cobertura,
    { items: Cobertura[]; total: number }
  >({
    queryKey: ["coberturas", "infinite", fazendaId, filterParams],
    enabled: fazendaId > 0,
    pageSize,
    queryFn: async () => ({ items: [], total: 0 }),
    clientPages: {
      items: filteredItems,
      isLoading,
    },
    getItemsFromPage: (page) => page.items,
    getTotalFromPage: (page) => page.total,
    resetDeps: [filterKey],
  });

  const { isDesktop } = mobileInfinite;

  const paginatedItems = useMemo(
    () => filteredItems.slice(offset, offset + pageSize),
    [filteredItems, offset, pageSize],
  );

  const displayItems = isDesktop ? paginatedItems : mobileInfinite.items;

  const filtersAffectResults = hasActiveCoberturaFilters(filterParams);

  const titleSuffix = formatListCountSuffix({
    filtered: filteredItems.length,
    total: items.length,
    filtersActive: filtersAffectResults,
  });

  const novoHref = useMemo(
    () =>
      buildGestaoNovoHref("/gestao/coberturas/novo", {
        animalId: filters.animal_id || undefined,
      }),
    [filters.animal_id],
  );

  if (!fazendaAtiva) {
    return (
      <PageContainer variant="default">
        <BackLink href="/gestao">Voltar</BackLink>
        <p className="text-muted-foreground mt-4">Selecione uma fazenda.</p>
      </PageContainer>
    );
  }

  return (
    <GestaoListLayout
      title={`Coberturas – ${fazendaAtiva.nome}${titleSuffix}`}
      backHref="/gestao"
      fazendaId={fazendaId}
      newHref={novoHref}
    >
      <div className="space-y-6">
        <CoberturasListToolbar
          animais={animais}
          values={filters}
          onChange={setFilters}
          onClear={clearFilters}
          hasActiveFilters={hasActiveFilters}
        />
        <QueryListContent
          isLoading={
            isLoading ||
            (!isDesktop &&
              mobileInfinite.isLoading &&
              mobileInfinite.items.length === 0)
          }
          error={error}
          errorFallback="Erro ao carregar coberturas. Tente novamente."
          onRetry={() => void refetch()}
        >
          <div className="space-y-4">
            <CoberturaTable
              items={displayItems}
              fazendaId={fazendaId}
              hasActiveFilters={filtersAffectResults}
              onClearFilters={clearFilters}
              novoHref={novoHref}
            />
            {filteredItems.length > 0 ? (
              <>
                <ListPaginationBar
                  className="hidden md:flex"
                  total={filteredItems.length}
                  pageSize={pageSize}
                  offset={offset}
                  pageSizeOptions={[10, 25, 50, 100]}
                  onPageSizeChange={(n) => {
                    setPageSize(n);
                    setOffset(0);
                  }}
                  onOffsetChange={setOffset}
                />
                <MobileInfiniteListFooter
                  sentinelRef={mobileInfinite.sentinelRef}
                  isFetchingNextPage={mobileInfinite.isFetchingNextPage}
                  allLoaded={mobileInfinite.allLoaded}
                  total={mobileInfinite.total}
                  hasItems={displayItems.length > 0}
                />
              </>
            ) : null}
          </div>
        </QueryListContent>
      </div>
    </GestaoListLayout>
  );
}

export default function Page() {
  return (
    <ProtectedRoute>
      <Suspense
        fallback={
          <PageContainer variant="default">
            <p className="text-muted-foreground">Carregando…</p>
          </PageContainer>
        }
      >
        <Content />
      </Suspense>
    </ProtectedRoute>
  );
}
