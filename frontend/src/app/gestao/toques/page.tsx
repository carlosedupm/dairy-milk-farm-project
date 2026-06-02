"use client";

import { Suspense, useMemo } from "react";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { useQuery } from "@tanstack/react-query";
import { listByFazenda } from "@/services/toques";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { QueryListContent } from "@/components/layout/QueryListContent";
import { GestaoListLayout } from "@/components/gestao/GestaoListLayout";
import { ToqueTable } from "@/components/gestao/ToqueTable";
import { ToquesListToolbar } from "@/components/gestao/ToquesListToolbar";
import { useFilterSync } from "@/hooks/useFilterSync";
import { formatListCountSuffix, isValidYmd } from "@/lib/filter-url";
import type { FilterFieldDef } from "@/hooks/useFilterSync";
import { todayDateInputValue } from "@/lib/toquesUtils";

type ToquesFilterState = {
  data: string;
};

const emptyToquesFilterState = (): ToquesFilterState => ({ data: "" });

const toquesFilterFields: FilterFieldDef<ToquesFilterState>[] = [
  {
    key: "data",
    param: "data",
    parse: (raw) => {
      const trimmed = raw?.trim() ?? "";
      return trimmed && isValidYmd(trimmed) ? trimmed : "";
    },
    serialize: (value) => {
      const today = todayDateInputValue();
      if (!value || value === today) return null;
      return value;
    },
    isDefault: (value) => {
      const today = todayDateInputValue();
      return value === "" || value === today;
    },
  },
];

function Content() {
  const { fazendaAtiva } = useFazendaAtiva();
  const fazendaId = fazendaAtiva?.id ?? 0;
  const today = todayDateInputValue();

  const { filters, setFilter, clearFilters, hasActiveFilters } =
    useFilterSync({
      pathname: "/gestao/toques",
      defaults: emptyToquesFilterState(),
      fields: toquesFilterFields,
    });

  const dataFiltro = filters.data || today;

  const { data: items = [], isLoading, error, refetch } = useQuery({
    queryKey: ["toques", fazendaId, dataFiltro],
    queryFn: () =>
      listByFazenda({
        fazendaId,
        dataDe: dataFiltro,
        dataAte: dataFiltro,
      }),
    enabled: fazendaId > 0,
  });

  const titleSuffix = formatListCountSuffix({
    filtered: items.length,
    total: items.length,
    filtersActive: hasActiveFilters,
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
      title={`Toques (Diagnósticos) – ${fazendaAtiva.nome}${titleSuffix}`}
      backHref="/gestao"
      fazendaId={fazendaId}
      newHref="/gestao/toques/novo"
      secondaryHref="/gestao/toques/lote"
      secondaryLabel="Palpação em lote"
    >
      <div className="space-y-6">
        <ToquesListToolbar
          dataFiltro={dataFiltro}
          onDataFiltroChange={(data) => setFilter("data", data)}
          onClear={clearFilters}
          hasActiveFilters={hasActiveFilters}
        />
        <QueryListContent
          isLoading={isLoading}
          error={error}
          errorFallback="Erro ao carregar toques. Tente novamente."
          onRetry={() => void refetch()}
        >
          <ToqueTable items={items} fazendaId={fazendaId} />
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
