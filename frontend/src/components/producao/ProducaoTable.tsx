"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ProducaoLeite } from "@/services/producao";
import { remove } from "@/services/producao";
import { useAnimaisMap } from "@/components/gestao/useAnimaisMap";
import { formatDateTimePtBr } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

type Props = {
  items: ProducaoLeite[];
  fazendaId?: number;
  showAnimal?: boolean;
};

function getQualidadeBadge(qualidade?: number | null) {
  if (!qualidade) return null;

  let variant: "default" | "secondary" | "destructive" | "outline" = "default";
  if (qualidade <= 3) variant = "destructive";
  else if (qualidade <= 5) variant = "secondary";
  else if (qualidade <= 7) variant = "outline";
  else variant = "default";

  return <Badge variant={variant}>{qualidade}/10</Badge>;
}

export function ProducaoTable({
  items,
  fazendaId,
  showAnimal = false,
}: Props) {
  const queryClient = useQueryClient();
  const animaisMap = useAnimaisMap(showAnimal ? fazendaId : undefined);

  const deleteMutation = useMutation({
    mutationFn: remove,
    onSuccess: (_data, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["producao"] });
      queryClient.invalidateQueries({ queryKey: ["resumo-pecuario"] });
      const item = items.find((p) => p.id === deletedId);
      if (item?.animal_id) {
        queryClient.invalidateQueries({
          queryKey: ["animais", item.animal_id, "contexto"],
        });
      }
    },
  });

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const formatLitros = (litros: number) =>
    litros.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const colCount = showAnimal ? 5 : 4;

  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <Table>
        <TableHeader>
          <TableRow>
            {showAnimal ? <TableHead>Animal</TableHead> : null}
            <TableHead>Data/Hora</TableHead>
            <TableHead className="text-right">Litros</TableHead>
            <TableHead>Qualidade</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={colCount}
                className="h-24 text-center text-muted-foreground"
              >
                Nenhum registro de produção.
              </TableCell>
            </TableRow>
          ) : (
            items.map((p) => (
              <TableRow key={p.id}>
                {showAnimal ? (
                  <TableCell className="font-medium">
                    <Link
                      href={`/animais/${p.animal_id}`}
                      className="text-primary hover:underline break-words"
                    >
                      {animaisMap.get(p.animal_id) ?? `Animal ${p.animal_id}`}
                    </Link>
                  </TableCell>
                ) : null}
                <TableCell className="font-medium">
                  {formatDateTimePtBr(p.data_hora)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatLitros(p.quantidade)} L
                </TableCell>
                <TableCell>
                  {getQualidadeBadge(p.qualidade) ?? "—"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      variant="outline"
                      size="default"
                      className="min-h-[44px] sm:min-h-0"
                      asChild
                    >
                      <Link href={`/producao/${p.id}/editar`}>Editar</Link>
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="default"
                          className="min-h-[44px] sm:min-h-0"
                        >
                          Excluir
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Excluir registro</DialogTitle>
                          <DialogDescription>
                            Tem certeza que deseja excluir este registro de
                            produção de {formatDateTimePtBr(p.data_hora)}? Esta
                            ação não pode ser desfeita.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <DialogClose asChild>
                            <Button variant="outline" className="min-h-[44px]">
                              Cancelar
                            </Button>
                          </DialogClose>
                          <Button
                            variant="destructive"
                            className="min-h-[44px]"
                            onClick={() => handleDelete(p.id)}
                            disabled={deleteMutation.isPending}
                          >
                            {deleteMutation.isPending
                              ? "Excluindo…"
                              : "Excluir"}
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
