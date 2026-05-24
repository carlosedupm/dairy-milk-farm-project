"use client";

import { useMemo, useState } from "react";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { useQuery } from "@tanstack/react-query";
import { listByFazenda as listAnimaisByFazenda } from "@/services/animais";
import { listByFazenda } from "@/services/coberturas";
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
import { getApiErrorMessage } from "@/lib/errors";
import {
  filterCoberturas,
  hasActiveCoberturaFilters,
} from "@/lib/coberturas-filter";

function Content() {
  const { fazendaAtiva } = useFazendaAtiva();
  const fazendaId = fazendaAtiva?.id ?? 0;
  const [filterState, setFilterState] = useState(emptyCoberturasFilterState);

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ["coberturas", fazendaId],
    queryFn: () => listByFazenda(fazendaId),
    enabled: fazendaId > 0,
  });

  const { data: animais = [] } = useQuery({
    queryKey: ["animais", "by-fazenda", fazendaId],
    queryFn: () => listAnimaisByFazenda(fazendaId),
    enabled: fazendaId > 0,
  });

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
        {isLoading && <p className="text-muted-foreground">Carregando…</p>}
        {error && (
          <p className="text-destructive">
            {getApiErrorMessage(error, "Erro ao carregar.")}
          </p>
        )}
        {!isLoading && !error && (
          <CoberturaTable
            items={filteredItems}
            fazendaId={fazendaId}
            hasActiveFilters={filtersAffectResults}
          />
        )}
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
