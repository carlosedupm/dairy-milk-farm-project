"use client";

import { useMemo, useState } from "react";
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
  alertasFilterFields,
  alertasPeriodToApiParams,
  emptyAlertasFilterState,
  hasActiveAlertasFilters,
} from "@/components/alertas/alertas-utils";
import {
  alertasListQueryKey,
  listAlertas,
  updateAlertaStatus,
  type StatusAlerta,
} from "@/services/alertas";
import { useFilterSync } from "@/hooks/useFilterSync";

export function useAlertasPage() {
  const { fazendaAtiva, isReady: fazendaReady } = useFazendaAtiva();
  const { user } = useAuth();
  const perfil = user?.perfil;
  const queryClient = useQueryClient();
  const fazendaId = fazendaAtiva?.id ?? 0;

  const { data: animais = [] } = useAnimaisOperacionalList(fazendaId);

  const { filters, setFilter, clearFilters } = useFilterSync({
      pathname: "/alertas",
      defaults: emptyAlertasFilterState(),
      fields: alertasFilterFields,
    });

  const [offset, setOffset] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);

  const listParams = useMemo(() => {
    const period = alertasPeriodToApiParams(filters.start, filters.end);
    return {
      status:
        filters.status === ALERTAS_FILTER_ALL ? undefined : filters.status,
      tipo: filters.tipo === ALERTAS_FILTER_ALL ? undefined : filters.tipo,
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
    filters.tipo,
    filters.severidade,
    filters.start,
    filters.end,
    offset,
  ]);

  const filterKey = `${filters.status}|${filters.tipo}|${filters.severidade}|${filters.start}|${filters.end}`;
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
    hasActiveFilters: hasActiveAlertasFilters(filters),
    setStatusFilter: (status: string) => setFilter("status", status),
    setSeveridadeFilter: (severidade: string) =>
      setFilter("severidade", severidade),
    setStartDate: (start: string) => setFilter("start", start),
    setEndDate: (end: string) => setFilter("end", end),
    onTipoChange: (tipo: string) => setFilter("tipo", tipo),
    onClearFilters: clearFilters,
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
