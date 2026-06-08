"use client";

import { AnimalFichaCiclo } from "@/components/animais/AnimalFichaCiclo";
import { AnimalCicloTimelineSection } from "@/components/animais/AnimalCicloTimelineSection";
import type { AnimalContexto, ProximaAcao } from "@/services/animais";

type Props = {
  animalId: number;
  contexto: AnimalContexto | undefined;
  contextoLoading: boolean;
  proximasAcoes?: ProximaAcao[];
  foraDoRebanho?: boolean;
  enabled: boolean;
};

export function AnimalFichaTabCiclo({
  animalId,
  contexto,
  contextoLoading,
  proximasAcoes,
  foraDoRebanho,
  enabled,
}: Props) {
  if (!enabled) {
    return null;
  }

  return (
    <div className="space-y-4 min-w-0">
      {contextoLoading ? (
        <p className="text-sm text-muted-foreground">Carregando ciclo…</p>
      ) : null}
      {contexto ? <AnimalFichaCiclo contexto={contexto} /> : null}
      <AnimalCicloTimelineSection
        animalId={animalId}
        proximasAcoes={proximasAcoes ?? contexto?.proximas_acoes}
        foraDoRebanho={foraDoRebanho}
        title="Histórico do ciclo"
      />
    </div>
  );
}
