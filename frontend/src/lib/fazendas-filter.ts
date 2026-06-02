import type { Fazenda } from "@/services/fazendas";

export function filterFazendas(items: Fazenda[], query: string): Fazenda[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((f) => f.nome.toLowerCase().includes(q));
}

export function hasActiveFazendasFilter(query: string): boolean {
  return query.trim().length > 0;
}

export type FazendasFilterState = {
  q: string;
};

export const emptyFazendasFilterState = (): FazendasFilterState => ({
  q: "",
});
