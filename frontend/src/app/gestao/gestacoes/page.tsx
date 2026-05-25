"use client";

import Link from "next/link";
import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { useQuery } from "@tanstack/react-query";
import { listByFazenda } from "@/services/gestacoes";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { GestaoListLayout } from "@/components/gestao/GestaoListLayout";
import { GestacaoTable } from "@/components/gestao/GestacaoTable";
import { getApiErrorMessage } from "@/lib/errors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

const STATUS_FILTER_LABELS: Record<string, string> = {
  CONFIRMADA: "Confirmadas",
};

function Content() {
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status")?.trim() ?? "";
  const { fazendaAtiva } = useFazendaAtiva();
  const fazendaId = fazendaAtiva?.id ?? 0;

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ["gestacoes", fazendaId],
    queryFn: () => listByFazenda(fazendaId),
    enabled: fazendaId > 0,
  });

  const filteredItems = useMemo(() => {
    if (!statusFilter) return items;
    return items.filter((g) => g.status === statusFilter);
  }, [items, statusFilter]);

  const filterLabel = STATUS_FILTER_LABELS[statusFilter];

  if (!fazendaAtiva) {
    return (
      <PageContainer variant="default">
        <BackLink href="/gestao">Voltar</BackLink>
        <p className="text-muted-foreground mt-4">Selecione uma fazenda.</p>
      </PageContainer>
    );
  }

  const title = filterLabel
    ? `Gestações ${filterLabel.toLowerCase()} — ${fazendaAtiva.nome}`
    : `Gestações – ${fazendaAtiva.nome}`;

  return (
    <GestaoListLayout title={title} backHref="/gestao">
      {statusFilter && filterLabel ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1 pr-1">
            Filtro: {filterLabel}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              asChild
              aria-label="Remover filtro de status"
            >
              <Link href="/gestao/gestacoes">
                <X className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </Button>
          </Badge>
          <Button variant="link" className="h-auto min-h-[44px] px-0" asChild>
            <Link href="/gestao/gestacoes">Ver todas as gestações</Link>
          </Button>
        </div>
      ) : null}
      {isLoading && <p className="text-muted-foreground">Carregando…</p>}
      {error && (
        <p className="text-destructive">
          {getApiErrorMessage(error, "Erro ao carregar.")}
        </p>
      )}
      {!isLoading && !error && (
        <GestacaoTable
          items={filteredItems}
          fazendaId={fazendaId}
          emptyMessage={
            statusFilter && filterLabel
              ? `Nenhuma gestação ${filterLabel.toLowerCase()} no momento.`
              : undefined
          }
        />
      )}
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
