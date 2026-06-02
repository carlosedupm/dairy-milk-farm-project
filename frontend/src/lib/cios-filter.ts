import type { Cio } from "@/services/cios";
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

export function filterCios(
  items: Cio[],
  filters: GestaoPeriodFilterParams,
): Cio[] {
  return filterByPeriodAndAnimal(
    items,
    filters,
    (item) => item.animal_id,
    (item) => item.data_detectado,
  );
}

export function ciosFilterStateFromGestaoState(
  state: GestaoPeriodFilterState,
): GestaoPeriodFilterParams {
  return gestaoPeriodFilterStateToParams(state);
}
