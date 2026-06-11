import type { TimelineFilterTipo } from "@/services/animais";

export const ANIMAL_FICHA_TABS = [
  "geral",
  "ciclo",
  "saude",
  "vacinas",
  "hormonio-lactacao",
  "producao",
  "historico",
] as const;

export type AnimalFichaTab = (typeof ANIMAL_FICHA_TABS)[number];

export const ANIMAL_FICHA_TAB_LABELS: Record<AnimalFichaTab, string> = {
  geral: "Visão Geral",
  ciclo: "Ciclo",
  saude: "Saúde",
  vacinas: "Vacinas",
  "hormonio-lactacao": "Hormônio lactação",
  producao: "Produção",
  historico: "Histórico",
};

const TIMELINE_FILTER_VALUES: TimelineFilterTipo[] = [
  "todos",
  "saude",
  "alertas",
  "vacinas",
  "hormonio_lactacao",
];

export function parseTimelineFilterTipo(
  value: string | null | undefined,
): TimelineFilterTipo {
  if (value && TIMELINE_FILTER_VALUES.includes(value as TimelineFilterTipo)) {
    return value as TimelineFilterTipo;
  }
  return "todos";
}

/** Resolve tab efectiva; `historico&tipo=ciclo` redireciona conceptualmente para tab ciclo. */
export function parseAnimalFichaTab(
  tabValue: string | null | undefined,
  tipoValue?: string | null,
): AnimalFichaTab {
  if (tabValue === "historico" && tipoValue === "ciclo") {
    return "ciclo";
  }
  if (tabValue && ANIMAL_FICHA_TABS.includes(tabValue as AnimalFichaTab)) {
    return tabValue as AnimalFichaTab;
  }
  return "geral";
}

export function animalFichaTabHref(
  animalId: number | string,
  tab: AnimalFichaTab,
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

export function animalFichaVacinasTabHref(animalId: number | string): string {
  return animalFichaTabHref(animalId, "vacinas");
}

export function animalFichaHormonioLactacaoTabHref(
  animalId: number | string,
): string {
  return animalFichaTabHref(animalId, "hormonio-lactacao");
}

export function animalFichaCicloTabHref(animalId: number | string): string {
  return animalFichaTabHref(animalId, "ciclo");
}
