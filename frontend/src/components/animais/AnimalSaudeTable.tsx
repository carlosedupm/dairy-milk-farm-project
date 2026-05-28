"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  animalSaudeListQueryKey,
  remove,
  STATUS_CASO_SAUDE_LABELS,
  TIPO_CASO_SAUDE_LABELS,
  type AnimalSaudeRegistro,
  type StatusCasoSaude,
  type TipoCasoSaude,
} from "@/services/animalSaude";
import {
  canEditarRegistroSaude,
  canExcluirRegistroSaude,
} from "@/config/appAccess";
import { formatDatePtBr } from "@/lib/format";
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
import {
  ListRowActionsMenu,
  type ListRowActionItem,
} from "@/components/layout/list/ListRowActionsMenu";
import { ResponsiveListContainer } from "@/components/layout/list/ResponsiveListContainer";
import { DeleteRecordDialog } from "@/components/layout/list/DeleteRecordDialog";

type Props = {
  animalId: number;
  items: AnimalSaudeRegistro[];
  perfil: string | undefined;
};

function tipoLabel(t: string): string {
  return TIPO_CASO_SAUDE_LABELS[t as TipoCasoSaude] ?? t;
}

function statusLabel(s: string): string {
  return STATUS_CASO_SAUDE_LABELS[s as StatusCasoSaude] ?? s;
}

function statusVariant(
  s: string
): "default" | "secondary" | "destructive" | "outline" {
  if (s === "ATIVO") return "destructive";
  if (s === "CONCLUIDO") return "secondary";
  return "outline";
}

export function AnimalSaudeTable({ animalId, items, perfil }: Props) {
  const queryClient = useQueryClient();
  const canEdit = canEditarRegistroSaude(perfil);
  const canDelete = canExcluirRegistroSaude(perfil);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (saudeId: number) => remove(animalId, saudeId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: animalSaudeListQueryKey(animalId),
      });
      queryClient.invalidateQueries({ queryKey: ["animais", animalId] });
      queryClient.invalidateQueries({
        queryKey: ["animais", animalId, "contexto"],
      });
      setDeleteId(null);
    },
  });

  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        Nenhum registo de saúde para este animal.
      </p>
    );
  }

  const menuItems = (item: AnimalSaudeRegistro): ListRowActionItem[] => {
    const actions: ListRowActionItem[] = [];
    if (canEdit) {
      actions.push({
        label: "Editar",
        href: `/animais/${animalId}/saude/${item.id}/editar`,
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
                ? `/animais/${animalId}/saude/${item.id}/editar`
                : undefined
            }
            title={tipoLabel(item.tipo_caso)}
            subtitle={`Início: ${formatDatePtBr(item.data_inicio)}`}
            meta={
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={statusVariant(item.status)}>
                  {statusLabel(item.status)}
                </Badge>
                {item.data_fim ? (
                  <span className="text-muted-foreground text-sm">
                    Fim: {formatDatePtBr(item.data_fim)}
                  </span>
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
                <TableHead>Tipo</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Fim</TableHead>
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
                        href={`/animais/${animalId}/saude/${item.id}/editar`}
                        className="hover:underline"
                      >
                        {tipoLabel(item.tipo_caso)}
                      </Link>
                    ) : (
                      tipoLabel(item.tipo_caso)
                    )}
                  </TableCell>
                  <TableCell>{formatDatePtBr(item.data_inicio)}</TableCell>
                  <TableCell>{formatDatePtBr(item.data_fim)}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(item.status)}>
                      {statusLabel(item.status)}
                    </Badge>
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
      <DeleteRecordDialog
        open={deleteId != null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Excluir registo de saúde"
        description="O status de saúde do animal será recalculado. Esta ação não pode ser desfeita."
        onConfirm={() => deleteId != null && deleteMutation.mutate(deleteId)}
        isPending={deleteMutation.isPending}
      />
    </>
  );
}
