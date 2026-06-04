"use client";

import { isAnimalForaDoRebanho, type Animal, type StatusSaude } from "@/services/animais";
import { Badge } from "@/components/ui/badge";
import { AnimalStatusSaudeBadge } from "@/components/animais/AnimalStatusSaudeBadge";
import { cn } from "@/lib/utils";
import { formatAnimalSearchLabel } from "@/components/animais/animalSearchUtils";

type Props = {
  animal: Animal;
  className?: string;
};

export function AnimalSearchResultLabel({ animal, className }: Props) {
  const baixado = isAnimalForaDoRebanho(animal);

  return (
    <span
      className={cn(
        "inline-flex flex-wrap items-center gap-2 min-w-0",
        className,
      )}
    >
      <span className="break-words">{formatAnimalSearchLabel(animal)}</span>
      {!baixado && animal.status_saude ? (
        <AnimalStatusSaudeBadge status={animal.status_saude as StatusSaude} />
      ) : null}
      {baixado ? (
        <Badge variant="secondary" className="shrink-0 text-xs">
          Baixado
        </Badge>
      ) : null}
    </span>
  );
}
