"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Cobertura } from "@/services/coberturas";
import { remove } from "@/services/coberturas";
import { AnimalGestaoLabel } from "@/components/gestao/AnimalGestaoLabel";
import { useGestaoAnimaisByIdMap } from "@/components/gestao/useAnimaisMap";
import type { Animal } from "@/services/animais";
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
  items: Cobertura[];
  fazendaId: number | undefined;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
  novoHref?: string;
};

function reprodutorText(
  item: Cobertura,
  animaisById: Map<number, Animal>,
): string {
  if (item.touro_animal_id != null) {
    const a = animaisById.get(item.touro_animal_id);
    return a?.identificacao ?? `Animal ${item.touro_animal_id}`;
  }
  if (item.touro_info?.trim()) return item.touro_info;
  return "—";
}

export function CoberturaTable({
  items,
  fazendaId,
  hasActiveFilters = false,
  onClearFilters,
  novoHref,
}: Props) {
  const queryClient = useQueryClient();
  const animalIds = useMemo(
    () => items.flatMap((i) => [i.animal_id, i.touro_animal_id ?? 0]),
    [items],
  );
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
    onSuccess: (_data, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["coberturas", fazendaId] });
      queryClient.invalidateQueries({ queryKey: ["cobertura", deletedId] });
      setDeleteError("");
      setDeleteDialogOpenId(null);
      toast.success("Cobertura excluída");
    },
    onError: (err: unknown) => {
      const message = getApiErrorMessage(
        err,
        "Não foi possível excluir esta cobertura."
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
        emptyTitle="Nenhuma cobertura registrada"
        emptyDescription="Registre a primeira cobertura desta fazenda."
        registerLabel="Registrar cobertura"
        registerHref={novoHref}
        hasActiveFilters={hasActiveFilters}
        filteredDescription="Nenhuma cobertura corresponde aos filtros selecionados."
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
                    ? `/gestao/coberturas/${item.id}/editar`
                    : undefined
              }
              title={
                <AnimalGestaoLabel
                  animalId={item.animal_id}
                  animaisById={animaisById}
                />
              }
              subtitle={`${item.tipo} · ${formatDateTimePtBrOptional(item.data)}`}
              meta={
                <span className="text-muted-foreground inline-flex flex-wrap items-center gap-1">
                  Reprodutor:{" "}
                  {item.touro_animal_id != null ? (
                    <AnimalGestaoLabel
                      animalId={item.touro_animal_id}
                      animaisById={animaisById}
                    />
                  ) : (
                    reprodutorText(item, animaisById)
                  )}
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
                      <AnimalGestaoLabel
                        animalId={item.animal_id}
                        animaisById={animaisById}
                      />
                    </TableCell>
                    <TableCell>{item.tipo}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.touro_animal_id != null ? (
                        <AnimalGestaoLabel
                          animalId={item.touro_animal_id}
                          animaisById={animaisById}
                        />
                      ) : (
                        reprodutorText(item, animaisById)
                      )}
                    </TableCell>
                    <TableCell>
                      {formatDateTimePtBrOptional(item.data)}
                    </TableCell>
                    <TableCell className="text-right">
                      <GestaoRegistroRowActions
                        animalId={item.animal_id}
                        animaisById={animaisById}
                        animaisResolved={animaisResolved}
                        editHref={`/gestao/coberturas/${item.id}/editar`}
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
        title="Excluir registro de cobertura"
        description="Tem certeza que deseja excluir este registro? Não será possível excluir se existir gestação ou diagnóstico (toque) vinculado a esta cobertura."
        onConfirm={() => {
          if (deleteDialogOpenId != null) handleDelete(deleteDialogOpenId);
        }}
        isPending={deleteMutation.isPending}
        error={deleteError}
      />
    </>
  );
}
