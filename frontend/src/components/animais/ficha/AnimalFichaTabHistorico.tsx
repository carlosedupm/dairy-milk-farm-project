"use client";

import { AnimalTimelineSection } from "@/components/animais/AnimalTimelineSection";
import type { TimelineFilterTipo } from "@/services/animais";

type Props = {
  animalId: number;
  tipoFilter: TimelineFilterTipo;
  onTipoFilterChange: (tipo: TimelineFilterTipo) => void;
};

export function AnimalFichaTabHistorico({
  animalId,
  tipoFilter,
  onTipoFilterChange,
}: Props) {
  return (
    <AnimalTimelineSection
      animalId={animalId}
      tipoFilter={tipoFilter}
      onTipoFilterChange={onTipoFilterChange}
    />
  );
}
