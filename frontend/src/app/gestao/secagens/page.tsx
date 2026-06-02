"use client";

import { Suspense, useMemo } from "react";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { useQuery } from "@tanstack/react-query";
import { listByFazenda } from "@/services/secagens";
import { useAnimaisOperacionalList } from "@/components/gestao/useAnimaisMap";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { GestaoListLayout } from "@/components/gestao/GestaoListLayout";
import { SecagemTable } from "@/components/gestao/SecagemTable";
import { SecagensListToolbar } from "@/components/gestao/GestaoPeriodListToolbar";
import { QueryListContent } from "@/components/layout/QueryListContent";
import { useFilterSync } from "@/hooks/useFilterSync";
import { formatListCountSuffix } from "@/lib/filter-url";
import {
  emptyGestaoPeriodFilterState,
  filterSecagens,
  gestaoPeriodFilterFields,
  gestaoPeriodFilterStateToParams,
  hasActiveGestaoPeriodFilters,
} from "@/lib/secagens-filter";

function Content() {
  const { fazendaAtiva } = useFazendaAtiva();
  const fazendaId = fazendaAtiva?.id ?? 0;

  const { filters, setFilters, clearFilters, hasActiveFilters } =
    useFilterSync({
      pathname: "/gestao/secagens",
      defaults: emptyGestaoPeriodFilterState(),
      fields: gestaoPeriodFilterFields,
    });

  const { data: items = [], isLoading, error, refetch } = useQuery({
    queryKey: ["secagens", fazendaId],
    queryFn: () => listByFazenda(fazendaId),
    enabled: fazendaId > 0,
  });

  const { data: animais = [] } = useAnimaisOperacionalList(fazendaId);

  const filterParams = useMemo(
    () => gestaoPeriodFilterStateToParams(filters),
    [filters],
  );

  const filteredItems = useMemo(
    () => filterSecagens(items, filterParams),
    [items, filterParams],
  );

  const filtersAffectResults = hasActiveGestaoPeriodFilters(filterParams);

  const titleSuffix = formatListCountSuffix({
    filtered: filteredItems.length,
    total: items.length,
    filtersActive: filtersAffectResults,
  });

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
      title={`Secagens – ${fazendaAtiva.nome}${titleSuffix}`}
      backHref="/gestao"
      fazendaId={fazendaId}
    >
      <div className="space-y-6">
        <SecagensListToolbar
          animais={animais}
          values={filters}
          onChange={setFilters}
          onClear={clearFilters}
          hasActiveFilters={hasActiveFilters}
          title="Filtros de secagens"
        />
        <QueryListContent
          isLoading={isLoading}
          error={error}
          errorFallback="Erro ao carregar secagens. Tente novamente."
          onRetry={() => void refetch()}
        >
          <SecagemTable
            items={filteredItems}
            fazendaId={fazendaId}
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
