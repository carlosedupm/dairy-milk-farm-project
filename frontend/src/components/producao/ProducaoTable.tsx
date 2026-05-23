"use client";

import { useState } from "react";
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
import { MobileListCard } from "@/components/layout/list/MobileListCard";
import { ListRowActionsMenu } from "@/components/layout/list/ListRowActionsMenu";
import { ResponsiveListContainer } from "@/components/layout/list/ResponsiveListContainer";
import { DeleteRecordDialog } from "@/components/layout/list/DeleteRecordDialog";

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
  const [deleteDialogOpenId, setDeleteDialogOpenId] = useState<number | null>(
    null
  );
  const deleteTarget = items.find((p) => p.id === deleteDialogOpenId);

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
      setDeleteDialogOpenId(null);
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

  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        Nenhum registro de produção.
      </p>
    );
  }

  return (
    <>
      <ResponsiveListContainer
        mobile={items.map((p) => {
          const animalLabel = showAnimal
            ? (animaisMap.get(p.animal_id) ?? `Animal ${p.animal_id}`)
            : null;
          return (
            <MobileListCard
              key={p.id}
              href={`/producao/${p.id}/editar`}
              title={animalLabel ?? formatDateTimePtBr(p.data_hora)}
              subtitle={
                animalLabel ? formatDateTimePtBr(p.data_hora) : undefined
              }
              meta={
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono">
                    {formatLitros(p.quantidade)} L
                  </span>
                  {getQualidadeBadge(p.qualidade) ?? (
                    <span className="text-muted-foreground">Qualidade: —</span>
                  )}
                </div>
              }
              actions={
                <ListRowActionsMenu
                  items={[
                    {
                      label: "Excluir",
                      variant: "destructive",
                      onSelect: () => setDeleteDialogOpenId(p.id),
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
                  {showAnimal ? <TableHead>Animal</TableHead> : null}
                  <TableHead>Data/Hora</TableHead>
                  <TableHead className="text-right">Litros</TableHead>
                  <TableHead>Qualidade</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((p) => (
                  <TableRow key={p.id}>
                    {showAnimal ? (
                      <TableCell className="font-medium">
                        <Link
                          href={`/animais/${p.animal_id}`}
                          className="text-primary hover:underline break-words"
                        >
                          {animaisMap.get(p.animal_id) ??
                            `Animal ${p.animal_id}`}
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
                        <Button variant="outline" size="default" asChild>
                          <Link href={`/producao/${p.id}/editar`}>Editar</Link>
                        </Button>
                        <Button
                          variant="destructive"
                          size="default"
                          onClick={() => setDeleteDialogOpenId(p.id)}
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
      {deleteTarget ? (
        <DeleteRecordDialog
          open={deleteDialogOpenId != null}
          onOpenChange={(open) => {
            if (!open) setDeleteDialogOpenId(null);
          }}
          title="Excluir registro"
          description={
            <>
              Tem certeza que deseja excluir este registro de produção de{" "}
              {formatDateTimePtBr(deleteTarget.data_hora)}? Esta ação não pode
              ser desfeita.
            </>
          }
          onConfirm={() => handleDelete(deleteTarget.id)}
          isPending={deleteMutation.isPending}
        />
      ) : null}
    </>
  );
}
