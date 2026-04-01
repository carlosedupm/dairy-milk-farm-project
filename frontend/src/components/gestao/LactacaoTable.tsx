"use client";

import type { Lactacao } from "@/services/lactacoes";
import { useAnimaisMap } from "@/components/gestao/useAnimaisMap";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDatePtBr } from "@/lib/format";

type Props = {
  items: Lactacao[];
  fazendaId: number | undefined;
};

export function LactacaoTable({ items, fazendaId }: Props) {
  const animaisMap = useAnimaisMap(fazendaId);

  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Animal</TableHead>
            <TableHead>Lactação #</TableHead>
            <TableHead>Data início</TableHead>
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
                <TableCell>#{item.numero_lactacao}</TableCell>
                <TableCell>{formatDatePtBr(item.data_inicio)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
