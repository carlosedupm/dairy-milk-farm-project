"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Cio } from "@/services/cios";
import { remove } from "@/services/cios";
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
  items: Cio[];
  fazendaId: number | undefined;
};

export function CioTable({ items, fazendaId }: Props) {
  const queryClient = useQueryClient();
  const animaisMap = useAnimaisMap(fazendaId);
  const [deleteDialogOpenId, setDeleteDialogOpenId] = useState<number | null>(null);

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

  return (
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
          {items.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
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
                <TableCell>{formatDateTimePtBrOptional(item.data_detectado)}</TableCell>
                <TableCell>{item.metodo_deteccao ?? "—"}</TableCell>
                <TableCell>{item.intensidade ?? "—"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="default" asChild>
                      <Link href={`/gestao/cios/${item.id}/editar`}>
                        Editar
                      </Link>
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
                          <DialogTitle>Excluir registro de cio</DialogTitle>
                          <DialogDescription>
                            Tem certeza que deseja excluir este registro? Esta
                            ação não pode ser desfeita.
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
