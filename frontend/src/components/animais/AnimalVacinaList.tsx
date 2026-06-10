"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  animalVacinasListQueryKey,
  remove,
  tipoVacinaLabel,
  type AnimalVacinaRegistro,
} from "@/services/animalVacinas";
import { invalidateAnimalTimeline } from "@/services/animais";
import {
  canAplicarVacina,
  canEditarVacina,
  canExcluirVacina,
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
import { VacinaStatusBadge } from "@/components/animais/VacinaStatusBadge";
import { AnimalVacinaAplicarDialog } from "@/components/animais/AnimalVacinaAplicarDialog";
import { getApiErrorMessage } from "@/lib/errors";
import { toast } from "@/hooks/use-toast";

export const ANIMAL_VACINAS_EMPTY_MESSAGE =
  "Nenhuma vacina registrada para este animal.";

type Props = {
  animalId: number;
  items: AnimalVacinaRegistro[];
  perfil: string | undefined;
  foraDoRebanho: boolean;
};

function datasDisplay(item: AnimalVacinaRegistro): string {
  if (item.data_aplicacao) {
    return `Aplicada em ${formatDatePtBr(item.data_aplicacao)}`;
  }
  return `Prevista para ${formatDatePtBr(item.data_prevista)}`;
}

export function AnimalVacinaList({
  animalId,
  items,
  perfil,
  foraDoRebanho,
}: Props) {
  const queryClient = useQueryClient();
  const canEdit = canEditarVacina(perfil);
  const canDelete = canExcluirVacina(perfil);
  const canAplicar = canAplicarVacina(perfil) && !foraDoRebanho;
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [aplicarVacina, setAplicarVacina] =
    useState<AnimalVacinaRegistro | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (vacinaId: number) => remove(animalId, vacinaId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: animalVacinasListQueryKey(animalId),
      });
      queryClient.invalidateQueries({ queryKey: ["animais", animalId] });
      invalidateAnimalTimeline(queryClient, animalId);
      setDeleteError("");
      setDeleteId(null);
      toast.success("Vacina excluída");
    },
    onError: (err: unknown) => {
      const message = getApiErrorMessage(
        err,
        "Não foi possível excluir esta vacina."
      );
      setDeleteError(message);
      toast.error(message);
    },
  });

  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        {ANIMAL_VACINAS_EMPTY_MESSAGE}
      </p>
    );
  }

  const menuItems = (item: AnimalVacinaRegistro): ListRowActionItem[] => {
    const actions: ListRowActionItem[] = [];
    if (canAplicar && !item.data_aplicacao) {
      actions.push({
        label: "Aplicar",
        onSelect: () => setAplicarVacina(item),
      });
    }
    if (canEdit) {
      actions.push({
        label: "Editar",
        href: `/animais/${animalId}/vacinas/editar/${item.id}`,
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
        mobile={items.map((item) => (
          <MobileListCard
            key={item.id}
            href={
              canEdit
                ? `/animais/${animalId}/vacinas/editar/${item.id}`
                : undefined
            }
            title={`${tipoVacinaLabel(item.tipo_vacina)}${
              item.dose?.trim() ? ` · ${item.dose.trim()}` : ""
            }`}
            subtitle={`${datasDisplay(item)}${
              item.data_proximo_reforco
                ? ` · Reforço: ${formatDatePtBr(item.data_proximo_reforco)}`
                : ""
            }`}
            meta={
              <div className="space-y-2 min-w-0">
                <VacinaStatusBadge status={item.status} />
                {item.observacoes?.trim() ? (
                  <p className="text-sm text-muted-foreground line-clamp-2 break-words">
                    {item.observacoes.trim()}
                  </p>
                ) : null}
              </div>
            }
            actions={
              menuItems(item).length > 0 ? (
                <ListRowActionsMenu items={menuItems(item)} />
              ) : undefined
            }
          />
        ))}
        desktop={
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vacina</TableHead>
                <TableHead>Dose</TableHead>
                <TableHead>Prevista</TableHead>
                <TableHead>Aplicada</TableHead>
                <TableHead>Próx. reforço</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[1%]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {canEdit ? (
                      <Link
                        href={`/animais/${animalId}/vacinas/editar/${item.id}`}
                        className="hover:underline"
                      >
                        {tipoVacinaLabel(item.tipo_vacina)}
                      </Link>
                    ) : (
                      tipoVacinaLabel(item.tipo_vacina)
                    )}
                  </TableCell>
                  <TableCell>{item.dose?.trim() || "—"}</TableCell>
                  <TableCell>{formatDatePtBr(item.data_prevista)}</TableCell>
                  <TableCell>
                    {item.data_aplicacao
                      ? formatDatePtBr(item.data_aplicacao)
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {item.data_proximo_reforco
                      ? formatDatePtBr(item.data_proximo_reforco)
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <VacinaStatusBadge status={item.status} />
                  </TableCell>
                  <TableCell>
                    {menuItems(item).length > 0 ? (
                      <ListRowActionsMenu items={menuItems(item)} />
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        }
      />
      <AnimalVacinaAplicarDialog
        key={aplicarVacina?.id ?? "none"}
        animalId={animalId}
        vacina={aplicarVacina}
        onOpenChange={(open) => {
          if (!open) setAplicarVacina(null);
        }}
      />
      <DeleteRecordDialog
        open={deleteId != null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteId(null);
            setDeleteError("");
          }
        }}
        title="Excluir vacina"
        description="O registro da vacina será removido. Esta ação não pode ser desfeita."
        onConfirm={() => {
          if (deleteId != null) {
            setDeleteError("");
            deleteMutation.mutate(deleteId);
          }
        }}
        isPending={deleteMutation.isPending}
        error={deleteError}
      />
    </>
  );
}
