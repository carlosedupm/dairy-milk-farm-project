"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Cio } from "@/services/cios";
import { remove } from "@/services/cios";
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
import { formatDateTimePtBrOptional } from "@/lib/format";
import { MobileListCard } from "@/components/layout/list/MobileListCard";
import { ListRowActionsMenu } from "@/components/layout/list/ListRowActionsMenu";
import { ResponsiveListContainer } from "@/components/layout/list/ResponsiveListContainer";
import { DeleteRecordDialog } from "@/components/layout/list/DeleteRecordDialog";
import { GestaoRegistroRowActions } from "@/components/gestao/GestaoRegistroRowActions";
import { isGestaoRegistroAnimalBaixado } from "@/components/gestao/gestaoRebanhoUtils";

type Props = {
  items: Cio[];
  fazendaId: number | undefined;
};

export function CioTable({ items, fazendaId }: Props) {
  const queryClient = useQueryClient();
  const animalIds = useMemo(() => items.map((i) => i.animal_id), [items]);
  const { animaisById, isResolved: animaisResolved } = useGestaoAnimaisByIdMap(
    fazendaId,
    animalIds,
  );
  const [deleteDialogOpenId, setDeleteDialogOpenId] = useState<number | null>(
    null
  );

  const deleteMutation = useMutation({
    mutationFn: remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cios", fazendaId] });
      setDeleteDialogOpenId(null);
    },
  });

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">Nenhum registro.</p>
    );
  }

  return (
    <>
      <ResponsiveListContainer
        mobile={items.map((item) => {
          const baixado =
            animaisResolved &&
            isGestaoRegistroAnimalBaixado(item.animal_id, animaisById);
          return (
            <MobileListCard
              key={item.id}
              href={
                baixado
                  ? `/animais/${item.animal_id}`
                  : animaisResolved
                    ? `/gestao/cios/${item.id}/editar`
                    : undefined
              }
              title={
                <AnimalGestaoLabel
                  animalId={item.animal_id}
                  animaisById={animaisById}
                />
              }
              subtitle={formatDateTimePtBrOptional(item.data_detectado)}
              meta={
                <span className="text-muted-foreground">
                  {item.metodo_deteccao ?? "—"}
                  {item.intensidade ? ` · ${item.intensidade}` : ""}
                </span>
              }
              actions={
                baixado || !animaisResolved ? undefined : (
                  <ListRowActionsMenu
                    items={[
                      {
                        label: "Excluir",
                        variant: "destructive",
                        onSelect: () => setDeleteDialogOpenId(item.id),
                      },
                    ]}
                  />
                )
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
                  <TableHead>Data detectado</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Intensidade</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
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
                    <TableCell>
                      {formatDateTimePtBrOptional(item.data_detectado)}
                    </TableCell>
                    <TableCell>{item.metodo_deteccao ?? "—"}</TableCell>
                    <TableCell>{item.intensidade ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <GestaoRegistroRowActions
                        animalId={item.animal_id}
                        animaisById={animaisById}
                        animaisResolved={animaisResolved}
                        editHref={`/gestao/cios/${item.id}/editar`}
                        onDelete={() => setDeleteDialogOpenId(item.id)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        }
      />
      <DeleteRecordDialog
        open={deleteDialogOpenId != null}
        onOpenChange={(open) => {
          if (!open) setDeleteDialogOpenId(null);
        }}
        title="Excluir registro de cio"
        description="Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita."
        onConfirm={() => {
          if (deleteDialogOpenId != null) handleDelete(deleteDialogOpenId);
        }}
        isPending={deleteMutation.isPending}
      />
    </>
  );
}
