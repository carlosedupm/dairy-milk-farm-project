import type { Animal } from "@/services/animais";

/** Rótulo compacto para resultados da busca global (identificação cadastrada, sem prefixos). */
export function formatAnimalSearchLabel(animal: Animal): string {
  return animal.identificacao.trim();
}
