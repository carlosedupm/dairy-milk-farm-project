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
import { AnimaisListToolbar } from "@/components/animais/AnimaisListToolbar";
import { ListPaginationBar } from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Building2, Beef } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { FazendaSelector } from "@/components/fazendas/FazendaSelector";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useMobileInfiniteList } from "@/hooks/useMobileInfiniteList";
import { useAuth } from "@/contexts/AuthContext";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { useFilterSync } from "@/hooks/useFilterSync";
import { MobileInfiniteListFooter } from "@/components/layout/list/MobileInfiniteListFooter";
import type { Animal } from "@/services/animais";
import { formatListCountSuffix } from "@/lib/filter-url";
import {
  animaisFilterFields,
  emptyAnimaisFilterForm,
  hasActiveAnimaisToolbarFilters,
} from "@/lib/animais-filter-sync";

function AnimaisContent() {
  const { user } = useAuth();
  const canManageAnimais = user?.perfil !== "FUNCIONARIO";
  const { fazendaAtiva, isReady: fazendaReady } = useFazendaAtiva();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [pageSize, setPageSize] = useState(25);
  const [offset, setOffset] = useState(0);

  const { filters, setFilters, clearFilters } = useFilterSync({
      pathname: "/animais",
      defaults: emptyAnimaisFilterForm(),
      fields: animaisFilterFields,
      preserveParams: ["em_lactacao"],
    });

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
        params.set("identificacao", q);
      }
      params.delete("focusSearch");
      params.delete("q");
      const next = params.toString();
      router.replace(next ? `/animais?${next}` : "/animais", {
        scroll: false,
      });
      inner = window.setTimeout(() => {
        const el = document.getElementById(
          "animais-filter-ident",
        ) as HTMLInputElement | null;
        el?.focus();
        if (q) el?.select();
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

  const baseListParams = useMemo(
    () => ({
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
      fazendaId,
      debouncedIdent,
      filters.categoria,
      filters.sexo,
      filters.status_saude,
      filters.status_reprodutivo,
      loteNum,
      filters.rebanho,
    ],
  );

  const filterKey = `${debouncedIdent}|${fazendaId ?? ""}|${filters.categoria}|${filters.sexo}|${filters.status_saude}|${filters.status_reprodutivo}|${filters.lote_id}|${filters.rebanho}|${pageSize}|${emLactacaoMode}`;

  const listEnabled =
    fazendaReady && fazendaId != null && fazendaId > 0 && !emLactacaoMode;

  const mobileInfinite = useMobileInfiniteList<
    Animal,
    Awaited<ReturnType<typeof listPaginated>>
  >({
    queryKey: ["animais", "list", "infinite", baseListParams, pageSize],
    enabled: listEnabled,
    pageSize,
    queryFn: ({ pageParam }) =>
      listPaginated({
        ...baseListParams,
        limit: pageSize,
        offset: pageParam,
      }),
    getItemsFromPage: (page) => page.animais,
    getTotalFromPage: (page) => page.total,
    resetDeps: [filterKey],
  });

  const { isDesktop } = mobileInfinite;

  const desktopQueryParams = useMemo(
    () => ({ ...baseListParams, limit: pageSize, offset }),
    [baseListParams, pageSize, offset],
  );

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["animais", "list", desktopQueryParams],
    queryFn: () => listPaginated(desktopQueryParams),
    enabled: listEnabled && isDesktop,
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
    return all.filter((a) => a.identificacao.toLowerCase().includes(term));
  }, [lactacaoQuery.data, debouncedIdent]);

  const mobileLactacaoInfinite = useMobileInfiniteList<
    Animal,
    { items: Animal[]; total: number }
  >({
    queryKey: ["animais", "em-lactacao", "infinite", fazendaId, debouncedIdent],
    enabled: emLactacaoMode && fazendaReady && fazendaId != null && fazendaId > 0,
    pageSize: 25,
    queryFn: async () => ({ items: [], total: 0 }),
    clientPages: {
      items: lactacaoFiltered,
      isLoading: lactacaoQuery.isLoading,
    },
    getItemsFromPage: (page) => page.items,
    getTotalFromPage: (page) => page.total,
    resetDeps: [filterKey],
  });

  const activeInfinite = emLactacaoMode ? mobileLactacaoInfinite : mobileInfinite;

  const items = emLactacaoMode
    ? isDesktop
      ? lactacaoFiltered
      : mobileLactacaoInfinite.items
    : isDesktop
      ? (data?.animais ?? [])
      : mobileInfinite.items;

  const total = emLactacaoMode
    ? lactacaoFiltered.length
    : isDesktop
      ? (data?.total ?? 0)
      : mobileInfinite.total;

  const listLoading = emLactacaoMode
    ? !fazendaReady ||
      lactacaoQuery.isLoading ||
      (!isDesktop &&
        mobileLactacaoInfinite.isLoading &&
        mobileLactacaoInfinite.items.length === 0)
    : !fazendaReady ||
      (isDesktop && isLoading) ||
      (!isDesktop &&
        mobileInfinite.isLoading &&
        mobileInfinite.items.length === 0);

  const listError = emLactacaoMode ? lactacaoQuery.error : error;
  const listRefetch = emLactacaoMode
    ? () => void lactacaoQuery.refetch()
    : () => void refetch();

  const desktopFilterKey = `${debouncedIdent}|${fazendaId ?? ""}|${filters.categoria}|${filters.sexo}|${filters.status_saude}|${filters.status_reprodutivo}|${filters.lote_id}|${filters.rebanho}|${pageSize}`;
  const [prevFilterKey, setPrevFilterKey] = useState(desktopFilterKey);
  if (prevFilterKey !== desktopFilterKey) {
    setPrevFilterKey(desktopFilterKey);
    setOffset(0);
  }

  const toolbarFiltersActive = hasActiveAnimaisToolbarFilters(filters);
  const hasActiveFilters = emLactacaoMode || toolbarFiltersActive;

  const titleBase = fazendaAtiva
    ? emLactacaoMode
      ? `Animais em lactação — ${fazendaAtiva.nome}`
      : `Animais — ${fazendaAtiva.nome}`
    : emLactacaoMode
      ? "Animais em lactação"
      : "Animais";
  const titleSuffix = formatListCountSuffix({
    filtered: total,
    total,
    filtersActive: hasActiveFilters,
  });
  const title = `${titleBase}${titleSuffix}`;

  const showSelectFazendaMsg = fazendaReady && !fazendaAtiva;

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
            <div className="space-y-4">
              <EmptyState
                icon={Building2}
                title="Selecione uma fazenda"
                description="Escolha a exploração no seletor abaixo ou no menu da sua conta (topo da página) para ver e cadastrar animais do rebanho."
              />
              {(fazendasSemAtiva?.length ?? 0) > 1 ? (
                <div className="max-w-sm">
                  <FazendaSelector density="drawer" stayOnPage />
                </div>
              ) : null}
            </div>
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
              onClear={clearFilters}
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
                      : clearFilters
                  }
                  novoAnimalHref={
                    fazendaAtiva
                      ? `/animais/novo?fazenda_id=${fazendaAtiva.id}`
                      : undefined
                  }
                />
                {!emLactacaoMode ? (
                  <ListPaginationBar
                    className="hidden md:flex"
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
                <MobileInfiniteListFooter
                  sentinelRef={activeInfinite.sentinelRef}
                  isFetchingNextPage={activeInfinite.isFetchingNextPage}
                  allLoaded={activeInfinite.allLoaded}
                  total={activeInfinite.total}
                  hasItems={items.length > 0}
                />
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
