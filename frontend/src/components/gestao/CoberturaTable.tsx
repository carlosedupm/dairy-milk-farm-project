"use client";

import type { Cobertura } from "@/services/coberturas";
import { useAnimaisMap } from "@/components/gestao/useAnimaisMap";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Props = {
  items: Cobertura[];
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

export function CoberturaTable({ items, fazendaId }: Props) {
  const animaisMap = useAnimaisMap(fazendaId);

  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Animal</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Reprodutor</TableHead>
            <TableHead>Data</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={4}
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
                <TableCell>{item.tipo}</TableCell>
                <TableCell className="text-muted-foreground">
                  {item.touro_animal_id != null
                    ? animaisMap.get(item.touro_animal_id) ?? `Animal ${item.touro_animal_id}`
                    : item.touro_info?.trim()
                      ? item.touro_info
                      : "—"}
                </TableCell>
                <TableCell>{formatDate(item.data)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
