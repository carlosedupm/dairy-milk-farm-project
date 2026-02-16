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

type Props = {
  items: DiagnosticoGestacao[];
  fazendaId: number | undefined;
};

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getResultadoVariant(
  resultado: string
): "default" | "secondary" | "destructive" | "outline" {
  if (resultado === "POSITIVO") return "default";
  if (resultado === "NEGATIVO") return "destructive";
  return "secondary";
}

export function ToqueTable({ items, fazendaId }: Props) {
  const animaisMap = useAnimaisMap(fazendaId);

  return (
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
          {items.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={3}
                className="h-24 text-center text-muted-foreground"
              >
                Nenhum registro.
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">
                  {animaisMap.get(item.animal_id) ?? `Animal ${item.animal_id}`}
                </TableCell>
                <TableCell>{formatDate(item.data)}</TableCell>
                <TableCell>
                  <Badge variant={getResultadoVariant(item.resultado)}>
                    {item.resultado}
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
