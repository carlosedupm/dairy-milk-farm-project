"use client";

import { isAnimalForaDoRebanho, type Animal } from "@/services/animais";
import { Badge } from "@/components/ui/badge";
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
      {baixado ? (
        <Badge variant="secondary" className="shrink-0 text-xs">
          Baixado
        </Badge>
      ) : null}
    </span>
  );
}
