"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  hormoniosLactacaoListQueryKey,
  produtoHormonioLabel,
  remove,
  type HormonioLactacaoAplicacao,
} from "@/services/animalHormoniosLactacao";
import { invalidateAnimalTimeline } from "@/services/animais";
import {
  canEditarHormonioLactacao,
  canExcluirHormonioLactacao,
} from "@/config/appAccess";
import { formatDatePtBr } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MobileListCard } from "@/components/layout/list/MobileListCard";
import {
  ListRowActionsMenu,
  type ListRowActionItem,
} from "@/components/layout/list/ListRowActionsMenu";
import { ResponsiveListContainer } from "@/components/layout/list/ResponsiveListContainer";
import { DeleteRecordDialog } from "@/components/layout/list/DeleteRecordDialog";
import { getApiErrorMessage } from "@/lib/errors";
import { toast } from "@/hooks/use-toast";

export const ANIMAL_HORMONIOS_EMPTY_MESSAGE =
  "Nenhuma aplicação registrada para este animal.";

type Props = {
  animalId: number;
  items: HormonioLactacaoAplicacao[];
  perfil: string | undefined;
};

export function AnimalHormonioLactacaoList({
  animalId,
  items,
  perfil,
}: Props) {
  const queryClient = useQueryClient();
  const canEdit = canEditarHormonioLactacao(perfil);
  const canDelete = canExcluirHormonioLactacao(perfil);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const deleteMutation = useMutation({
    mutationFn: (aplicacaoId: number) => remove(animalId, aplicacaoId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: hormoniosLactacaoListQueryKey(animalId),
      });
      invalidateAnimalTimeline(queryClient, animalId);
      setDeleteError("");
      setDeleteId(null);
      toast.success("Aplicação excluída");
    },
    onError: (err: unknown) => {
      const message = getApiErrorMessage(
        err,
        "Não foi possível excluir esta aplicação.",
      );
      setDeleteError(message);
      toast.error(message);
    },
  });

  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        {ANIMAL_HORMONIOS_EMPTY_MESSAGE}
      </p>
    );
  }

  const menuItems = (item: HormonioLactacaoAplicacao): ListRowActionItem[] => {
    const actions: ListRowActionItem[] = [];
    if (canEdit) {
      actions.push({
        label: "Editar",
        href: `/animais/${animalId}/hormonios-lactacao/${item.id}/editar`,
      });
    }
    if (canDelete) {
      actions.push({
        label: "Excluir",
        variant: "destructive",
        onSelect: () => setDeleteId(item.id),
      });
    }
    return actions;
  };

  return (
    <>
      <ResponsiveListContainer
        desktop={
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dose</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Aplicação</TableHead>
                <TableHead>Próxima</TableHead>
                <TableHead className="w-[52px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.numero_dose}</TableCell>
                  <TableCell>{produtoHormonioLabel(item.produto)}</TableCell>
                  <TableCell>{formatDatePtBr(item.data_aplicacao)}</TableCell>
                  <TableCell>
                    {item.data_proxima_aplicacao
                      ? formatDatePtBr(item.data_proxima_aplicacao)
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <ListRowActionsMenu items={menuItems(item)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        }
        mobile={items.map((item) => (
          <MobileListCard
            key={item.id}
            title={`Dose ${item.numero_dose} — ${produtoHormonioLabel(item.produto)}`}
            subtitle={formatDatePtBr(item.data_aplicacao)}
            meta={
              item.data_proxima_aplicacao
                ? `Próxima: ${formatDatePtBr(item.data_proxima_aplicacao)}`
                : undefined
            }
            actions={<ListRowActionsMenu items={menuItems(item)} />}
          />
        ))}
      />
      <DeleteRecordDialog
        open={deleteId != null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Excluir aplicação"
        description="Esta ação não pode ser desfeita."
        error={deleteError}
        isPending={deleteMutation.isPending}
        onConfirm={() => deleteId != null && deleteMutation.mutate(deleteId)}
      />
    </>
  );
}
