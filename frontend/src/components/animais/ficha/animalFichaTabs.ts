export const ANIMAL_FICHA_TABS = [
  "geral",
  "saude",
  "producao",
  "historico",
] as const;

export type AnimalFichaTab = (typeof ANIMAL_FICHA_TABS)[number];

export const ANIMAL_FICHA_TAB_LABELS: Record<AnimalFichaTab, string> = {
  geral: "Visão Geral",
  saude: "Saúde",
  producao: "Produção",
  historico: "Histórico",
};

export function parseAnimalFichaTab(
  value: string | null | undefined
): AnimalFichaTab {
  if (value && ANIMAL_FICHA_TABS.includes(value as AnimalFichaTab)) {
    return value as AnimalFichaTab;
  }
  return "geral";
}

export function animalFichaTabHref(
  animalId: number | string,
  tab: AnimalFichaTab
): string {
  const base = `/animais/${animalId}`;
  if (tab === "geral") {
    return base;
  }
  return `${base}?tab=${tab}`;
}

export function animalFichaSaudeTabHref(animalId: number | string): string {
  return animalFichaTabHref(animalId, "saude");
}
