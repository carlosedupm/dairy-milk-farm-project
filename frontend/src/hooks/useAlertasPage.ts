"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import {
  canCriarAlertaManual,
  canExcluirAlerta,
  canMarcarAlertaEmAndamento,
  canResolverAlerta,
} from "@/config/appAccess";
import { useAnimaisOperacionalList } from "@/components/gestao/useAnimaisMap";
import {
  ALERTAS_FILTER_ALL,
  ALERTAS_PAGE_SIZE,
  alertasFiltersFromSearchParams,
  alertasPeriodToApiParams,
  emptyAlertasFilterState,
  hasActiveAlertasFilters,
  isValidAlertaTipoFilter,
} from "@/components/alertas/alertas-utils";
import {
  alertasListQueryKey,
  listAlertas,
  updateAlertaStatus,
  type StatusAlerta,
} from "@/services/alertas";

export function useAlertasPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { fazendaAtiva, isReady: fazendaReady } = useFazendaAtiva();
  const { user } = useAuth();
  const perfil = user?.perfil;
  const queryClient = useQueryClient();
  const fazendaId = fazendaAtiva?.id ?? 0;

  const { data: animais = [] } = useAnimaisOperacionalList(fazendaId);

  const tipoParam = searchParams.get("tipo");
  const tipoFromUrl =
    tipoParam && isValidAlertaTipoFilter(tipoParam) ? tipoParam : null;

  const [filters, setFilters] = useState(() =>
    alertasFiltersFromSearchParams(searchParams),
  );
  const activeTipoFilter = tipoFromUrl ?? filters.tipo;
  const [offset, setOffset] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);

  const listParams = useMemo(() => {
    const period = alertasPeriodToApiParams(
      filters.startDate,
      filters.endDate,
    );
    return {
      status:
        filters.status === ALERTAS_FILTER_ALL ? undefined : filters.status,
      tipo:
        activeTipoFilter === ALERTAS_FILTER_ALL ? undefined : activeTipoFilter,
      severidade:
        filters.severidade === ALERTAS_FILTER_ALL
          ? undefined
          : filters.severidade,
      ...period,
      limit: ALERTAS_PAGE_SIZE,
      offset,
    };
  }, [
    filters.status,
    filters.severidade,
    filters.startDate,
    filters.endDate,
    activeTipoFilter,
    offset,
  ]);

  const filterKey = `${filters.status}|${activeTipoFilter}|${filters.severidade}|${filters.startDate}|${filters.endDate}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    setOffset(0);
  }

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: alertasListQueryKey(fazendaId, listParams),
    queryFn: () => listAlertas(fazendaId, listParams),
    enabled: fazendaId > 0,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["alertas", fazendaId] });
  };

  const statusMutation = useMutation({
    mutationFn: ({
      alertaId,
      status,
    }: {
      alertaId: number;
      status: StatusAlerta;
    }) => updateAlertaStatus(fazendaId, alertaId, status),
    onSuccess: invalidate,
  });

  const handleStatusChange = (alertaId: number, status: StatusAlerta) => {
    statusMutation.mutate({ alertaId, status });
  };

  const handleTipoChange = (value: string) => {
    setFilters((f) => ({ ...f, tipo: value }));
    if (tipoFromUrl) {
      router.replace("/alertas", { scroll: false });
    }
  };

  const handleClearFilters = () => {
    setFilters(emptyAlertasFilterState());
    if (tipoFromUrl || searchParams.get("status") || searchParams.get("severidade")) {
      router.replace("/alertas", { scroll: false });
    }
  };

  const hasActiveFilters = hasActiveAlertasFilters(filters, tipoFromUrl);

  return {
    fazendaReady,
    fazendaAtiva,
    fazendaId,
    animais,
    alertas: data?.alertas ?? [],
    total: data?.total ?? 0,
    isLoading,
    isFetching,
    error,
    refetch,
    offset,
    setOffset,
    pageSize: ALERTAS_PAGE_SIZE,
    filters,
    activeTipoFilter,
    hasActiveFilters,
    setStatusFilter: (status: string) =>
      setFilters((f) => ({ ...f, status })),
    setSeveridadeFilter: (severidade: string) =>
      setFilters((f) => ({ ...f, severidade })),
    setStartDate: (startDate: string) =>
      setFilters((f) => ({ ...f, startDate })),
    setEndDate: (endDate: string) =>
      setFilters((f) => ({ ...f, endDate })),
    onTipoChange: handleTipoChange,
    onClearFilters: handleClearFilters,
    canCreate: canCriarAlertaManual(perfil),
    canResolve: canResolverAlerta(perfil),
    canEmAndamento: canMarcarAlertaEmAndamento(perfil),
    canDelete: canExcluirAlerta(perfil),
    statusMutation,
    onStatusChange: handleStatusChange,
    invalidate,
    createOpen,
    setCreateOpen,
  };
}
