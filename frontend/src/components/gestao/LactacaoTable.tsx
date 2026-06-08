"use client";

import { useMemo } from "react";
import type { Lactacao } from "@/services/lactacoes";
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
import { animalFichaCicloHref } from "@/lib/animalFichaLinks";
import { MobileListCard } from "@/components/layout/list/MobileListCard";
import { ResponsiveListContainer } from "@/components/layout/list/ResponsiveListContainer";
import { ListEmptyState } from "@/components/layout/ListEmptyState";
import { Milk } from "lucide-react";

type Props = {
  items: Lactacao[];
  fazendaId: number | undefined;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
};

export function LactacaoTable({
  items,
  fazendaId,
  hasActiveFilters = false,
  onClearFilters,
}: Props) {
  const animalIds = useMemo(
    () => items.map((i) => i.animal_id),
    [items],
  );
  const { animaisById } = useGestaoAnimaisByIdMap(fazendaId, animalIds);

  if (items.length === 0) {
    return (
      <ListEmptyState
        icon={Milk}
        emptyTitle="Nenhuma lactação registada"
        emptyDescription="Lactações são criadas automaticamente com partos ou podem ser registadas manualmente."
        hasActiveFilters={hasActiveFilters}
        filteredDescription="Nenhuma lactação corresponde aos filtros selecionados."
        onClearFilters={onClearFilters}
      />
    );
  }

  return (
    <ResponsiveListContainer
      mobile={items.map((item) => (
        <MobileListCard
          key={item.id}
          href={animalFichaCicloHref(item.animal_id)}
          title={
            <AnimalGestaoLabel
              animalId={item.animal_id}
              animaisById={animaisById}
            />
          }
          subtitle={`Lactação #${item.numero_lactacao}`}
          meta={
            <span className="text-muted-foreground">
              Início: {formatDatePtBr(item.data_inicio)}
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
                <TableHead>Lactação #</TableHead>
                <TableHead>Data início</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    <AnimalGestaoLabel
                      animalId={item.animal_id}
                      animaisById={animaisById}
                    />
                  </TableCell>
                  <TableCell>#{item.numero_lactacao}</TableCell>
                  <TableCell>{formatDatePtBr(item.data_inicio)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      }
    />
  );
}
