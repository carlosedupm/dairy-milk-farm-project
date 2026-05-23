"use client";

import type { Secagem } from "@/services/secagens";
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
import { MobileListCard } from "@/components/layout/list/MobileListCard";
import { ResponsiveListContainer } from "@/components/layout/list/ResponsiveListContainer";

type Props = {
  items: Secagem[];
  fazendaId: number | undefined;
};

export function SecagemTable({ items, fazendaId }: Props) {
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
            subtitle={`Secagem: ${formatDatePtBr(item.data_secagem)}`}
          />
        );
      })}
      desktop={
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Animal</TableHead>
                <TableHead>Data secagem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {animaisMap.get(item.animal_id) ??
                      `Animal ${item.animal_id}`}
                  </TableCell>
                  <TableCell>{formatDatePtBr(item.data_secagem)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      }
    />
  );
}
