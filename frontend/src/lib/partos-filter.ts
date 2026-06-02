import type { Parto } from "@/services/partos";
import {
  filterByPeriodAndAnimal,
  gestaoPeriodFilterStateToParams,
  hasActiveGestaoPeriodFilters,
  type GestaoPeriodFilterParams,
  type GestaoPeriodFilterState,
} from "@/lib/gestao-period-filter";

export type { GestaoPeriodFilterParams, GestaoPeriodFilterState };

export {
  emptyGestaoPeriodFilterState,
  gestaoPeriodFilterFields,
  gestaoPeriodFilterStateToParams,
  hasActiveGestaoPeriodFilters,
  countActiveGestaoPeriodFilters,
} from "@/lib/gestao-period-filter";

export function filterPartos(
  items: Parto[],
  filters: GestaoPeriodFilterParams,
): Parto[] {
  return filterByPeriodAndAnimal(
    items,
    filters,
    (item) => item.animal_id,
    (item) => item.data,
  );
}
