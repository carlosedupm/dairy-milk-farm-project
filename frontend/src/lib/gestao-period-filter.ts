import {
  parseDateRange,
  parseOptionalInt,
  parseOptionalString,
} from "@/lib/filter-url";
import type { FilterFieldDef } from "@/hooks/useFilterSync";

export type GestaoPeriodFilterState = {
  animal_id: string;
  start: string;
  end: string;
};

export type GestaoPeriodFilterParams = {
  animalId?: number;
  startDate?: string;
  endDate?: string;
};

export const emptyGestaoPeriodFilterState = (): GestaoPeriodFilterState => ({
  animal_id: "",
  start: "",
  end: "",
});

export function gestaoPeriodFilterStateToParams(
  state: GestaoPeriodFilterState,
): GestaoPeriodFilterParams {
  const range = parseDateRange(state.start, state.end);
  return {
    animalId: state.animal_id ? Number(state.animal_id) : undefined,
    startDate: range?.start,
    endDate: range?.end,
  };
}

export function hasActiveGestaoPeriodFilters(
  params: GestaoPeriodFilterParams,
): boolean {
  return (
    params.animalId != null ||
    Boolean(params.startDate && params.endDate)
  );
}

export function countActiveGestaoPeriodFilters(
  state: GestaoPeriodFilterState,
): number {
  let count = 0;
  if (state.animal_id) count += 1;
  if (state.start || state.end) count += 1;
  return count;
}

function toDateOnly(iso: string): string {
  return iso.slice(0, 10);
}

export function filterByPeriodAndAnimal<T>(
  items: T[],
  filters: GestaoPeriodFilterParams,
  getAnimalId: (item: T) => number,
  getDateValue: (item: T) => string,
): T[] {
  const dateFilterActive = Boolean(filters.startDate && filters.endDate);
  return items.filter((item) => {
    if (filters.animalId != null && getAnimalId(item) !== filters.animalId) {
      return false;
    }
    if (dateFilterActive) {
      const itemDate = toDateOnly(getDateValue(item));
      if (
        itemDate < filters.startDate! ||
        itemDate > filters.endDate!
      ) {
        return false;
      }
    }
    return true;
  });
}

export const gestaoPeriodFilterFields: FilterFieldDef<GestaoPeriodFilterState>[] =
  [
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
  ];

export function parseGestaoPeriodFromParams(
  params: URLSearchParams,
): GestaoPeriodFilterState {
  const defaults = emptyGestaoPeriodFilterState();
  for (const field of gestaoPeriodFilterFields) {
    defaults[field.key] = field.parse(
      params.get(field.param),
      params,
    ) as GestaoPeriodFilterState[typeof field.key];
  }
  return defaults;
}

export function gestaoPeriodFiltersFromStringParams(
  animalId?: string,
  start?: string,
  end?: string,
): GestaoPeriodFilterParams {
  const params = new URLSearchParams();
  if (animalId) params.set("animal_id", animalId);
  if (start) params.set("start", start);
  if (end) params.set("end", end);
  return gestaoPeriodFilterStateToParams(parseGestaoPeriodFromParams(params));
}

/** Campo de texto genérico para filtros simples (ex.: q em fazendas). */
export function stringFilterField<K extends string>(
  key: K,
  param: string,
): FilterFieldDef<Record<K, string>> {
  return {
    key,
    param,
    parse: (raw) => parseOptionalString(raw) ?? "",
    serialize: (value) => (value.trim() ? value.trim() : null),
    isDefault: (value) => value.trim() === "",
  };
}
