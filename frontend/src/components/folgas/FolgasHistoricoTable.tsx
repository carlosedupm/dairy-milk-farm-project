"use client";

import { format } from "date-fns";
import type { FolgaAlteracao } from "@/services/folgas";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Props = {
  items: FolgaAlteracao[];
};

export function FolgasHistoricoTable({ items }: Props) {
  return (
    <Table className="text-base">
        <TableHeader>
          <TableRow>
            <TableHead className="text-base font-medium">Data/hora</TableHead>
            <TableHead className="text-base font-medium">Tipo</TableHead>
            <TableHead className="text-base font-medium">Detalhes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((h) => (
            <TableRow key={h.id}>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {format(new Date(h.created_at), "dd/MM/yyyy HH:mm")}
              </TableCell>
              <TableCell className="font-medium">{h.tipo}</TableCell>
              <TableCell className="max-w-[320px]">
                {h.detalhes ? (
                  <pre className="whitespace-pre-wrap break-all text-base font-normal leading-relaxed">
                    {JSON.stringify(h.detalhes, null, 0)}
                  </pre>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
  );
}
