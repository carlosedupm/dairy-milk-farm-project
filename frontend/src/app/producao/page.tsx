"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { list, listByDateRange } from "@/services/producao";
import { getMinhasFazendas } from "@/services/fazendas";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { ListCardLayout } from "@/components/layout/ListCardLayout";
import { QueryListContent } from "@/components/layout/QueryListContent";
import { ProducaoTable } from "@/components/producao/ProducaoTable";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { ListPaginationBar } from "@/components/ui/pagination";
import { Plus } from "lucide-react";
import { useFazendaAtiva } from "@/contexts/FazendaContext";

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

function ProducaoContent() {
  const searchParams = useSearchParams();
  const { fazendaAtiva, isReady: fazendaReady, setFazendaAtiva } =
    useFazendaAtiva();
  const fazendaId = fazendaAtiva?.id;

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [pageSize, setPageSize] = useState<number>(25);
  const [offset, setOffset] = useState(0);

  const dateFilterActive = Boolean(startDate && endDate);

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
  }, [
    searchParams,
    fazendaReady,
    fazendaAtiva?.id,
    setFazendaAtiva,
  ]);

  const listEnabled = fazendaReady && fazendaId != null && fazendaId > 0;

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: [
      "producao",
      "list",
      fazendaId,
      dateFilterActive ? startDate : null,
      dateFilterActive ? endDate : null,
    ],
    queryFn: () =>
      dateFilterActive
        ? listByDateRange(startDate, endDate, fazendaId!)
        : list({ fazenda_id: fazendaId! }),
    enabled: listEnabled,
  });

  const filterKey = `${startDate}|${endDate}|${pageSize}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    setOffset(0);
  }

  const paginatedItems = useMemo(() => {
    return items.slice(offset, offset + pageSize);
  }, [items, offset, pageSize]);

  const titleBase = fazendaAtiva
    ? `Produção de Leite — ${fazendaAtiva.nome}`
    : "Produção de Leite";
  const title =
    items.length > 0 ? `${titleBase} (${items.length})` : titleBase;

  const showSelectFazendaMsg = fazendaReady && !fazendaAtiva;

  const { data: fazendasSemAtiva, isLoading: loadingFazendasCheck } = useQuery({
    queryKey: ["me", "fazendas"],
    queryFn: getMinhasFazendas,
    enabled: showSelectFazendaMsg,
  });

  const clearDateFilter = () => {
    setStartDate("");
    setEndDate("");
  };

  return (
    <PageContainer variant="default">
      <ListCardLayout
        title={title}
        action={
          fazendaAtiva ? (
            <Button asChild>
              <Link href={`/producao/novo?fazenda_id=${fazendaAtiva.id}`}>
                <Plus className="mr-2 h-4 w-4" />
                Registrar Produção
              </Link>
            </Button>
          ) : null
        }
      >
        {showSelectFazendaMsg ? (
          loadingFazendasCheck ? (
            <p className="text-muted-foreground">Carregando…</p>
          ) : fazendasSemAtiva?.length === 0 ? (
            <p className="text-muted-foreground">
              Nenhuma fazenda vinculada ao seu usuário. Solicite ao administrador
              o acesso ou utilize a página de onboarding.
            </p>
          ) : (
            <p className="text-muted-foreground">
              Selecione uma fazenda no topo da página para ver os registros de
              produção vinculados a ela.
            </p>
          )
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="producao-filter-start">Data inicial</Label>
                <DatePicker
                  id="producao-filter-start"
                  value={startDate}
                  onChange={setStartDate}
                  placeholder="Selecione a data inicial"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="producao-filter-end">Data final</Label>
                <DatePicker
                  id="producao-filter-end"
                  value={endDate}
                  onChange={setEndDate}
                  placeholder="Selecione a data final"
                />
              </div>
              <div className="flex flex-wrap gap-2 sm:col-span-2">
                {dateFilterActive ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-[44px]"
                    onClick={clearDateFilter}
                  >
                    Limpar período
                  </Button>
                ) : null}
              </div>
            </div>

            <QueryListContent
              isLoading={!fazendaReady || isLoading}
              error={error}
              errorFallback="Erro ao carregar registros de produção. Tente novamente."
            >
              <ProducaoTable
                items={paginatedItems}
                fazendaId={fazendaId}
                showAnimal
              />
            </QueryListContent>

            {items.length > 0 ? (
              <ListPaginationBar
                total={items.length}
                pageSize={pageSize}
                offset={offset}
                pageSizeOptions={[...PAGE_SIZE_OPTIONS]}
                onPageSizeChange={setPageSize}
                onOffsetChange={setOffset}
              />
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
      <ProducaoContent />
    </ProtectedRoute>
  );
}
