"use client";

import { useMemo, useState } from "react";
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
  emptyCoberturasFilterState,
  hasActiveCoberturaFilterState,
} from "@/components/gestao/CoberturasListToolbar";
import { QueryListContent } from "@/components/layout/QueryListContent";
import {
  filterCoberturas,
  hasActiveCoberturaFilters,
} from "@/lib/coberturas-filter";

function Content() {
  const { fazendaAtiva } = useFazendaAtiva();
  const fazendaId = fazendaAtiva?.id ?? 0;
  const [filterState, setFilterState] = useState(emptyCoberturasFilterState);

  const { data: items = [], isLoading, error, refetch } = useQuery({
    queryKey: ["coberturas", fazendaId],
    queryFn: () => listByFazenda(fazendaId),
    enabled: fazendaId > 0,
  });

  const { data: animais = [] } = useAnimaisOperacionalList(fazendaId);

  const filterParams = useMemo(
    () => coberturasFilterStateToParams(filterState),
    [filterState],
  );

  const filteredItems = useMemo(
    () => filterCoberturas(items, filterParams),
    [items, filterParams],
  );

  const filtersActive = hasActiveCoberturaFilterState(filterState);
  const filtersAffectResults = hasActiveCoberturaFilters(filterParams);

  const titleSuffix =
    items.length === 0
      ? ""
      : filtersAffectResults && filteredItems.length !== items.length
        ? ` (${filteredItems.length} de ${items.length})`
        : ` (${items.length})`;

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
      newHref="/gestao/coberturas/novo"
    >
      <div className="space-y-6">
        <CoberturasListToolbar
          animais={animais}
          values={filterState}
          onChange={setFilterState}
          onClear={() => setFilterState(emptyCoberturasFilterState())}
          hasActiveFilters={filtersActive}
        />
        <QueryListContent
          isLoading={isLoading}
          error={error}
          errorFallback="Erro ao carregar coberturas. Tente novamente."
          onRetry={() => void refetch()}
        >
          <CoberturaTable
            items={filteredItems}
            fazendaId={fazendaId}
            hasActiveFilters={filtersAffectResults}
            onClearFilters={() => setFilterState(emptyCoberturasFilterState())}
            novoHref="/gestao/coberturas/novo"
          />
        </QueryListContent>
      </div>
    </GestaoListLayout>
  );
}

export default function Page() {
  return (
    <ProtectedRoute>
      <Content />
    </ProtectedRoute>
  );
}
