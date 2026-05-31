"use client";

import Link from "next/link";
import { AnimalGestaoLabel } from "@/components/gestao/AnimalGestaoLabel";
import { GESTAO_REGISTRO_BAIXADO_MSG } from "@/components/gestao/gestaoRebanhoUtils";
import type { Animal } from "@/services/animais";

type Props = {
  animalId: number;
  animaisById: Map<number, Animal>;
  className?: string;
};

export function GestaoRegistroBaixadoAlert({
  animalId,
  animaisById,
  className,
}: Props) {
  return (
    <div
      role="status"
      className={
        className ??
        "rounded-md border border-feedback-warning/50 bg-feedback-warning/10 px-4 py-3 text-sm text-feedback-warning-foreground space-y-3"
      }
    >
      <p className="font-medium text-base text-foreground">
        <AnimalGestaoLabel animalId={animalId} animaisById={animaisById} />
      </p>
      <p>{GESTAO_REGISTRO_BAIXADO_MSG}</p>
      <Link
        href={`/animais/${animalId}`}
        className="font-medium text-primary underline-offset-4 hover:underline inline-flex min-h-[44px] items-center"
      >
        Abrir ficha do animal
      </Link>
    </div>
  );
}
