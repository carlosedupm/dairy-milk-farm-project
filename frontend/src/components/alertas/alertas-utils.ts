import {
  SEVERIDADE_ALERTA_LABELS,
  STATUS_ALERTA_LABELS,
  TIPOS_ALERTA,
  TIPO_ALERTA_LABELS,
  type SeveridadeAlerta,
  type StatusAlerta,
  type TipoAlerta,
} from "@/services/alertas";

export const ALERTAS_FILTER_ALL = "__all__";
export const ALERTAS_PAGE_SIZE = 25;

export const SEVERIDADE_BADGE_VARIANT: Record<
  string,
  "destructive" | "secondary" | "outline" | "default"
> = {
  CRITICA: "destructive",
  ALTA: "destructive",
  MEDIA: "secondary",
  BAIXA: "outline",
};

export type AlertasFilterState = {
  status: string;
  tipo: string;
  severidade: string;
};

export function emptyAlertasFilterState(): AlertasFilterState {
  return {
    status: ALERTAS_FILTER_ALL,
    tipo: ALERTAS_FILTER_ALL,
    severidade: ALERTAS_FILTER_ALL,
  };
}

export function hasActiveAlertasFilters(
  filters: AlertasFilterState,
  tipoFromUrl: TipoAlerta | null = null
): boolean {
  if (tipoFromUrl) return true;
  return (
    filters.status !== ALERTAS_FILTER_ALL ||
    filters.tipo !== ALERTAS_FILTER_ALL ||
    filters.severidade !== ALERTAS_FILTER_ALL
  );
}

export function isValidAlertaTipoFilter(t: string): t is TipoAlerta {
  return (TIPOS_ALERTA as readonly string[]).includes(t);
}

export function alertaTipoLabel(t: string): string {
  return TIPO_ALERTA_LABELS[t as TipoAlerta] ?? t;
}

export function alertaSeveridadeLabel(s: string): string {
  return SEVERIDADE_ALERTA_LABELS[s as SeveridadeAlerta] ?? s;
}

export function alertaStatusLabel(s: string): string {
  return STATUS_ALERTA_LABELS[s as StatusAlerta] ?? s;
}
