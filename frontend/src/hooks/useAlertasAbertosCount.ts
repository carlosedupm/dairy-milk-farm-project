"use client";

import { useQuery } from "@tanstack/react-query";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { useHeaderVisibility } from "@/hooks/useHeaderVisibility";
import { alertasListQueryKey, listAlertas } from "@/services/alertas";

const ALERTAS_ABERTOS_COUNT_PARAMS = {
  status: "ABERTO" as const,
  limit: 1,
  offset: 0,
};

export function formatAlertasNavBadgeCount(count: number): string {
  if (count > 99) return "99+";
  return String(count);
}

export function alertasAbertosBadgeAriaLabel(count: number): string {
  if (count === 1) return "1 alerta pendente";
  return `${count} alertas pendentes`;
}

export function useAlertasAbertosCount(): number {
  const { fazendaAtiva } = useFazendaAtiva();
  const { showNavLinks } = useHeaderVisibility();
  const fazendaId = fazendaAtiva?.id ?? 0;

  const { data } = useQuery({
    queryKey: alertasListQueryKey(fazendaId, ALERTAS_ABERTOS_COUNT_PARAMS),
    queryFn: () => listAlertas(fazendaId, ALERTAS_ABERTOS_COUNT_PARAMS),
    enabled: fazendaId > 0 && showNavLinks,
  });

  return data?.total ?? 0;
}
