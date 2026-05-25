import {
  type Animal,
  type StatusReprodutivo,
  STATUS_REPRODUTIVO_LABELS,
  getCategoriaLabel,
  isAnimalForaDoRebanho,
} from "@/services/animais";

export const ANIMAL_SELECT_MAX_VISIBLE = 50;

export type AnimalSelectFilterOptions = {
  query?: string;
  femeasOnly?: boolean;
  reprodutoresOnly?: boolean;
  /** Exclui animais com baixa efetiva */
  semDataSaida?: boolean;
};

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

function getStatusReprodutivoLabel(status?: string | null): string {
  if (!status) return "";
  return (
    STATUS_REPRODUTIVO_LABELS[status as StatusReprodutivo] ?? status
  );
}

/** Texto pesquisável de um animal (identificação, raça, categorias, status). */
export function getAnimalSearchableText(animal: Animal): string {
  const parts = [
    animal.identificacao,
    animal.raca ?? "",
    getCategoriaLabel(animal.categoria),
    animal.categoria ?? "",
    getStatusReprodutivoLabel(animal.status_reprodutivo),
    animal.status_reprodutivo ?? "",
  ];
  return normalizeSearchText(parts.filter(Boolean).join(" "));
}

export function applyAnimalProfileFilters(
  animais: Animal[],
  options: Pick<
    AnimalSelectFilterOptions,
    "femeasOnly" | "reprodutoresOnly" | "semDataSaida"
  >,
): Animal[] {
  const { femeasOnly, reprodutoresOnly, semDataSaida } = options;
  let list = animais;
  if (semDataSaida) {
    list = list.filter((a) => !isAnimalForaDoRebanho(a));
  }
  if (femeasOnly) {
    return list.filter((a) => a.sexo === "F");
  }
  if (reprodutoresOnly) {
    return list.filter(
      (a) =>
        a.sexo === "M" &&
        (a.categoria === "TOURO" || a.categoria === "BOI"),
    );
  }
  return list;
}

export function sortAnimaisByIdentificacao(animais: Animal[]): Animal[] {
  return [...animais].sort((a, b) =>
    a.identificacao.localeCompare(b.identificacao, "pt-BR", {
      numeric: true,
    }),
  );
}

export function filterAnimais(
  animais: Animal[],
  options: AnimalSelectFilterOptions = {},
): Animal[] {
  const { query = "", femeasOnly, reprodutoresOnly, semDataSaida } = options;
  const profileFiltered = applyAnimalProfileFilters(animais, {
    femeasOnly,
    reprodutoresOnly,
    semDataSaida,
  });
  const sorted = sortAnimaisByIdentificacao(profileFiltered);

  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return sorted;
  }

  return sorted.filter((animal) =>
    getAnimalSearchableText(animal).includes(normalizedQuery),
  );
}

/** Label principal exibido no trigger e nas opções. */
export function formatAnimalOptionLabel(animal: Animal): string {
  const parts = [animal.identificacao];
  if (animal.raca) {
    parts.push(`(${animal.raca})`);
  }
  const categoria = getCategoriaLabel(animal.categoria);
  if (categoria && categoria !== "—") {
    parts.push(`· ${categoria}`);
  }
  return parts.join(" ");
}
