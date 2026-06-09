"use client";

import { isAnimalForaDoRebanho, type Animal } from "@/services/animais";
import { AnimalBaixadoBadge } from "@/components/animais/AnimalBaixadoBadge";
import { cn } from "@/lib/utils";

type Props = {
  animalId: number;
  animaisById: Map<number, Animal>;
  className?: string;
};

export function AnimalGestaoLabel({
  animalId,
  animaisById,
  className,
}: Props) {
  const animal = animaisById.get(animalId);
  const ident = animal?.identificacao ?? `Animal ${animalId}`;
  const baixado = animal ? isAnimalForaDoRebanho(animal) : false;

  return (
    <span
      className={cn(
        "inline-flex flex-wrap items-center gap-2 min-w-0",
        className,
      )}
    >
      <span className="break-words">{ident}</span>
      {baixado ? <AnimalBaixadoBadge /> : null}
    </span>
  );
}
