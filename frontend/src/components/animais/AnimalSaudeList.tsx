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
import { invalidateAnimalTimeline } from "@/services/animais";
import {
  canEditarRegistroSaude,
  canExcluirRegistroSaude,
} from "@/config/appAccess";
import { formatDatePtBr } from "@/lib/format";
import { cn } from "@/lib/utils";
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
import { getApiErrorMessage } from "@/lib/errors";
import { toast } from "@/hooks/use-toast";

export const ANIMAL_SAUDE_EMPTY_MESSAGE =
  "Nenhum registo de saúde para este animal.";

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

function statusBadgeClassName(s: string): string | undefined {
  if (s === "CONCLUIDO") {
    return "border-feedback-success/40 bg-feedback-success/10 text-feedback-success";
  }
  if (s === "CANCELADO") {
    return "border-muted-foreground/30 bg-muted text-muted-foreground";
  }
  return undefined;
}

function statusBadgeVariant(
  s: string
): "default" | "secondary" | "destructive" | "outline" {
  if (s === "ATIVO") return "destructive";
  return "outline";
}

function observacoesDisplay(obs?: string | null): string {
  if (!obs?.trim()) return "—";
  return obs.trim();
}

export function AnimalSaudeList({ animalId, items, perfil }: Props) {
  const queryClient = useQueryClient();
  const canEdit = canEditarRegistroSaude(perfil);
  const canDelete = canExcluirRegistroSaude(perfil);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState("");

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
      invalidateAnimalTimeline(queryClient, animalId);
      setDeleteError("");
      setDeleteId(null);
      toast.success("Registo de saúde excluído");
    },
    onError: (err: unknown) => {
      const message = getApiErrorMessage(
        err,
        "Não foi possível excluir este registo."
      );
      setDeleteError(message);
      toast.error(message);
    },
  });

  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        {ANIMAL_SAUDE_EMPTY_MESSAGE}
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

  const statusBadge = (status: string) => (
    <Badge
      variant={statusBadgeVariant(status)}
      className={cn("shrink-0", statusBadgeClassName(status))}
    >
      {statusLabel(status)}
    </Badge>
  );

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
            subtitle={`Início: ${formatDatePtBr(item.data_inicio)}${
              item.data_fim
                ? ` · Fim: ${formatDatePtBr(item.data_fim)}`
                : ""
            }`}
            meta={
              <div className="space-y-2 min-w-0">
                {statusBadge(item.status)}
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
                <TableHead>Tipo caso</TableHead>
                <TableHead>Data início</TableHead>
                <TableHead>Data fim</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Observações</TableHead>
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
                  <TableCell>{statusBadge(item.status)}</TableCell>
                  <TableCell className="max-w-[16rem] break-words text-sm">
                    {observacoesDisplay(item.observacoes)}
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
        onOpenChange={(open) => {
          if (!open) {
            setDeleteId(null);
            setDeleteError("");
          }
        }}
        title="Excluir registo de saúde"
        description="O status de saúde do animal será recalculado. Esta ação não pode ser desfeita."
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
