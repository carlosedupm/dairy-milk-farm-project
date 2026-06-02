"use client";

import { Suspense, useMemo } from "react";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { useQuery } from "@tanstack/react-query";
import { listByFazenda } from "@/services/gestacoes";
import { useAnimaisOperacionalList } from "@/components/gestao/useAnimaisMap";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { GestaoListLayout } from "@/components/gestao/GestaoListLayout";
import { GestacaoTable } from "@/components/gestao/GestacaoTable";
import { GestacoesListToolbar } from "@/components/gestao/GestacoesListToolbar";
import { QueryListContent } from "@/components/layout/QueryListContent";
import { useFilterSync } from "@/hooks/useFilterSync";
import { formatListCountSuffix } from "@/lib/filter-url";
import {
  emptyGestacoesFilterState,
  filterGestações,
  gestacoesFilterFields,
  gestacoesFilterStateToParams,
  hasActiveGestacoesFilters,
} from "@/lib/gestacoes-list-filter";

function Content() {
  const { fazendaAtiva } = useFazendaAtiva();
  const fazendaId = fazendaAtiva?.id ?? 0;

  const { filters, setFilters, clearFilters, hasActiveFilters } =
    useFilterSync({
      pathname: "/gestao/gestacoes",
      defaults: emptyGestacoesFilterState(),
      fields: gestacoesFilterFields,
    });

  const { data: items = [], isLoading, error, refetch } = useQuery({
    queryKey: ["gestacoes", fazendaId],
    queryFn: () => listByFazenda(fazendaId),
    enabled: fazendaId > 0,
  });

  const { data: animais = [] } = useAnimaisOperacionalList(fazendaId);

  const filterParams = useMemo(
    () => gestacoesFilterStateToParams(filters),
    [filters],
  );

  const filteredItems = useMemo(
    () => filterGestações(items, filterParams),
    [items, filterParams],
  );

  const filtersAffectResults = hasActiveGestacoesFilters(filterParams);

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
      title={`Gestações – ${fazendaAtiva.nome}${titleSuffix}`}
      backHref="/gestao"
      fazendaId={fazendaId}
    >
      <div className="space-y-6">
        <GestacoesListToolbar
          animais={animais}
          values={filters}
          onChange={setFilters}
          onClear={clearFilters}
          hasActiveFilters={hasActiveFilters}
        />
        <QueryListContent
          isLoading={isLoading}
          error={error}
          errorFallback="Erro ao carregar gestações. Tente novamente."
          onRetry={() => void refetch()}
        >
          <GestacaoTable
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
