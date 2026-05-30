"use client";

import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { useQuery } from "@tanstack/react-query";
import { listByFazenda } from "@/services/cios";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { QueryListContent } from "@/components/layout/QueryListContent";
import { GestaoListLayout } from "@/components/gestao/GestaoListLayout";
import { CioTable } from "@/components/gestao/CioTable";

function Content() {
  const { fazendaAtiva } = useFazendaAtiva();
  const fazendaId = fazendaAtiva?.id ?? 0;

  const { data: items = [], isLoading, error, refetch } = useQuery({
    queryKey: ["cios", fazendaId],
    queryFn: () => listByFazenda(fazendaId),
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
      title={`Cios – ${fazendaAtiva.nome}`}
      backHref="/gestao"
      fazendaId={fazendaId}
      newHref="/gestao/cios/novo"
    >
      <QueryListContent
        isLoading={isLoading}
        error={error}
        errorFallback="Erro ao carregar cios. Tente novamente."
        onRetry={() => void refetch()}
      >
        <CioTable
          items={items}
          fazendaId={fazendaId}
          novoHref="/gestao/cios/novo"
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
