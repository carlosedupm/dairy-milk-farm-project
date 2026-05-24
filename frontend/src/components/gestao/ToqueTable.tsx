"use client";

import type { DiagnosticoGestacao } from "@/services/toques";
import { useAnimaisMap } from "@/components/gestao/useAnimaisMap";
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

type Props = {
  items: DiagnosticoGestacao[];
  fazendaId: number | undefined;
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
    return "bg-amber-50 dark:bg-amber-950/30";
  }
  if (highlight === "medicamento") {
    return "bg-red-50 dark:bg-red-950/30";
  }
  return "";
}

export function ToqueTable({ items, fazendaId }: Props) {
  const animaisMap = useAnimaisMap(fazendaId);

  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">Nenhum registro.</p>
    );
  }

  return (
    <ResponsiveListContainer
      mobile={items.map((item) => {
        const animalLabel =
          animaisMap.get(item.animal_id) ?? `Animal ${item.animal_id}`;
        const obs = formatToqueObs(item);
        return (
          <MobileListCard
            key={item.id}
            href={`/animais/${item.animal_id}`}
            title={animalLabel}
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
                      {animaisMap.get(item.animal_id) ??
                        `Animal ${item.animal_id}`}
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
