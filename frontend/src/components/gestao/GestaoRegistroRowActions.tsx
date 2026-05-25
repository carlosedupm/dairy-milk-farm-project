"use client";

import Link from "next/link";
import type { Animal } from "@/services/animais";
import { Button } from "@/components/ui/button";
import { isGestaoRegistroAnimalBaixado } from "@/components/gestao/gestaoRebanhoUtils";

type Props = {
  animalId: number;
  animaisById: Map<number, Animal>;
  /** Mapa da fazenda já incluiu lista + IDs em falta (evita Editar com cache stale). */
  animaisResolved?: boolean;
  editHref: string;
  onDelete: () => void;
};

/** Ações de linha em tabelas de Gestão — oculta Editar/Excluir se animal baixado. */
export function GestaoRegistroRowActions({
  animalId,
  animaisById,
  animaisResolved = true,
  editHref,
  onDelete,
}: Props) {
  if (!animaisResolved) {
    return (
      <span className="text-muted-foreground text-sm" aria-busy="true">
        …
      </span>
    );
  }

  if (isGestaoRegistroAnimalBaixado(animalId, animaisById)) {
    return (
      <Button variant="outline" size="default" asChild>
        <Link href={`/animais/${animalId}`}>Ver ficha</Link>
      </Button>
    );
  }

  return (
    <div className="flex justify-end gap-2 flex-wrap">
      <Button variant="outline" size="default" asChild>
        <Link href={editHref}>Editar</Link>
      </Button>
      <Button variant="destructive" size="default" onClick={onDelete}>
        Excluir
      </Button>
    </div>
  );
}
