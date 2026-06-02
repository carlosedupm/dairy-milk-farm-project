"use client";

import { AnimalTimelineSection } from "@/components/animais/AnimalTimelineSection";

type Props = {
  animalId: number;
};

export function AnimalFichaTabHistorico({ animalId }: Props) {
  return <AnimalTimelineSection animalId={animalId} />;
}
