"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Cobertura } from "@/services/coberturas";
import { remove } from "@/services/coberturas";
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
  items: Cobertura[];
  fazendaId: number | undefined;
};

function reprodutorLabel(
  item: Cobertura,
  animaisMap: Map<number, string>
): string {
  if (item.touro_animal_id != null) {
    return (
      animaisMap.get(item.touro_animal_id) ?? `Animal ${item.touro_animal_id}`
    );
  }
  if (item.touro_info?.trim()) return item.touro_info;
  return "—";
}

export function CoberturaTable({ items, fazendaId }: Props) {
  const queryClient = useQueryClient();
  const animaisMap = useAnimaisMap(fazendaId);
  const [deleteDialogOpenId, setDeleteDialogOpenId] = useState<number | null>(
    null
  );

  const deleteMutation = useMutation({
    mutationFn: remove,
    onSuccess: (_data, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["coberturas", fazendaId] });
      queryClient.invalidateQueries({ queryKey: ["cobertura", deletedId] });
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
              href={`/gestao/coberturas/${item.id}/editar`}
              title={animalLabel}
              subtitle={`${item.tipo} · ${formatDateTimePtBrOptional(item.data)}`}
              meta={
                <span className="text-muted-foreground">
                  Reprodutor: {reprodutorLabel(item, animaisMap)}
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
                  <TableHead>Tipo</TableHead>
                  <TableHead>Reprodutor</TableHead>
                  <TableHead>Data</TableHead>
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
                    <TableCell>{item.tipo}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {reprodutorLabel(item, animaisMap)}
                    </TableCell>
                    <TableCell>
                      {formatDateTimePtBrOptional(item.data)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2 flex-wrap">
                        <Button variant="outline" size="default" asChild>
                          <Link href={`/gestao/coberturas/${item.id}/editar`}>
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
        title="Excluir registro de cobertura"
        description="Tem certeza que deseja excluir este registro? Não será possível excluir se existir gestação ou diagnóstico (toque) vinculado a esta cobertura."
        onConfirm={() => {
          if (deleteDialogOpenId != null) handleDelete(deleteDialogOpenId);
        }}
        isPending={deleteMutation.isPending}
      />
    </>
  );
}
