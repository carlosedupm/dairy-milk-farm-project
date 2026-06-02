import type { Gestacao } from "@/services/gestacoes";
import {
  filterByPeriodAndAnimal,
  gestaoPeriodFilterStateToParams,
  type GestaoPeriodFilterParams,
} from "@/lib/gestao-period-filter";
import {
  parseDateRange,
  parseOptionalInt,
  parseOptionalString,
} from "@/lib/filter-url";
import type { FilterFieldDef } from "@/hooks/useFilterSync";
import { isPartoPrevistoProximos7Dias } from "@/lib/gestacoesFilters";

export const GESTACAO_STATUS_ALL = "__all__";

export const GESTACAO_STATUS_OPTIONS = [
  "CONFIRMADA",
  "PERDA",
  "ABORTO",
  "PARTO_REALIZADO",
] as const;

export const GESTACAO_STATUS_LABELS: Record<string, string> = {
  CONFIRMADA: "Confirmada",
  PERDA: "Perda",
  ABORTO: "Aborto",
  PARTO_REALIZADO: "Parto realizado",
};

export type GestacoesFilterState = {
  animal_id: string;
  start: string;
  end: string;
  status: string;
  partos_dias: string;
};

export type GestacoesFilterParams = GestaoPeriodFilterParams & {
  status?: string;
  partosDias7?: boolean;
};

export const emptyGestacoesFilterState = (): GestacoesFilterState => ({
  animal_id: "",
  start: "",
  end: "",
  status: GESTACAO_STATUS_ALL,
  partos_dias: "",
});

export function gestacoesFilterStateToParams(
  state: GestacoesFilterState,
): GestacoesFilterParams {
  const period = gestaoPeriodFilterStateToParams(state);
  return {
    ...period,
    status:
      state.status !== GESTACAO_STATUS_ALL ? state.status : undefined,
    partosDias7: state.partos_dias === "7",
  };
}

export function hasActiveGestacoesFilters(
  params: GestacoesFilterParams,
): boolean {
  return (
    params.animalId != null ||
    Boolean(params.startDate && params.endDate) ||
    Boolean(params.status) ||
    params.partosDias7 === true
  );
}

export function countActiveGestacoesFilters(
  state: GestacoesFilterState,
): number {
  let count = 0;
  if (state.animal_id) count += 1;
  if (state.start || state.end) count += 1;
  if (state.status !== GESTACAO_STATUS_ALL) count += 1;
  if (state.partos_dias === "7") count += 1;
  return count;
}

export function filterGestações(
  items: Gestacao[],
  filters: GestacoesFilterParams,
): Gestacao[] {
  let list = items;
  if (filters.status) {
    list = list.filter((g) => g.status === filters.status);
  }
  if (filters.partosDias7) {
    list = list.filter((g) =>
      isPartoPrevistoProximos7Dias(g.data_prevista_parto),
    );
  }
  return filterByPeriodAndAnimal(
    list,
    filters,
    (item) => item.animal_id,
    (item) => item.data_prevista_parto ?? "",
  );
}

export const gestacoesFilterFields: FilterFieldDef<GestacoesFilterState>[] = [
  {
    key: "animal_id",
    param: "animal_id",
    parse: (raw) => {
      const id = parseOptionalInt(raw);
      return id != null ? String(id) : "";
    },
    serialize: (value) => (value ? value : null),
    isDefault: (value) => value === "",
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
  {
    key: "status",
    param: "status",
    parse: (raw) => {
      const trimmed = parseOptionalString(raw) ?? "";
      if (
        trimmed &&
        (GESTACAO_STATUS_OPTIONS as readonly string[]).includes(trimmed)
      ) {
        return trimmed;
      }
      return GESTACAO_STATUS_ALL;
    },
    serialize: (value) =>
      value !== GESTACAO_STATUS_ALL ? value : null,
    isDefault: (value) => value === GESTACAO_STATUS_ALL,
  },
  {
    key: "partos_dias",
    param: "partos_dias",
    parse: (raw) => (raw?.trim() === "7" ? "7" : ""),
    serialize: (value) => (value === "7" ? "7" : null),
    isDefault: (value) => value === "",
  },
];
