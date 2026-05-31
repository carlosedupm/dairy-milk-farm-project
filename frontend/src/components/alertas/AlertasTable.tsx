"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import type { Alerta, StatusAlerta } from "@/services/alertas";
import { deleteAlerta } from "@/services/alertas";
import { Badge } from "@/components/ui/badge";
import { DeleteRecordDialog } from "@/components/layout/list/DeleteRecordDialog";
import { MobileListCard } from "@/components/layout/list/MobileListCard";
import {
  ListRowActionsMenu,
  type ListRowActionItem,
} from "@/components/layout/list/ListRowActionsMenu";
import { ResponsiveListContainer } from "@/components/layout/list/ResponsiveListContainer";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getApiErrorMessage,
  parsePrefixedConformidadeMessage,
} from "@/lib/errors";
import { toast } from "@/hooks/use-toast";
import { formatDatePtBr } from "@/lib/format";
import {
  alertaSeveridadeLabel,
  alertaStatusLabel,
  alertaTipoLabel,
  SEVERIDADE_BADGE_VARIANT,
} from "./alertas-utils";
import { ListEmptyState } from "@/components/layout/ListEmptyState";

type Props = {
  items: Alerta[];
  fazendaId: number;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
  canEmAndamento: boolean;
  canResolve: boolean;
  canDelete: boolean;
  onStatusChange: (alertaId: number, status: StatusAlerta) => void;
  onDeleteSuccess: () => void;
};

function AlertasMetaBadges({ item }: { item: Alerta }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      <Badge variant={SEVERIDADE_BADGE_VARIANT[item.severidade] ?? "outline"}>
        {alertaSeveridadeLabel(item.severidade)}
      </Badge>
      <Badge variant="outline">{alertaStatusLabel(item.status)}</Badge>
      <Badge variant="secondary">{alertaTipoLabel(item.tipo)}</Badge>
    </div>
  );
}

function buildMenuItems(
  item: Alerta,
  canEmAndamento: boolean,
  canResolve: boolean,
  canDelete: boolean,
  onStatusChange: Props["onStatusChange"],
  onDeleteRequest: (id: number) => void
): ListRowActionItem[] {
  const actions: ListRowActionItem[] = [];
  if (canEmAndamento && item.status === "ABERTO") {
    actions.push({
      label: "Marcar em andamento",
      onSelect: () => onStatusChange(item.id, "EM_ANDAMENTO"),
    });
  }
  if (canResolve && !["RESOLVIDO", "IGNORADO"].includes(item.status)) {
    actions.push({
      label: "Resolver",
      onSelect: () => onStatusChange(item.id, "RESOLVIDO"),
    });
    actions.push({
      label: "Ignorar",
      onSelect: () => onStatusChange(item.id, "IGNORADO"),
    });
  }
  if (canDelete && item.tipo === "MANUAL") {
    actions.push({
      label: "Excluir",
      variant: "destructive",
      onSelect: () => onDeleteRequest(item.id),
    });
  }
  return actions;
}

export function AlertasTable({
  items,
  fazendaId,
  hasActiveFilters = false,
  onClearFilters,
  canEmAndamento,
  canResolve,
  canDelete,
  onStatusChange,
  onDeleteSuccess,
}: Props) {
  const [deleteDialogOpenId, setDeleteDialogOpenId] = useState<number | null>(
    null
  );
  const [deleteError, setDeleteError] = useState("");
  const [deleteConformidadeCode, setDeleteConformidadeCode] = useState<
    string | undefined
  >(undefined);

  const deleteMutation = useMutation({
    mutationFn: (alertaId: number) => deleteAlerta(fazendaId, alertaId),
    onSuccess: () => {
      onDeleteSuccess();
      setDeleteError("");
      setDeleteConformidadeCode(undefined);
      setDeleteDialogOpenId(null);
      toast.success("Alerta excluído");
    },
    onError: (err: unknown) => {
      const raw = getApiErrorMessage(err, "Erro ao excluir.");
      const parsed = parsePrefixedConformidadeMessage(raw);
      setDeleteError(parsed.message);
      setDeleteConformidadeCode(parsed.conformidadeCode);
      toast.error(parsed.message || raw);
    },
  });

  const rowActionsById = useMemo(() => {
    const map = new Map<number, ListRowActionItem[]>();
    for (const item of items) {
      map.set(
        item.id,
        buildMenuItems(
          item,
          canEmAndamento,
          canResolve,
          canDelete,
          onStatusChange,
          setDeleteDialogOpenId
        )
      );
    }
    return map;
  }, [
    items,
    canEmAndamento,
    canResolve,
    canDelete,
    onStatusChange,
  ]);

  if (items.length === 0) {
    if (hasActiveFilters) {
      return (
        <ListEmptyState
          emptyTitle="Nenhum alerta"
          hasActiveFilters
          filteredDescription="Nenhum alerta corresponde aos filtros selecionados."
          onClearFilters={onClearFilters}
          canRegister={false}
        />
      );
    }

    return (
      <ListEmptyState
        variant="success"
        emptyTitle="Nenhum alerta"
        emptyDescription="Tudo em ordem! Não há alertas pendentes nesta fazenda."
        canRegister={false}
      />
    );
  }

  return (
    <>
      <ResponsiveListContainer
        mobile={items.map((item) => {
          const actions = rowActionsById.get(item.id) ?? [];
          return (
            <MobileListCard
              key={item.id}
              title={item.titulo}
              subtitle={
                item.animal_identificacao
                  ? `Animal: ${item.animal_identificacao}`
                  : undefined
              }
              meta={
                <>
                  <AlertasMetaBadges item={item} />
                  {item.data_prevista ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      Previsto: {formatDatePtBr(item.data_prevista)}
                    </p>
                  ) : null}
                  {item.descricao?.trim() ? (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {item.descricao.trim()}
                    </p>
                  ) : null}
                </>
              }
              href={
                item.animal_id ? `/animais/${item.animal_id}` : undefined
              }
              actions={
                actions.length > 0 ? (
                  <ListRowActionsMenu items={actions} />
                ) : undefined
              }
            />
          );
        })}
        desktop={
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Severidade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Animal</TableHead>
                  <TableHead>Previsto</TableHead>
                  <TableHead className="w-[52px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const actions = rowActionsById.get(item.id) ?? [];
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium max-w-[200px]">
                        <div className="min-w-0">
                          <p className="truncate">{item.titulo}</p>
                          {item.descricao?.trim() ? (
                            <p className="text-xs text-muted-foreground truncate">
                              {item.descricao.trim()}
                            </p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>{alertaTipoLabel(item.tipo)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            SEVERIDADE_BADGE_VARIANT[item.severidade] ??
                            "outline"
                          }
                        >
                          {alertaSeveridadeLabel(item.severidade)}
                        </Badge>
                      </TableCell>
                      <TableCell>{alertaStatusLabel(item.status)}</TableCell>
                      <TableCell>
                        {item.animal_id && item.animal_identificacao ? (
                          <Link
                            href={`/animais/${item.animal_id}`}
                            className="text-primary underline-offset-4 hover:underline"
                          >
                            {item.animal_identificacao}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {item.data_prevista
                          ? formatDatePtBr(item.data_prevista)
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {actions.length > 0 ? (
                          <ListRowActionsMenu items={actions} />
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
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
            setDeleteConformidadeCode(undefined);
          }
        }}
        title="Excluir alerta"
        description="Este alerta manual será removido permanentemente."
        onConfirm={() => {
          if (deleteDialogOpenId != null) {
            setDeleteError("");
            setDeleteConformidadeCode(undefined);
            deleteMutation.mutate(deleteDialogOpenId);
          }
        }}
        isPending={deleteMutation.isPending}
        error={deleteError}
        conformidadeCode={deleteConformidadeCode}
      />
    </>
  );
}
