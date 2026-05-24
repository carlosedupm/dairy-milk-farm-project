import type { Cobertura } from "@/services/coberturas";

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
