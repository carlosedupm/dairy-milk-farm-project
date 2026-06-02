import type { Lactacao } from "@/services/lactacoes";
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

export function filterLactacoes(
  items: Lactacao[],
  filters: GestaoPeriodFilterParams,
): Lactacao[] {
  return filterByPeriodAndAnimal(
    items,
    filters,
    (item) => item.animal_id,
    (item) => item.data_inicio,
  );
}
