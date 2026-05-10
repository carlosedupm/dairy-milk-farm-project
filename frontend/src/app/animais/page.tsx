"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { listPaginated } from "@/services/animais";
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
import { Plus } from "lucide-react";
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
    ]
  );

  const listEnabled = fazendaReady && fazendaId != null && fazendaId > 0;

  const { data, isLoading, error } = useQuery({
    queryKey: ["animais", "list", queryParams],
    queryFn: () => listPaginated(queryParams),
    enabled: listEnabled,
  });

  const items = data?.animais ?? [];
  const total = data?.total ?? 0;

  const filterKey = `${debouncedIdent}|${fazendaId ?? ""}|${filters.categoria}|${filters.sexo}|${filters.status_saude}|${filters.status_reprodutivo}|${filters.lote_id}|${pageSize}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    setOffset(0);
  }

  const titleBase = fazendaAtiva
    ? `Animais — ${fazendaAtiva.nome}`
    : "Animais";
  const title =
    total > 0 ? `${titleBase} (${total})` : titleBase;

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
            <p className="text-muted-foreground">
              Nenhuma fazenda vinculada ao seu usuário. Solicite ao administrador
              o acesso ou utilize a página de onboarding.
            </p>
          ) : (
            <p className="text-muted-foreground">
              Selecione uma fazenda no topo da página para ver os animais
              vinculados a ela.
            </p>
          )
        ) : (
          <div className="space-y-6">
            <AnimaisListToolbar
              values={filters}
              onChange={setFilters}
              resultCount={total}
              listLoading={!fazendaReady || isLoading}
              onClear={() => {
                setFilters(emptyAnimaisFilterForm());
                setOffset(0);
              }}
            />
            <QueryListContent
              isLoading={!fazendaReady || isLoading}
              error={error}
              errorFallback="Erro ao carregar animais. Tente novamente."
            >
              <div className="space-y-4">
                <AnimalTable items={items} canManage={canManageAnimais} />
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
