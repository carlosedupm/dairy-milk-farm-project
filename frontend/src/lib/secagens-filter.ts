import type { Secagem } from "@/services/secagens";
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

export function filterSecagens(
  items: Secagem[],
  filters: GestaoPeriodFilterParams,
): Secagem[] {
  return filterByPeriodAndAnimal(
    items,
    filters,
    (item) => item.animal_id,
    (item) => item.data_secagem,
  );
}
