"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { AnimalContexto } from "@/services/animais";
import { AnimalFichaCiclo } from "@/components/animais/AnimalFichaCiclo";
import { AnimalCicloTimelineSection } from "@/components/animais/AnimalCicloTimelineSection";
import { animalFichaCicloHref } from "@/lib/animalFichaLinks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const MINI_TIMELINE_MAX = 5;

type Props = {
  animalId: number;
  contexto: AnimalContexto;
};

export function AnimalCicloMiniPreview({ animalId, contexto }: Props) {
  return (
    <div className="space-y-4 min-w-0">
      <AnimalFichaCiclo contexto={contexto} showProximasAcoes={false} />
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">Ciclo reprodutivo</CardTitle>
          <Button variant="ghost" size="sm" className="shrink-0 min-h-11" asChild>
            <Link href={animalFichaCicloHref(animalId)}>
              Ver ciclo completo
              <ChevronRight className="h-4 w-4 ml-0.5" aria-hidden />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <AnimalCicloTimelineSection
            animalId={animalId}
            proximasAcoes={contexto.proximas_acoes}
            foraDoRebanho={contexto.fora_do_rebanho}
            bare
            maxItems={MINI_TIMELINE_MAX}
          />
        </CardContent>
      </Card>
    </div>
  );
}
