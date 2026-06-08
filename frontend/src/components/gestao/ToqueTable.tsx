"use client";

import { useMemo } from "react";
import type { DiagnosticoGestacao } from "@/services/toques";
import { AnimalGestaoLabel } from "@/components/gestao/AnimalGestaoLabel";
import { useGestaoAnimaisByIdMap } from "@/components/gestao/useAnimaisMap";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTimePtBrOptional } from "@/lib/format";
import {
  classificacaoLabel,
  formatToqueObs,
  getObsHighlight,
} from "@/lib/toquesUtils";
import { MobileListCard } from "@/components/layout/list/MobileListCard";
import { ResponsiveListContainer } from "@/components/layout/list/ResponsiveListContainer";
import { cn } from "@/lib/utils";
import { animalFichaCicloHref } from "@/lib/animalFichaLinks";
import { ListEmptyState } from "@/components/layout/ListEmptyState";
import { Stethoscope } from "lucide-react";

type Props = {
  items: DiagnosticoGestacao[];
  fazendaId: number | undefined;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
  novoHref?: string;
};

function getDiagnosticoLabel(item: DiagnosticoGestacao): string {
  if (item.classificacao_operacional) {
    return classificacaoLabel(item.classificacao_operacional);
  }
  return item.resultado;
}

function obsRowClass(obs: string): string {
  const highlight = getObsHighlight(obs);
  if (highlight === "protocolo") {
    return "bg-feedback-warning/10";
  }
  if (highlight === "medicamento") {
    return "bg-feedback-error/10";
  }
  return "";
}

export function ToqueTable({
  items,
  fazendaId,
  hasActiveFilters = false,
  onClearFilters,
  novoHref,
}: Props) {
  const animalIds = useMemo(
    () => items.map((i) => i.animal_id),
    [items],
  );
  const { animaisById } = useGestaoAnimaisByIdMap(fazendaId, animalIds);

  if (items.length === 0) {
    return (
      <ListEmptyState
        icon={Stethoscope}
        emptyTitle="Nenhum toque registrado"
        emptyDescription="Registre o primeiro toque (diagnóstico) desta fazenda."
        registerLabel="Registrar toque"
        registerHref={novoHref}
        hasActiveFilters={hasActiveFilters}
        filteredDescription="Nenhum toque corresponde ao dia selecionado."
        onClearFilters={onClearFilters}
      />
    );
  }

  return (
    <ResponsiveListContainer
      mobile={items.map((item) => {
        const obs = formatToqueObs(item);
        return (
          <MobileListCard
            key={item.id}
            href={animalFichaCicloHref(item.animal_id)}
            title={
              <AnimalGestaoLabel
                animalId={item.animal_id}
                animaisById={animaisById}
              />
            }
            subtitle={formatDateTimePtBrOptional(item.data)}
            meta={
              <div className="space-y-1 min-w-0">
                <Badge variant="outline">{getDiagnosticoLabel(item)}</Badge>
                {obs ? (
                  <div
                    className={cn(
                      "text-xs break-words rounded px-1 py-0.5",
                      obsRowClass(obs)
                    )}
                  >
                    {obs}
                  </div>
                ) : null}
              </div>
            }
          />
        );
      })}
      desktop={
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Animal</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Diagnóstico</TableHead>
                <TableHead>OBS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const obs = formatToqueObs(item);
                return (
                  <TableRow
                    key={item.id}
                    className={obs ? obsRowClass(obs) : undefined}
                  >
                    <TableCell className="font-medium">
                      <AnimalGestaoLabel
                        animalId={item.animal_id}
                        animaisById={animaisById}
                      />
                    </TableCell>
                    <TableCell>
                      {formatDateTimePtBrOptional(item.data)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getDiagnosticoLabel(item)}
                      </Badge>
                    </TableCell>
                    <TableCell className="break-words max-w-xs">
                      {obs || "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      }
    />
  );
}
