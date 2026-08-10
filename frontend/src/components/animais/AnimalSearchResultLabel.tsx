"use client";

import type { ReactNode } from "react";
import { isAnimalForaDoRebanho, type Animal, type StatusSaude } from "@/services/animais";
import { AnimalBaixadoBadge } from "@/components/animais/AnimalBaixadoBadge";
import { AnimalStatusSaudeBadge } from "@/components/animais/AnimalStatusSaudeBadge";
import { cn } from "@/lib/utils";
import {
  formatAnimalSearchLabel,
  formatAnimalSearchResultMeta,
  normalizeIdentificacao,
} from "@/components/animais/animalSearchUtils";

type Props = {
  animal: Animal;
  /** Termo digitado — destaca a ocorrência na identificação quando possível. */
  highlightTermo?: string;
  /** Mostra linha meta (categoria · sexo · …) para distinguir IDs semelhantes. */
  showMeta?: boolean;
  className?: string;
};

function highlightIdentificacao(
  identificacao: string,
  termo: string | undefined,
): ReactNode {
  const label = identificacao.trim();
  const normalizedTermo = termo ? normalizeIdentificacao(termo) : "";
  if (!normalizedTermo) {
    return label;
  }
  const lower = label.toLocaleLowerCase("pt-BR");
  const idx = lower.indexOf(normalizedTermo);
  if (idx < 0) {
    return label;
  }
  const end = idx + normalizedTermo.length;
  return (
    <>
      {label.slice(0, idx)}
      <mark className="rounded-sm bg-primary/15 px-0.5 font-semibold text-foreground">
        {label.slice(idx, end)}
      </mark>
      {label.slice(end)}
    </>
  );
}

export function AnimalSearchResultLabel({
  animal,
  highlightTermo,
  showMeta = false,
  className,
}: Props) {
  const baixado = isAnimalForaDoRebanho(animal);
  const meta = showMeta ? formatAnimalSearchResultMeta(animal) : null;

  return (
    <span
      className={cn(
        "flex min-w-0 flex-col items-start gap-0.5 text-left",
        className,
      )}
    >
      <span className="inline-flex min-w-0 flex-wrap items-center gap-2">
        <span className="break-words">
          {highlightIdentificacao(
            formatAnimalSearchLabel(animal),
            highlightTermo,
          )}
        </span>
        {!baixado && animal.status_saude ? (
          <AnimalStatusSaudeBadge status={animal.status_saude as StatusSaude} />
        ) : null}
        {baixado ? <AnimalBaixadoBadge /> : null}
      </span>
      {meta ? (
        <span className="break-words text-sm font-normal text-muted-foreground">
          {meta}
        </span>
      ) : null}
    </span>
  );
}
