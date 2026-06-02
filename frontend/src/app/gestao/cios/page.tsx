"use client";

import { Suspense, useMemo } from "react";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { useQuery } from "@tanstack/react-query";
import { listByFazenda } from "@/services/cios";
import { useAnimaisOperacionalList } from "@/components/gestao/useAnimaisMap";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { GestaoListLayout } from "@/components/gestao/GestaoListLayout";
import { CioTable } from "@/components/gestao/CioTable";
import { CiosListToolbar } from "@/components/gestao/GestaoPeriodListToolbar";
import { QueryListContent } from "@/components/layout/QueryListContent";
import { useFilterSync } from "@/hooks/useFilterSync";
import { formatListCountSuffix } from "@/lib/filter-url";
import {
  emptyGestaoPeriodFilterState,
  filterCios,
  gestaoPeriodFilterFields,
  gestaoPeriodFilterStateToParams,
  hasActiveGestaoPeriodFilters,
} from "@/lib/cios-filter";
import { buildGestaoNovoHref } from "@/lib/gestaoNovoUrl";

function Content() {
  const { fazendaAtiva } = useFazendaAtiva();
  const fazendaId = fazendaAtiva?.id ?? 0;

  const { filters, setFilters, clearFilters, hasActiveFilters } =
    useFilterSync({
      pathname: "/gestao/cios",
      defaults: emptyGestaoPeriodFilterState(),
      fields: gestaoPeriodFilterFields,
    });

  const { data: items = [], isLoading, error, refetch } = useQuery({
    queryKey: ["cios", fazendaId],
    queryFn: () => listByFazenda(fazendaId),
    enabled: fazendaId > 0,
  });

  const { data: animais = [] } = useAnimaisOperacionalList(fazendaId);

  const filterParams = useMemo(
    () => gestaoPeriodFilterStateToParams(filters),
    [filters],
  );

  const filteredItems = useMemo(
    () => filterCios(items, filterParams),
    [items, filterParams],
  );

  const filtersAffectResults = hasActiveGestaoPeriodFilters(filterParams);

  const titleSuffix = formatListCountSuffix({
    filtered: filteredItems.length,
    total: items.length,
    filtersActive: filtersAffectResults,
  });

  const novoHref = useMemo(
    () =>
      buildGestaoNovoHref("/gestao/cios/novo", {
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
      title={`Cios – ${fazendaAtiva.nome}${titleSuffix}`}
      backHref="/gestao"
      fazendaId={fazendaId}
      newHref={novoHref}
    >
      <div className="space-y-6">
        <CiosListToolbar
          animais={animais}
          values={filters}
          onChange={setFilters}
          onClear={clearFilters}
          hasActiveFilters={hasActiveFilters}
          title="Filtros de cios"
        />
        <QueryListContent
          isLoading={isLoading}
          error={error}
          errorFallback="Erro ao carregar cios. Tente novamente."
          onRetry={() => void refetch()}
        >
          <CioTable
            items={filteredItems}
            fazendaId={fazendaId}
            novoHref={novoHref}
            hasActiveFilters={filtersAffectResults}
            onClearFilters={clearFilters}
          />
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
