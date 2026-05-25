"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { Gestacao } from "@/services/gestacoes";
import { AnimalGestaoLabel } from "@/components/gestao/AnimalGestaoLabel";
import { useGestaoAnimaisByIdMap } from "@/components/gestao/useAnimaisMap";
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
  items: Gestacao[];
  fazendaId: number | undefined;
  /** Mensagem quando a lista está vazia (ex.: filtro «confirmadas»). */
  emptyMessage?: string;
};

export function GestacaoTable({
  items,
  fazendaId,
  emptyMessage = "Nenhum registro.",
}: Props) {
  const animalIds = useMemo(
    () => items.map((i) => i.animal_id),
    [items],
  );
  const { animaisById } = useGestaoAnimaisByIdMap(fazendaId, animalIds);

  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">{emptyMessage}</p>
    );
  }

  return (
    <ResponsiveListContainer
      mobile={items.map((item) => (
        <MobileListCard
          key={item.id}
          href={`/animais/${item.animal_id}`}
          title={
            <AnimalGestaoLabel
              animalId={item.animal_id}
              animaisById={animaisById}
            />
          }
          subtitle={item.status}
          meta={
            <span className="text-muted-foreground">
              Confirmação: {formatDatePtBr(item.data_confirmacao)}
            </span>
          }
        />
      ))}
      desktop={
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Animal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data confirmação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/animais/${item.animal_id}`}
                      className="inline-flex min-h-[44px] min-w-0 items-center text-primary underline-offset-4 hover:underline"
                    >
                      <AnimalGestaoLabel
                        animalId={item.animal_id}
                        animaisById={animaisById}
                      />
                    </Link>
                  </TableCell>
                  <TableCell>{item.status}</TableCell>
                  <TableCell>
                    {formatDatePtBr(item.data_confirmacao)}
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
