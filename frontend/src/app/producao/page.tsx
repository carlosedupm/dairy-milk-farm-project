"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { listByDateRange } from "@/services/producao";
import { listByFazenda } from "@/services/lactacoes";
import { getMinhasFazendas } from "@/services/fazendas";
import { useGestaoAnimaisByIdMap } from "@/components/gestao/useAnimaisMap";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { ListCardLayout } from "@/components/layout/ListCardLayout";
import { QueryListContent } from "@/components/layout/QueryListContent";
import { ProducaoTable } from "@/components/producao/ProducaoTable";
import {
  ProducaoListToolbar,
  hasActiveProducaoFilters,
} from "@/components/producao/ProducaoListToolbar";
import { Button } from "@/components/ui/button";
import { ListPaginationBar } from "@/components/ui/pagination";
import { Plus, Building2, Milk } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { useAuth } from "@/contexts/AuthContext";
import { canRegistrarProducao } from "@/config/appAccess";
import { useFilterSync } from "@/hooks/useFilterSync";
import { useMobileInfiniteList } from "@/hooks/useMobileInfiniteList";
import { MobileInfiniteListFooter } from "@/components/layout/list/MobileInfiniteListFooter";
import type { ProducaoLeite } from "@/services/producao";
import { formatListCountSuffix } from "@/lib/filter-url";
import {
  defaultProducaoFilterState,
  producaoFilterFields,
  producaoLactacaoIdFromFilters,
  producaoResolvedPeriod,
} from "@/lib/producao-filter-sync";

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

function ProducaoContent() {
  const searchParams = useSearchParams();
  const { fazendaAtiva, isReady: fazendaReady, setFazendaAtiva } =
    useFazendaAtiva();
  const { user } = useAuth();
  const canRegister = canRegistrarProducao(user?.perfil);
  const fazendaId = fazendaAtiva?.id;

  const { filters, setFilters, clearFilters, hasActiveFilters } =
    useFilterSync({
      pathname: "/producao",
      defaults: defaultProducaoFilterState(),
      fields: producaoFilterFields,
      preserveParams: ["fazenda_id"],
    });

  const [pageSize, setPageSize] = useState<number>(25);
  const [offset, setOffset] = useState(0);

  const period = producaoResolvedPeriod(filters);
  const periodValid = period !== null;
  const lactacaoId = producaoLactacaoIdFromFilters(filters);

  useEffect(() => {
    const param = searchParams.get("fazenda_id");
    if (!param || !fazendaReady) return;
    const fid = Number(param);
    if (!fid || Number.isNaN(fid)) return;
    if (fazendaAtiva?.id === fid) return;

    let cancelled = false;
    (async () => {
      try {
        const fazendas = await getMinhasFazendas();
        const match = fazendas.find((f) => f.id === fid);
        if (!cancelled && match) {
          await setFazendaAtiva(match);
        }
      } catch {
        /* ignore */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, fazendaReady, fazendaAtiva?.id, setFazendaAtiva]);

  const listEnabled =
    fazendaReady && fazendaId != null && fazendaId > 0 && periodValid;

  const { data: lactacoes = [] } = useQuery({
    queryKey: ["lactacoes", fazendaId],
    queryFn: () => listByFazenda(fazendaId!),
    enabled: listEnabled,
  });

  const lactacoesById = useMemo(
    () => new Map(lactacoes.map((l) => [l.id, l])),
    [lactacoes],
  );

  const animalIds = useMemo(
    () => [...new Set(lactacoes.map((l) => l.animal_id))],
    [lactacoes],
  );
  const { animaisById } = useGestaoAnimaisByIdMap(fazendaId, animalIds);

  const { data: items = [], isLoading, error, refetch } = useQuery({
    queryKey: [
      "producao",
      "list",
      fazendaId,
      period?.start ?? filters.start,
      period?.end ?? filters.end,
      lactacaoId ?? null,
    ],
    queryFn: () =>
      listByDateRange(period!.start, period!.end, fazendaId!, lactacaoId),
    enabled: listEnabled,
  });

  const filterKey = `${filters.start}|${filters.end}|${pageSize}|${filters.lactacao_id}|${fazendaId}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    setOffset(0);
  }

  const mobileInfinite = useMobileInfiniteList<
    ProducaoLeite,
    { items: ProducaoLeite[]; total: number }
  >({
    queryKey: [
      "producao",
      "infinite",
      fazendaId,
      period?.start ?? filters.start,
      period?.end ?? filters.end,
      lactacaoId ?? null,
    ],
    enabled: listEnabled,
    pageSize,
    queryFn: async () => ({ items: [], total: 0 }),
    clientPages: {
      items,
      isLoading: !fazendaReady || isLoading,
    },
    getItemsFromPage: (page) => page.items,
    getTotalFromPage: (page) => page.total,
    resetDeps: [filterKey],
  });

  const { isDesktop } = mobileInfinite;

  const paginatedItems = useMemo(
    () => items.slice(offset, offset + pageSize),
    [items, offset, pageSize],
  );

  const displayItems = isDesktop ? paginatedItems : mobileInfinite.items;

  const filtersActive = hasActiveProducaoFilters(filters) || hasActiveFilters;

  const titleBase = fazendaAtiva
    ? `Produção de Leite — ${fazendaAtiva.nome}`
    : "Produção de Leite";
  const titleSuffix = formatListCountSuffix({
    filtered: items.length,
    total: items.length,
    filtersActive,
  });
  const title = `${titleBase}${titleSuffix}`;

  const showSelectFazendaMsg = fazendaReady && !fazendaAtiva;

  const { data: fazendasSemAtiva, isLoading: loadingFazendasCheck } = useQuery({
    queryKey: ["me", "fazendas"],
    queryFn: getMinhasFazendas,
    enabled: showSelectFazendaMsg,
  });

  return (
    <PageContainer variant="default">
      <ListCardLayout
        title={title}
        action={
          fazendaAtiva && canRegister ? (
            <Button asChild>
              <Link href={`/producao/novo?fazenda_id=${fazendaAtiva.id}`}>
                <Plus className="mr-2 h-4 w-4" />
                Registrar produção
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
              icon={Milk}
              title="Registre sua primeira produção"
              description="Antes disso, precisa de uma fazenda vinculada. Solicite ao administrador ou siga as orientações de onboarding."
              primaryAction={{
                label: "Ver orientações",
                href: "/onboarding",
              }}
            />
          ) : (
            <EmptyState
              icon={Building2}
              title="Selecione uma fazenda"
              description="Use o seletor no topo da página para ver e registar produção de leite dessa exploração."
            />
          )
        ) : (
          <div className="space-y-6">
            <ProducaoListToolbar
              values={filters}
              lactacoes={lactacoes}
              animaisById={animaisById}
              onChange={setFilters}
              onClear={clearFilters}
              hasActiveFilters={filtersActive}
            />

            <QueryListContent
              isLoading={
                !fazendaReady ||
                isLoading ||
                (!isDesktop &&
                  mobileInfinite.isLoading &&
                  mobileInfinite.items.length === 0)
              }
              error={error}
              errorFallback="Erro ao carregar registros de produção. Tente novamente."
              onRetry={() => void refetch()}
            >
              <ProducaoTable
                items={displayItems}
                fazendaId={fazendaId}
                showAnimal
                lactacoesById={lactacoesById}
                hasActiveFilters={filtersActive}
                onClearFilters={clearFilters}
                novoProducaoHref={
                  fazendaAtiva
                    ? `/producao/novo?fazenda_id=${fazendaAtiva.id}`
                    : undefined
                }
                canRegister={canRegister}
              />
            </QueryListContent>

            {items.length > 0 ? (
              <>
                <ListPaginationBar
                  className="hidden md:flex"
                  total={items.length}
                  pageSize={pageSize}
                  offset={offset}
                  pageSizeOptions={[...PAGE_SIZE_OPTIONS]}
                  onPageSizeChange={setPageSize}
                  onOffsetChange={setOffset}
                />
                <MobileInfiniteListFooter
                  sentinelRef={mobileInfinite.sentinelRef}
                  isFetchingNextPage={mobileInfinite.isFetchingNextPage}
                  allLoaded={mobileInfinite.allLoaded}
                  total={mobileInfinite.total}
                  hasItems={displayItems.length > 0}
                />
              </>
            ) : null}
          </div>
        )}
      </ListCardLayout>
    </PageContainer>
  );
}

export default function ProducaoPage() {
  return (
    <ProtectedRoute>
      <Suspense
        fallback={
          <PageContainer variant="default">
            <p className="text-muted-foreground">Carregando…</p>
          </PageContainer>
        }
      >
        <ProducaoContent />
      </Suspense>
    </ProtectedRoute>
  );
}
