"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listByFazendaPaginated } from "@/services/animais";
import { get as getFazenda } from "@/services/fazendas";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
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

function FazendaAnimaisContent() {
  const params = useParams();
  const fazendaId = Number(params.id);

  const [pageSize, setPageSize] = useState(25);
  const [offset, setOffset] = useState(0);
  const [filters, setFilters] = useState<AnimaisFilterFormState>(() =>
    emptyAnimaisFilterForm()
  );

  const debouncedIdent = useDebouncedValue(filters.identificacao.trim(), 400);

  const loteNum = filters.lote_id ? Number.parseInt(filters.lote_id, 10) : 0;

  const {
    data: fazenda,
    isLoading: loadingFazenda,
    error: errorFazenda,
  } = useQuery({
    queryKey: ["fazendas", fazendaId],
    queryFn: () => getFazenda(fazendaId),
    enabled: !Number.isNaN(fazendaId),
  });

  const queryParams = useMemo(
    () => ({
      limit: pageSize,
      offset,
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
      debouncedIdent,
      filters.categoria,
      filters.sexo,
      filters.status_saude,
      filters.status_reprodutivo,
      loteNum,
    ]
  );

  const {
    data: paginated,
    isLoading: loadingAnimais,
    error: errorAnimais,
  } = useQuery({
    queryKey: ["fazendas", fazendaId, "animais", "paged", queryParams],
    queryFn: () => listByFazendaPaginated(fazendaId, queryParams),
    enabled: !Number.isNaN(fazendaId) && !!fazenda,
  });

  const items = paginated?.animais ?? [];
  const total = paginated?.total ?? 0;

  useEffect(() => {
    setOffset(0);
  }, [
    debouncedIdent,
    filters.categoria,
    filters.sexo,
    filters.status_saude,
    filters.status_reprodutivo,
    filters.lote_id,
    pageSize,
    fazendaId,
  ]);

  const listLoading = loadingFazenda || loadingAnimais;

  if (Number.isNaN(fazendaId)) {
    return (
      <PageContainer variant="default">
        <p className="text-destructive">ID da fazenda inválido.</p>
        <BackLink href="/fazendas">Voltar</BackLink>
      </PageContainer>
    );
  }

  if (errorFazenda || !fazenda) {
    return (
      <PageContainer variant="default">
        <p className="text-destructive">Fazenda não encontrada.</p>
        <BackLink href="/fazendas">Voltar</BackLink>
      </PageContainer>
    );
  }

  return (
    <PageContainer variant="default">
      <div className="mb-4">
        <BackLink href="/fazendas">Voltar às fazendas</BackLink>
      </div>
      <ListCardLayout
        title={`Animais da fazenda ${fazenda.nome}${total ? ` (${total})` : ""}`}
        action={
          <Button asChild>
            <Link href={`/animais/novo?fazenda_id=${fazendaId}`}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Animal
            </Link>
          </Button>
        }
      >
        <div className="space-y-6">
          <AnimaisListToolbar
            values={filters}
            onChange={setFilters}
            onClear={() => {
              setFilters(emptyAnimaisFilterForm());
              setOffset(0);
            }}
          />
          <QueryListContent
            isLoading={listLoading}
            error={errorAnimais}
            errorFallback="Erro ao carregar animais. Tente novamente."
          >
            <div className="space-y-4">
              <AnimalTable items={items} showFazenda={false} />
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
      </ListCardLayout>
    </PageContainer>
  );
}

export default function FazendaAnimaisPage() {
  return (
    <ProtectedRoute>
      <FazendaAnimaisContent />
    </ProtectedRoute>
  );
}
