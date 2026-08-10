import type { Animal } from "@/services/animais";
import {
  formatAnimalContextoMeta,
  formatAnimalContextoStatusLinha,
} from "@/components/animais/animalResumoUtils";

/** Rótulo compacto para resultados da busca global (identificação cadastrada, sem prefixos). */
export function formatAnimalSearchLabel(animal: Animal): string {
  return animal.identificacao.trim();
}

/** Normaliza identificação para comparação (trim + case-insensitive). */
export function normalizeIdentificacao(value: string): string {
  return value.trim().toLocaleLowerCase("pt-BR");
}

/**
 * Primeiro animal cuja identificação normalizada é igual ao termo.
 * A API já ordena match exacto primeiro (BR-ANIMAIS-012).
 */
export function findExactIdentificacaoMatch(
  animais: Animal[],
  termo: string,
): Animal | null {
  const normalizedTermo = normalizeIdentificacao(termo);
  if (!normalizedTermo) {
    return null;
  }
  return (
    animais.find(
      (animal) =>
        normalizeIdentificacao(animal.identificacao) === normalizedTermo,
    ) ?? null
  );
}

/**
 * Meta compacta para distinguir resultados semelhantes na lista:
 * categoria · sexo · raça (+ nasc. em cria) · status reprodutivo (se aplicável).
 */
export function formatAnimalSearchResultMeta(animal: Animal): string | null {
  const parts: string[] = [];
  const meta = formatAnimalContextoMeta(animal);
  if (meta) {
    parts.push(meta);
  }
  const status = formatAnimalContextoStatusLinha(animal);
  if (status) {
    parts.push(status);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}
