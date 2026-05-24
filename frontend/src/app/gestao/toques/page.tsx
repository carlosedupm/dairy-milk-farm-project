"use client";

import { useState } from "react";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { useQuery } from "@tanstack/react-query";
import { listByFazenda } from "@/services/toques";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { GestaoListLayout } from "@/components/gestao/GestaoListLayout";
import { ToqueTable } from "@/components/gestao/ToqueTable";
import { ToquesListToolbar } from "@/components/gestao/ToquesListToolbar";
import { getApiErrorMessage } from "@/lib/errors";
import { todayDateInputValue } from "@/lib/toquesUtils";

function Content() {
  const { fazendaAtiva } = useFazendaAtiva();
  const fazendaId = fazendaAtiva?.id ?? 0;
  const [dataFiltro, setDataFiltro] = useState(todayDateInputValue());

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ["toques", fazendaId, dataFiltro],
    queryFn: () =>
      listByFazenda({
        fazendaId,
        dataDe: dataFiltro,
        dataAte: dataFiltro,
      }),
    enabled: fazendaId > 0,
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
      title={`Toques (Diagnósticos) – ${fazendaAtiva.nome}`}
      backHref="/gestao"
      newHref="/gestao/toques/novo"
      secondaryHref="/gestao/toques/lote"
      secondaryLabel="Registrar em lote"
    >
      <ToquesListToolbar
        dataFiltro={dataFiltro}
        onDataFiltroChange={setDataFiltro}
      />
      {isLoading && <p className="text-muted-foreground">Carregando…</p>}
      {error && (
        <p className="text-destructive">
          {getApiErrorMessage(error, "Erro ao carregar.")}
        </p>
      )}
      {!isLoading && !error && (
        <ToqueTable items={items} fazendaId={fazendaId} />
      )}
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
