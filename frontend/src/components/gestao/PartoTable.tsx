"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Parto } from "@/services/partos";
import { remove } from "@/services/partos";
import { AnimalGestaoLabel } from "@/components/gestao/AnimalGestaoLabel";
import {
  animaisFazendaQueryKey,
  useGestaoAnimaisByIdMap,
} from "@/components/gestao/useAnimaisMap";
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
import { Baby } from "lucide-react";

type Props = {
  items: Parto[];
  fazendaId: number | undefined;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
  novoHref?: string;
};

export function PartoTable({
  items,
  fazendaId,
  hasActiveFilters = false,
  onClearFilters,
  novoHref = "/gestao/partos/novo",
}: Props) {
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
      queryClient.invalidateQueries({ queryKey: ["partos", fazendaId] });
      if (fazendaId != null && fazendaId > 0) {
        queryClient.invalidateQueries({
          queryKey: animaisFazendaQueryKey(fazendaId, "operacional"),
        });
        queryClient.invalidateQueries({
          queryKey: animaisFazendaQueryKey(fazendaId, "todos"),
        });
        queryClient.invalidateQueries({
          queryKey: ["fazendas", fazendaId, "animais"],
        });
      }
      queryClient.invalidateQueries({ queryKey: ["animais"] });
      queryClient.invalidateQueries({ queryKey: ["crias"] });
      setDeleteError("");
      setDeleteDialogOpenId(null);
      toast.success("Parto excluído");
    },
    onError: (err: unknown) => {
      const message = getApiErrorMessage(
        err,
        "Não foi possível excluir este parto."
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
        icon={Baby}
        emptyTitle="Registre o primeiro parto"
        emptyDescription="Registe partos para acompanhar o ciclo produtivo do rebanho."
        registerLabel="Registrar parto"
        registerHref={novoHref}
        hasActiveFilters={hasActiveFilters}
        filteredDescription="Nenhum parto corresponde aos filtros selecionados."
        onClearFilters={onClearFilters}
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
                    ? `/gestao/partos/${item.id}/editar`
                    : undefined
              }
              title={
                <AnimalGestaoLabel
                  animalId={item.animal_id}
                  animaisById={animaisById}
                />
              }
              subtitle={formatDateTimePtBrOptional(item.data)}
              meta={
                <span className="text-muted-foreground">
                  Animais na cria: {item.numero_crias}
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
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Animais na cria</TableHead>
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
                      {formatDateTimePtBrOptional(item.data)}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.numero_crias}
                    </TableCell>
                    <TableCell className="text-right">
                      <GestaoRegistroRowActions
                        animalId={item.animal_id}
                        animaisById={animaisById}
                        animaisResolved={animaisResolved}
                        editHref={`/gestao/partos/${item.id}/editar`}
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
        title="Excluir registro de parto"
        description="Tem certeza que deseja excluir este registro? As crias ligadas a este parto também serão removidas. Não é possível excluir se a matriz já saiu do rebanho."
        onConfirm={() => {
          if (deleteDialogOpenId != null) handleDelete(deleteDialogOpenId);
        }}
        isPending={deleteMutation.isPending}
        error={deleteError}
      />
    </>
  );
}
