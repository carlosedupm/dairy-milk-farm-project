import type { FilterFieldDef } from "@/hooks/useFilterSync";
import { parseDateRange, parseOptionalInt } from "@/lib/filter-url";
import {
  emptyProducaoFilterState,
  PRODUCAO_LACTACAO_ALL,
  type ProducaoFilterState,
} from "@/components/producao/ProducaoListToolbar";

export const producaoFilterFields: FilterFieldDef<ProducaoFilterState>[] = [
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
    key: "lactacao_id",
    param: "lactacao_id",
    parse: (raw) => {
      const id = parseOptionalInt(raw);
      return id != null ? String(id) : PRODUCAO_LACTACAO_ALL;
    },
    serialize: (value) =>
      value !== PRODUCAO_LACTACAO_ALL ? value : null,
    isDefault: (value) => value === PRODUCAO_LACTACAO_ALL,
  },
];

export { emptyProducaoFilterState, type ProducaoFilterState };

export function producaoLactacaoIdFromFilters(
  filters: ProducaoFilterState,
): number | undefined {
  if (filters.lactacao_id === PRODUCAO_LACTACAO_ALL) return undefined;
  const id = Number(filters.lactacao_id);
  return Number.isNaN(id) || id <= 0 ? undefined : id;
}

export function producaoDateFilterActive(filters: ProducaoFilterState): boolean {
  return Boolean(parseDateRange(filters.start, filters.end));
}
