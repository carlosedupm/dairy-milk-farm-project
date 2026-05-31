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
import { ListEmptyState } from "@/components/layout/ListEmptyState";
import { getApiErrorMessage } from "@/lib/errors";
import { toast } from "@/hooks/use-toast";
import { HeartPulse } from "lucide-react";

type Props = {
  items: Cio[];
  fazendaId: number | undefined;
  novoHref?: string;
};

export function CioTable({ items, fazendaId, novoHref }: Props) {
  const queryClient = useQueryClient();
  const animalIds = useMemo(() => items.map((i) => i.animal_id), [items]);
  const { animaisById, isResolved: animaisResolved } = useGestaoAnimaisByIdMap(
    fazendaId,
    animalIds,
  );
  const [deleteDialogOpenId, setDeleteDialogOpenId] = useState<number | null>(
    null
  );
  const [deleteError, setDeleteError] = useState("");

  const deleteMutation = useMutation({
    mutationFn: remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cios", fazendaId] });
      setDeleteError("");
      setDeleteDialogOpenId(null);
      toast.success("Cio excluído");
    },
    onError: (err: unknown) => {
      const message = getApiErrorMessage(
        err,
        "Não foi possível excluir este cio."
      );
      setDeleteError(message);
      toast.error(message);
    },
  });

  const handleDelete = (id: number) => {
    setDeleteError("");
    deleteMutation.mutate(id);
  };

  if (items.length === 0) {
    return (
      <ListEmptyState
        icon={HeartPulse}
        emptyTitle="Nenhum cio registrado"
        emptyDescription="Registre o primeiro cio desta fazenda."
        registerLabel="Registrar cio"
        registerHref={novoHref}
      />
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
          if (!open) {
            setDeleteDialogOpenId(null);
            setDeleteError("");
          }
        }}
        title="Excluir registro de cio"
        description="Tem certeza que deseja excluir este registro? Não é possível excluir se o animal já saiu do rebanho. Esta ação não pode ser desfeita."
        onConfirm={() => {
          if (deleteDialogOpenId != null) handleDelete(deleteDialogOpenId);
        }}
        isPending={deleteMutation.isPending}
        error={deleteError}
      />
    </>
  );
}
