"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { listEmLactacaoByFazenda, listPaginated } from "@/services/animais";
import { getMinhasFazendas } from "@/services/fazendas";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { ListCardLayout } from "@/components/layout/ListCardLayout";
import { QueryListContent } from "@/components/layout/QueryListContent";
import { AnimalTable } from "@/components/animais/AnimalTable";
import {
  AnimaisListToolbar,
  emptyAnimaisFilterForm,
  type AnimaisFilterFormState,
} from "@/components/animais/AnimaisListToolbar";
import { ListPaginationBar } from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Building2, Beef } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useAuth } from "@/contexts/AuthContext";
import { useFazendaAtiva } from "@/contexts/FazendaContext";

function AnimaisContent() {
  const { user } = useAuth();
  const canManageAnimais = user?.perfil !== "FUNCIONARIO";
  const { fazendaAtiva, isReady: fazendaReady } = useFazendaAtiva();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [pageSize, setPageSize] = useState(25);
  const [offset, setOffset] = useState(0);
  const [filters, setFilters] = useState<AnimaisFilterFormState>(() =>
    emptyAnimaisFilterForm()
  );

  const emLactacaoMode = searchParams.get("em_lactacao") === "1";
  const queryString = searchParams.toString();

  useEffect(() => {
    const params = new URLSearchParams(queryString);
    const focusFlag = params.get("focusSearch") === "1";
    const qRaw = params.get("q");
    const q = qRaw ? decodeURIComponent(qRaw.trim()) : "";
    if (!focusFlag && !q) return;

    let inner: number | undefined;
    const outer = window.setTimeout(() => {
      if (q) {
        setFilters((prev) => ({ ...prev, identificacao: q }));
      }
      inner = window.setTimeout(() => {
        const el = document.getElementById(
          "animais-filter-ident",
        ) as HTMLInputElement | null;
        el?.focus();
        if (q) el?.select();

        params.delete("focusSearch");
        params.delete("q");
        const next = params.toString();
        router.replace(next ? `/animais?${next}` : "/animais", {
          scroll: false,
        });
      }, q ? 120 : 0);
    }, 0);

    return () => {
      window.clearTimeout(outer);
      if (inner !== undefined) window.clearTimeout(inner);
    };
  }, [queryString, router]);

  const debouncedIdent = useDebouncedValue(filters.identificacao.trim(), 400);

  const fazendaId = fazendaAtiva?.id;

  const loteNum = filters.lote_id ? Number.parseInt(filters.lote_id, 10) : 0;

  const queryParams = useMemo(
    () => ({
      limit: pageSize,
      offset,
      fazenda_id: fazendaId,
      identificacao: debouncedIdent || undefined,
      categoria: filters.categoria || undefined,
      sexo: filters.sexo || undefined,
      status_saude: filters.status_saude || undefined,
      status_reprodutivo: filters.status_reprodutivo || undefined,
      lote_id: !Number.isNaN(loteNum) && loteNum > 0 ? loteNum : undefined,
      rebanho: filters.rebanho,
    }),
    [
      pageSize,
      offset,
      fazendaId,
      debouncedIdent,
      filters.categoria,
      filters.sexo,
      filters.status_saude,
      filters.status_reprodutivo,
      loteNum,
      filters.rebanho,
    ]
  );

  const listEnabled =
    fazendaReady && fazendaId != null && fazendaId > 0 && !emLactacaoMode;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["animais", "list", queryParams],
    queryFn: () => listPaginated(queryParams),
    enabled: listEnabled,
  });

  const lactacaoQuery = useQuery({
    queryKey: ["animais", "fazenda", fazendaId, "em-lactacao"],
    queryFn: () => listEmLactacaoByFazenda(fazendaId!),
    enabled:
      fazendaReady && fazendaId != null && fazendaId > 0 && emLactacaoMode,
  });

  const lactacaoFiltered = useMemo(() => {
    const all = lactacaoQuery.data ?? [];
    if (!debouncedIdent) return all;
    const term = debouncedIdent.toLowerCase();
    return all.filter((a) =>
      a.identificacao.toLowerCase().includes(term),
    );
  }, [lactacaoQuery.data, debouncedIdent]);

  const items = emLactacaoMode
    ? lactacaoFiltered
    : (data?.animais ?? []);
  const total = emLactacaoMode
    ? lactacaoFiltered.length
    : (data?.total ?? 0);
  const listLoading = emLactacaoMode
    ? !fazendaReady || lactacaoQuery.isLoading
    : !fazendaReady || isLoading;
  const listError = emLactacaoMode ? lactacaoQuery.error : error;
  const listRefetch = emLactacaoMode
    ? () => void lactacaoQuery.refetch()
    : () => void refetch();

  const filterKey = `${debouncedIdent}|${fazendaId ?? ""}|${filters.categoria}|${filters.sexo}|${filters.status_saude}|${filters.status_reprodutivo}|${filters.lote_id}|${filters.rebanho}|${pageSize}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    setOffset(0);
  }

  const titleBase = fazendaAtiva
    ? emLactacaoMode
      ? `Animais em lactação — ${fazendaAtiva.nome}`
      : `Animais — ${fazendaAtiva.nome}`
    : emLactacaoMode
      ? "Animais em lactação"
      : "Animais";
  const title =
    total > 0 ? `${titleBase} (${total})` : titleBase;

  const showSelectFazendaMsg = fazendaReady && !fazendaAtiva;

  const hasActiveFilters =
    emLactacaoMode ||
    Boolean(debouncedIdent) ||
    Boolean(filters.categoria) ||
    Boolean(filters.sexo) ||
    Boolean(filters.status_saude) ||
    Boolean(filters.status_reprodutivo) ||
    Boolean(filters.lote_id) ||
    filters.rebanho !== "ativos";

  const handleClearFilters = () => {
    setFilters(emptyAnimaisFilterForm());
    setOffset(0);
  };

  const { data: fazendasSemAtiva = undefined, isLoading: loadingFazendasCheck } =
    useQuery({
      queryKey: ["me", "fazendas"],
      queryFn: getMinhasFazendas,
      enabled: showSelectFazendaMsg,
    });

  return (
    <PageContainer variant="default">
      <ListCardLayout
        title={title}
        action={
          canManageAnimais && fazendaAtiva ? (
            <Button asChild>
              <Link href={`/animais/novo?fazenda_id=${fazendaAtiva.id}`}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Animal
              </Link>
            </Button>
          ) : null
        }
      >
        {showSelectFazendaMsg ? (
          loadingFazendasCheck ? (
            <p className="text-muted-foreground">Carregando…</p>
          ) : fazendasSemAtiva?.length === 0 ? (
            <EmptyState
              icon={Beef}
              title="Cadastre seu primeiro animal"
              description="Antes disso, precisa de uma fazenda vinculada à sua conta. Solicite ao administrador ou siga as orientações de onboarding."
              primaryAction={{
                label: "Ver orientações",
                href: "/onboarding",
              }}
            />
          ) : (
            <EmptyState
              icon={Building2}
              title="Selecione uma fazenda"
              description="Use o seletor no topo da página para ver e cadastrar animais do rebanho dessa exploração."
            />
          )
        ) : (
          <div className="space-y-6">
            {emLactacaoMode ? (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="gap-1 pr-1">
                  Em lactação
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    asChild
                    aria-label="Remover filtro em lactação"
                  >
                    <Link href="/animais">
                      <X className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                  </Button>
                </Badge>
                <Button variant="link" className="h-auto min-h-[44px] px-0" asChild>
                  <Link href="/animais">Ver todos os animais</Link>
                </Button>
              </div>
            ) : null}
            <AnimaisListToolbar
              values={filters}
              onChange={setFilters}
              resultCount={total}
              listLoading={listLoading}
              onClear={handleClearFilters}
            />
            <QueryListContent
              isLoading={listLoading}
              error={listError}
              errorFallback="Erro ao carregar animais. Tente novamente."
              onRetry={listRefetch}
            >
              <div className="space-y-4">
                <AnimalTable
                  items={items}
                  canManage={canManageAnimais}
                  hasActiveFilters={hasActiveFilters}
                  filterTerm={debouncedIdent || undefined}
                  onClearFilters={
                    emLactacaoMode
                      ? () => router.replace("/animais")
                      : handleClearFilters
                  }
                  novoAnimalHref={
                    fazendaAtiva
                      ? `/animais/novo?fazenda_id=${fazendaAtiva.id}`
                      : undefined
                  }
                />
                {!emLactacaoMode ? (
                  <ListPaginationBar
                    total={total}
                    pageSize={pageSize}
                    offset={offset}
                    onOffsetChange={setOffset}
                    pageSizeOptions={[10, 25, 50, 100]}
                    onPageSizeChange={(n) => {
                      setPageSize(n);
                      setOffset(0);
                    }}
                  />
                ) : null}
              </div>
            </QueryListContent>
          </div>
        )}
      </ListCardLayout>
    </PageContainer>
  );
}

export default function AnimaisPage() {
  return (
    <ProtectedRoute>
      <Suspense
        fallback={
          <PageContainer variant="default">
            <p className="text-muted-foreground">Carregando…</p>
          </PageContainer>
        }
      >
        <AnimaisContent />
      </Suspense>
    </ProtectedRoute>
  );
}
