import {
  SEVERIDADE_ALERTA_LABELS,
  SEVERIDADES_ALERTA,
  STATUS_ALERTA,
  STATUS_ALERTA_LABELS,
  TIPOS_ALERTA,
  TIPO_ALERTA_LABELS,
  type SeveridadeAlerta,
  type StatusAlerta,
  type TipoAlerta,
} from "@/services/alertas";
import type { FilterFieldDef } from "@/hooks/useFilterSync";
import { parseDateRange, parseOptionalString } from "@/lib/filter-url";

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
  start: string;
  end: string;
};

export function emptyAlertasFilterState(): AlertasFilterState {
  return {
    status: ALERTAS_FILTER_ALL,
    tipo: ALERTAS_FILTER_ALL,
    severidade: ALERTAS_FILTER_ALL,
    start: "",
    end: "",
  };
}

export const alertasFilterFields: FilterFieldDef<AlertasFilterState>[] = [
  {
    key: "status",
    param: "status",
    parse: (raw) => {
      const trimmed = parseOptionalString(raw) ?? "";
      if (trimmed && (STATUS_ALERTA as readonly string[]).includes(trimmed)) {
        return trimmed;
      }
      return ALERTAS_FILTER_ALL;
    },
    serialize: (value) =>
      value !== ALERTAS_FILTER_ALL ? value : null,
    isDefault: (value) => value === ALERTAS_FILTER_ALL,
  },
  {
    key: "tipo",
    param: "tipo",
    parse: (raw) => {
      const trimmed = parseOptionalString(raw) ?? "";
      if (trimmed && isValidAlertaTipoFilter(trimmed)) {
        return trimmed;
      }
      return ALERTAS_FILTER_ALL;
    },
    serialize: (value) =>
      value !== ALERTAS_FILTER_ALL ? value : null,
    isDefault: (value) => value === ALERTAS_FILTER_ALL,
  },
  {
    key: "severidade",
    param: "severidade",
    parse: (raw) => {
      const trimmed = parseOptionalString(raw) ?? "";
      if (
        trimmed &&
        (SEVERIDADES_ALERTA as readonly string[]).includes(trimmed)
      ) {
        return trimmed;
      }
      return ALERTAS_FILTER_ALL;
    },
    serialize: (value) =>
      value !== ALERTAS_FILTER_ALL ? value : null,
    isDefault: (value) => value === ALERTAS_FILTER_ALL,
  },
  {
    key: "start",
    param: "start",
    parse: (raw, params) => {
      const range = parseDateRange(raw, params.get("end"));
      return range?.start ?? "";
    },
    serialize: (value, state) => {
      const range = parseDateRange(value, state.end);
      return range?.start ?? null;
    },
    isDefault: (value) => value === "",
  },
  {
    key: "end",
    param: "end",
    parse: (raw, params) => {
      const range = parseDateRange(params.get("start"), raw);
      return range?.end ?? "";
    },
    serialize: (value, state) => {
      const range = parseDateRange(state.start, value);
      return range?.end ?? null;
    },
    isDefault: (value) => value === "",
  },
];

export function countActiveAlertasFilters(
  filters: AlertasFilterState,
): number {
  let count = 0;
  if (filters.status !== ALERTAS_FILTER_ALL) count += 1;
  if (filters.tipo !== ALERTAS_FILTER_ALL) count += 1;
  if (filters.severidade !== ALERTAS_FILTER_ALL) count += 1;
  if (filters.start || filters.end) count += 1;
  return count;
}

/** Envia start/end à API apenas quando ambas as datas estão preenchidas. */
export function alertasPeriodToApiParams(
  start: string,
  end: string,
): { start?: string; end?: string } {
  const range = parseDateRange(start, end);
  if (!range) return {};
  return { start: range.start, end: range.end };
}

export function hasActiveAlertasFilters(
  filters: AlertasFilterState,
): boolean {
  return (
    filters.status !== ALERTAS_FILTER_ALL ||
    filters.tipo !== ALERTAS_FILTER_ALL ||
    filters.severidade !== ALERTAS_FILTER_ALL ||
    filters.start !== "" ||
    filters.end !== ""
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
