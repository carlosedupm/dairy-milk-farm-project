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
import { MobileListCard } from "@/components/layout/list/MobileListCard";
import { ResponsiveListContainer } from "@/components/layout/list/ResponsiveListContainer";

type Props = {
  items: DiagnosticoGestacao[];
  fazendaId: number | undefined;
};

function getResultadoVariant(
  resultado: string
): "default" | "secondary" | "destructive" | "outline" {
  if (resultado === "POSITIVO") return "default";
  if (resultado === "NEGATIVO") return "destructive";
  return "secondary";
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
        return (
          <MobileListCard
            key={item.id}
            href={`/animais/${item.animal_id}`}
            title={animalLabel}
            subtitle={formatDateTimePtBrOptional(item.data)}
            meta={
              <Badge variant={getResultadoVariant(item.resultado)}>
                {item.resultado}
              </Badge>
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
                <TableHead>Resultado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {animaisMap.get(item.animal_id) ??
                      `Animal ${item.animal_id}`}
                  </TableCell>
                  <TableCell>
                    {formatDateTimePtBrOptional(item.data)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getResultadoVariant(item.resultado)}>
                      {item.resultado}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      }
    />
  );
}
