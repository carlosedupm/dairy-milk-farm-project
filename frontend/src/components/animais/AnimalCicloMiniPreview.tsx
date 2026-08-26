"use client";

import Link from "next/link";
import { AlertTriangle, ChevronRight } from "lucide-react";
import type { AnimalContexto } from "@/services/animais";
import { AnimalCicloTimelineSection } from "@/components/animais/AnimalCicloTimelineSection";
import { AnimalProximasAcoesCta } from "@/components/animais/AnimalProximasAcoesCta";
import { formatDatePtBr } from "@/lib/format";
import { animalFichaCicloHref } from "@/lib/animalFichaLinks";
import { TOUR_STEP_FICHA_CICLO_MINI } from "@/components/ui/tour";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MOTIVO_RESTRICAO_LEITE_LABELS,
  type MotivoRestricaoLeite,
} from "@/services/restricoesLeite";

const MINI_TIMELINE_MAX = 5;

type Props = {
  animalId: number;
  contexto: AnimalContexto;
};

export function AnimalCicloMiniPreview({ animalId, contexto }: Props) {
  const cicloHref = animalFichaCicloHref(animalId);
  const showForaDoRebanho = !!contexto.fora_do_rebanho;
  const showRestricao = !!contexto.restricao_leite_ativa && !showForaDoRebanho;

  return (
    <div className="space-y-4 min-w-0">
      {showForaDoRebanho || showRestricao ? (
        <div className="space-y-2">
          {showForaDoRebanho ? (
            <div
              className="rounded-md border border-muted-foreground/30 bg-muted/50 p-3 text-sm"
              role="status"
            >
              <p className="font-medium">Animal fora do rebanho</p>
              {contexto.saida_resumo?.motivo_label ? (
                <p className="text-muted-foreground mt-1 break-words">
                  {contexto.saida_resumo.motivo_label}
                  {contexto.saida_resumo.data_saida
                    ? ` — ${formatDatePtBr(contexto.saida_resumo.data_saida)}`
                    : null}
                </p>
              ) : null}
              <Link
                href={cicloHref}
                className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline"
              >
                Ver no Ciclo
                <ChevronRight className="h-4 w-4 ml-0.5" aria-hidden />
              </Link>
            </div>
          ) : null}
          {showRestricao && contexto.restricao_leite_ativa ? (
            <div
              className="flex gap-2 rounded-md border border-feedback-warning/40 bg-feedback-warning/10 p-3 text-sm min-w-0"
              role="status"
            >
              <AlertTriangle
                className="h-4 w-4 shrink-0 text-feedback-warning mt-0.5"
                aria-hidden
              />
              <div className="min-w-0">
                <p className="break-words">
                  <span className="font-medium">
                    Leite aguardando laboratório:{" "}
                  </span>
                  {MOTIVO_RESTRICAO_LEITE_LABELS[
                    contexto.restricao_leite_ativa
                      .motivo as MotivoRestricaoLeite
                  ] ?? contexto.restricao_leite_ativa.motivo}
                </p>
                <Link
                  href={cicloHref}
                  className="mt-1 inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline"
                >
                  Ver no Ciclo
                  <ChevronRight className="h-4 w-4 ml-0.5" aria-hidden />
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {contexto.proximas_acoes?.length ? (
        <AnimalProximasAcoesCta
          acoes={contexto.proximas_acoes}
          foraDoRebanho={contexto.fora_do_rebanho}
        />
      ) : null}

      <Card id={TOUR_STEP_FICHA_CICLO_MINI}>
        <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">Ciclo reprodutivo</CardTitle>
          <Button variant="ghost" size="sm" className="shrink-0 min-h-11" asChild>
            <Link href={cicloHref}>
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
