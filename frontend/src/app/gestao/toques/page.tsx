"use client";

import { useState } from "react";
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
import { todayDateInputValue } from "@/lib/toquesUtils";

function Content() {
  const { fazendaAtiva } = useFazendaAtiva();
  const fazendaId = fazendaAtiva?.id ?? 0;
  const today = todayDateInputValue();
  const [dataFiltro, setDataFiltro] = useState(today);

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

  const hasActiveFilters = dataFiltro !== today;

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
      title={`Toques (Diagnósticos) – ${fazendaAtiva.nome}`}
      backHref="/gestao"
      fazendaId={fazendaId}
      newHref="/gestao/toques/novo"
      secondaryHref="/gestao/toques/lote"
      secondaryLabel="Registrar em lote"
    >
      <ToquesListToolbar
        dataFiltro={dataFiltro}
        onDataFiltroChange={setDataFiltro}
      />
      <QueryListContent
        isLoading={isLoading}
        error={error}
        errorFallback="Erro ao carregar toques. Tente novamente."
        onRetry={() => void refetch()}
      >
        <ToqueTable
          items={items}
          fazendaId={fazendaId}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={() => setDataFiltro(todayDateInputValue())}
          novoHref="/gestao/toques/novo"
        />
      </QueryListContent>
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
