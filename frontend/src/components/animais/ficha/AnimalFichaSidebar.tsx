"use client";

import Link from "next/link";
import { Beef } from "lucide-react";
import type { Animal, AnimalContexto } from "@/services/animais";
import type { Fazenda } from "@/services/fazendas";
import type { StatusSaude } from "@/services/animais";
import { STATUS_SAUDE_LABELS } from "@/services/animais";
import {
  buildAnimalContextoLinhasResumo,
  formatAnimalContextoMeta,
  formatAnimalContextoStatusLinha,
  getStatusReprodutivoLabel,
} from "@/components/animais/animalResumoUtils";
import { AnimalBaixadoBadge } from "@/components/animais/AnimalBaixadoBadge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { animalFichaCicloHref } from "@/lib/animalFichaLinks";

const STATUS_VARIANT: Record<
  StatusSaude,
  "default" | "secondary" | "destructive" | "outline"
> = {
  SAUDAVEL: "default",
  DOENTE: "destructive",
  EM_TRATAMENTO: "secondary",
};

type Props = {
  animal: Animal;
  contexto: AnimalContexto | undefined;
  fazenda: Fazenda | undefined;
  foraDoRebanho: boolean;
  canManageAnimal: boolean;
  className?: string;
};

export function AnimalFichaSidebar({
  animal,
  contexto,
  fazenda,
  foraDoRebanho,
  canManageAnimal,
  className,
}: Props) {
  const meta = formatAnimalContextoMeta(animal);
  const statusLinha = formatAnimalContextoStatusLinha(animal);
  const resumoLinhas = contexto
    ? buildAnimalContextoLinhasResumo({
        animal: contexto.animal,
        resumo_producao: contexto.resumo_producao,
        gestacao_resumo: contexto.gestacao_resumo,
      })
    : [];

  const statusSaude = animal.status_saude as StatusSaude | undefined;

  return (
    <Card className={cn("min-w-0", className)}>
      <CardHeader className="pb-2 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Beef className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
          <CardTitle className="text-lg break-words">{animal.identificacao}</CardTitle>
        </div>
        <div
          className="flex flex-wrap gap-2"
          aria-label={
            foraDoRebanho ? "Animal fora do rebanho, baixado" : undefined
          }
        >
          {foraDoRebanho ? (
            <>
              <Badge variant="secondary">Fora do rebanho</Badge>
              <AnimalBaixadoBadge variant="prominent" />
            </>
          ) : null}
          {statusSaude ? (
            <Badge variant={STATUS_VARIANT[statusSaude] ?? "default"}>
              {STATUS_SAUDE_LABELS[statusSaude] ?? statusSaude}
            </Badge>
          ) : null}
        </div>
        {meta ? (
          <p className="text-sm text-muted-foreground break-words">{meta}</p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3 text-sm min-w-0">
        {statusLinha ? (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Estado
            </p>
            <p className="mt-0.5 break-words">{statusLinha}</p>
          </div>
        ) : null}
        {animal.status_reprodutivo ? (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {foraDoRebanho ? "Reprodução ao sair" : "Reprodução"}
            </p>
            <Link
              href={animalFichaCicloHref(animal.id)}
              className="mt-0.5 block break-words text-primary hover:underline font-medium"
            >
              {getStatusReprodutivoLabel(animal.status_reprodutivo)}
            </Link>
          </div>
        ) : null}
        {resumoLinhas.map((linha) => (
          <div
            key={linha.label}
            className={cn(
              linha.destaque &&
                "rounded-md border border-feedback-warning/40 bg-feedback-warning/10 p-2 -mx-1"
            )}
          >
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {linha.label}
            </p>
            <p className="mt-0.5 break-words">{linha.value}</p>
          </div>
        ))}
        {fazenda ? (
          <div className="pt-1 border-t">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Fazenda
            </p>
            <p className="mt-0.5 font-medium break-words">{fazenda.nome}</p>
            {canManageAnimal ? (
              <Link
                href={`/fazendas/${animal.fazenda_id}/animais`}
                className="inline-flex min-h-[44px] items-center text-sm text-primary hover:underline mt-1"
              >
                Ver animais da fazenda
              </Link>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
