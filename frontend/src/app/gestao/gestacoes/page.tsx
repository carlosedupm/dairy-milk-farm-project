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
import { isPartoPrevistoProximos7Dias } from "@/lib/gestacoesFilters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

const STATUS_FILTER_LABELS: Record<string, string> = {
  CONFIRMADA: "Confirmadas",
};

const PARTOS_DIAS_FILTER_LABEL = "Partos previstos em 7 dias";

function Content() {
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status")?.trim() ?? "";
  const partosDiasFilter = searchParams.get("partos_dias")?.trim() ?? "";
  const { fazendaAtiva } = useFazendaAtiva();
  const fazendaId = fazendaAtiva?.id ?? 0;

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ["gestacoes", fazendaId],
    queryFn: () => listByFazenda(fazendaId),
    enabled: fazendaId > 0,
  });

  const filteredItems = useMemo(() => {
    let list = items;
    if (statusFilter) {
      list = list.filter((g) => g.status === statusFilter);
    }
    if (partosDiasFilter === "7") {
      list = list.filter((g) =>
        isPartoPrevistoProximos7Dias(g.data_prevista_parto),
      );
    }
    return list;
  }, [items, statusFilter, partosDiasFilter]);

  const filterLabel = STATUS_FILTER_LABELS[statusFilter];
  const hasPartos7dFilter = partosDiasFilter === "7";
  const hasAnyFilter = Boolean(statusFilter && filterLabel) || hasPartos7dFilter;

  if (!fazendaAtiva) {
    return (
      <PageContainer variant="default">
        <BackLink href="/gestao">Voltar</BackLink>
        <p className="text-muted-foreground mt-4">Selecione uma fazenda.</p>
      </PageContainer>
    );
  }

  const title = hasPartos7dFilter
    ? `Gestações — ${PARTOS_DIAS_FILTER_LABEL} — ${fazendaAtiva.nome}`
    : filterLabel
      ? `Gestações ${filterLabel.toLowerCase()} — ${fazendaAtiva.nome}`
      : `Gestações – ${fazendaAtiva.nome}`;

  return (
    <GestaoListLayout title={title} backHref="/gestao" fazendaId={fazendaId}>
      {hasAnyFilter ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {statusFilter && filterLabel ? (
            <Badge variant="secondary" className="gap-1 pr-1">
              Filtro: {filterLabel}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                asChild
                aria-label="Remover filtro de status"
              >
                <Link
                  href={
                    hasPartos7dFilter
                      ? "/gestao/gestacoes?partos_dias=7"
                      : "/gestao/gestacoes"
                  }
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </Button>
            </Badge>
          ) : null}
          {hasPartos7dFilter ? (
            <Badge variant="secondary" className="gap-1 pr-1">
              {PARTOS_DIAS_FILTER_LABEL}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                asChild
                aria-label="Remover filtro de partos em 7 dias"
              >
                <Link
                  href={
                    statusFilter
                      ? `/gestao/gestacoes?status=${encodeURIComponent(statusFilter)}`
                      : "/gestao/gestacoes"
                  }
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </Button>
            </Badge>
          ) : null}
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
            hasPartos7dFilter
              ? "Nenhum parto previsto nos próximos 7 dias."
              : statusFilter && filterLabel
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
