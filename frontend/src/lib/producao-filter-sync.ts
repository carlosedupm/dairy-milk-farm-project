import type { FilterFieldDef } from "@/hooks/useFilterSync";
import {
  parseDateRange,
  parseOptionalInt,
  serializeYmdParam,
} from "@/lib/filter-url";
import {
  getDefaultServerListPeriod,
  parseServerListPeriodEnd,
  parseServerListPeriodStart,
  resolveServerListPeriodForApi,
  type PeriodRange,
} from "@/lib/period-filter";
import {
  defaultProducaoFilterState,
  emptyProducaoFilterState,
  PRODUCAO_LACTACAO_ALL,
  type ProducaoFilterState,
} from "@/components/producao/ProducaoListToolbar";

export const producaoFilterFields: FilterFieldDef<ProducaoFilterState>[] = [
  {
    key: "start",
    param: "start",
    parse: (raw, params) => parseServerListPeriodStart(raw, params),
    serialize: (value) => serializeYmdParam(value),
    isDefault: (value) => value === getDefaultServerListPeriod().start,
  },
  {
    key: "end",
    param: "end",
    parse: (raw, params) => parseServerListPeriodEnd(raw, params),
    serialize: (value) => serializeYmdParam(value),
    isDefault: (value) => value === getDefaultServerListPeriod().end,
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

export {
  defaultProducaoFilterState,
  emptyProducaoFilterState,
  type ProducaoFilterState,
};

export function producaoLactacaoIdFromFilters(
  filters: ProducaoFilterState,
): number | undefined {
  if (filters.lactacao_id === PRODUCAO_LACTACAO_ALL) return undefined;
  const id = Number(filters.lactacao_id);
  return Number.isNaN(id) || id <= 0 ? undefined : id;
}

export function producaoResolvedPeriod(
  filters: ProducaoFilterState,
): PeriodRange | null {
  return resolveServerListPeriodForApi(filters.start, filters.end);
}

/** @deprecated Use producaoResolvedPeriod — mantido para compatibilidade pontual. */
export function producaoDateFilterActive(
  filters: ProducaoFilterState,
): boolean {
  return Boolean(parseDateRange(filters.start, filters.end));
}
