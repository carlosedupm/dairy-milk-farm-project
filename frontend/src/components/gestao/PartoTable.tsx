"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Parto } from "@/services/partos";
import { remove } from "@/services/partos";
import { useAnimaisMap } from "@/components/gestao/useAnimaisMap";
import { Button } from "@/components/ui/button";
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

type Props = {
  items: Parto[];
  fazendaId: number | undefined;
};

export function PartoTable({ items, fazendaId }: Props) {
  const queryClient = useQueryClient();
  const animaisMap = useAnimaisMap(fazendaId);
  const [deleteDialogOpenId, setDeleteDialogOpenId] = useState<number | null>(
    null
  );

  const deleteMutation = useMutation({
    mutationFn: remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partos", fazendaId] });
      if (fazendaId != null && fazendaId > 0) {
        queryClient.invalidateQueries({
          queryKey: ["animais", "by-fazenda", fazendaId],
        });
        queryClient.invalidateQueries({
          queryKey: ["fazendas", fazendaId, "animais"],
        });
      }
      queryClient.invalidateQueries({ queryKey: ["animais"] });
      queryClient.invalidateQueries({ queryKey: ["crias"] });
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
          const animalLabel =
            animaisMap.get(item.animal_id) ?? `Animal ${item.animal_id}`;
          return (
            <MobileListCard
              key={item.id}
              href={`/gestao/partos/${item.id}/editar`}
              title={animalLabel}
              subtitle={formatDateTimePtBrOptional(item.data)}
              meta={
                <span className="text-muted-foreground">
                  Animais na cria: {item.numero_crias}
                </span>
              }
              actions={
                <ListRowActionsMenu
                  items={[
                    {
                      label: "Excluir",
                      variant: "destructive",
                      onSelect: () => setDeleteDialogOpenId(item.id),
                    },
                  ]}
                />
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
                  <TableHead className="text-right">Animais na cria</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
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
                    <TableCell className="text-right">
                      {item.numero_crias}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2 flex-wrap">
                        <Button variant="outline" size="default" asChild>
                          <Link href={`/gestao/partos/${item.id}/editar`}>
                            Editar
                          </Link>
                        </Button>
                        <Button
                          variant="destructive"
                          size="default"
                          onClick={() => setDeleteDialogOpenId(item.id)}
                        >
                          Excluir
                        </Button>
                      </div>
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
        title="Excluir registro de parto"
        description="Tem certeza que deseja excluir este registro? Registros de crias ligados a este parto também serão removidos. Esta ação não pode ser desfeita."
        onConfirm={() => {
          if (deleteDialogOpenId != null) handleDelete(deleteDialogOpenId);
        }}
        isPending={deleteMutation.isPending}
      />
    </>
  );
}
