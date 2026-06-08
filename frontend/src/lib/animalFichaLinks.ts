import type { TimelineFilterTipo } from "@/services/animais";
import type { AnimalFichaTab } from "@/components/animais/ficha/animalFichaTabs";

/** Tab Ciclo — hub do ciclo reprodutivo na ficha. */
export function animalFichaCicloHref(animalId: number | string): string {
  return `/animais/${animalId}?tab=ciclo`;
}

export function animalFichaHistoricoHref(
  animalId: number | string,
  tipo: TimelineFilterTipo = "todos",
): string {
  const base = `/animais/${animalId}?tab=historico`;
  if (tipo === "todos") {
    return base;
  }
  return `${base}&tipo=${tipo}`;
}

export function animalFichaTabHrefWithParams(
  animalId: number | string,
  tab: AnimalFichaTab,
  extra?: { tipo?: TimelineFilterTipo },
): string {
  const base = `/animais/${animalId}`;
  if (tab === "geral") {
    return base;
  }
  const params = new URLSearchParams({ tab });
  if (tab === "historico" && extra?.tipo && extra.tipo !== "todos") {
    params.set("tipo", extra.tipo);
  }
  return `${base}?${params.toString()}`;
}
