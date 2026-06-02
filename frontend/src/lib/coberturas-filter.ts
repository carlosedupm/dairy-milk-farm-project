import type { Cobertura } from "@/services/coberturas";
import type { FilterFieldDef } from "@/hooks/useFilterSync";
import {
  parseDateRange,
  parseOptionalInt,
  parseOptionalString,
} from "@/lib/filter-url";

const ALL_TIPOS = "__all__";

export type CoberturasUrlFilterState = {
  animal_id: string;
  tipo: string;
  start: string;
  end: string;
};

export const emptyCoberturasUrlFilterState = (): CoberturasUrlFilterState => ({
  animal_id: "",
  tipo: ALL_TIPOS,
  start: "",
  end: "",
});

export const coberturasFilterFields: FilterFieldDef<CoberturasUrlFilterState>[] =
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
      key: "tipo",
      param: "tipo",
      parse: (raw) => parseOptionalString(raw) ?? ALL_TIPOS,
      serialize: (value) => (value !== ALL_TIPOS ? value : null),
      isDefault: (value) => value === ALL_TIPOS,
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

export function countActiveCoberturaUrlFilters(
  state: CoberturasUrlFilterState,
): number {
  let count = 0;
  if (state.animal_id) count += 1;
  if (state.tipo !== ALL_TIPOS) count += 1;
  if (state.start || state.end) count += 1;
  return count;
}

export type CoberturaFilters = {
  animalId?: number;
  tipo?: string;
  startDate?: string;
  endDate?: string;
};

function toDateOnly(iso: string): string {
  return iso.slice(0, 10);
}

export function hasActiveCoberturaFilters(filters: CoberturaFilters): boolean {
  const dateFilterActive = Boolean(filters.startDate && filters.endDate);
  return (
    filters.animalId != null ||
    Boolean(filters.tipo) ||
    dateFilterActive
  );
}

export function filterCoberturas(
  items: Cobertura[],
  filters: CoberturaFilters,
): Cobertura[] {
  const dateFilterActive = Boolean(filters.startDate && filters.endDate);

  return items.filter((item) => {
    if (filters.animalId != null && item.animal_id !== filters.animalId) {
      return false;
    }
    if (filters.tipo && item.tipo !== filters.tipo) {
      return false;
    }
    if (dateFilterActive) {
      const itemDate = toDateOnly(item.data);
      if (itemDate < filters.startDate! || itemDate > filters.endDate!) {
        return false;
      }
    }
    return true;
  });
}
