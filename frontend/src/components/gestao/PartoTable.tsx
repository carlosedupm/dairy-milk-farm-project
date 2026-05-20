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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatDateTimePtBrOptional } from "@/lib/format";

type Props = {
  items: Parto[];
  fazendaId: number | undefined;
};

export function PartoTable({ items, fazendaId }: Props) {
  const queryClient = useQueryClient();
  const animaisMap = useAnimaisMap(fazendaId);
  const [deleteDialogOpenId, setDeleteDialogOpenId] = useState<number | null>(null);

  const deleteMutation = useMutation({
    mutationFn: remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partos", fazendaId] });
      // Parto removido pode excluir animais nascidos na API — atualiza listas e detalhe
      if (fazendaId != null && fazendaId > 0) {
        queryClient.invalidateQueries({
          queryKey: ["animais", "by-fazenda", fazendaId],
        });
        queryClient.invalidateQueries({ queryKey: ["fazendas", fazendaId, "animais"] });
      }
      queryClient.invalidateQueries({ queryKey: ["animais"] });
      queryClient.invalidateQueries({ queryKey: ["crias"] });
      setDeleteDialogOpenId(null);
    },
  });

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  return (
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
                <TableCell>{formatDateTimePtBrOptional(item.data)}</TableCell>
                <TableCell className="text-right">{item.numero_crias}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2 flex-wrap">
                    <Button variant="outline" size="default" asChild>
                      <Link href={`/gestao/partos/${item.id}/editar`}>Editar</Link>
                    </Button>
                    <Dialog
                      open={deleteDialogOpenId === item.id}
                      onOpenChange={(open) => {
                        if (!open) setDeleteDialogOpenId(null);
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="default"
                          onClick={() => setDeleteDialogOpenId(item.id)}
                        >
                          Excluir
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Excluir registro de parto</DialogTitle>
                          <DialogDescription>
                            Tem certeza que deseja excluir este registro? Registros
                            de crias ligados a este parto também serão removidos.
                            Esta ação não pode ser desfeita.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <DialogClose asChild>
                            <Button variant="outline">Cancelar</Button>
                          </DialogClose>
                          <Button
                            variant="destructive"
                            onClick={() => handleDelete(item.id)}
                            disabled={deleteMutation.isPending}
                          >
                            {deleteMutation.isPending ? "Excluindo…" : "Excluir"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
