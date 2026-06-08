"use client";

import { useMemo } from "react";
import type { Secagem } from "@/services/secagens";
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
import { Droplets } from "lucide-react";

type Props = {
  items: Secagem[];
  fazendaId: number | undefined;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
};

export function SecagemTable({
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
        icon={Droplets}
        emptyTitle="Nenhuma secagem registada"
        emptyDescription="Registe secagens para acompanhar o fim da lactação."
        hasActiveFilters={hasActiveFilters}
        filteredDescription="Nenhuma secagem corresponde aos filtros selecionados."
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
          subtitle={`Secagem: ${formatDatePtBr(item.data_secagem)}`}
        />
      ))}
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
                    <AnimalGestaoLabel
                      animalId={item.animal_id}
                      animaisById={animaisById}
                    />
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
