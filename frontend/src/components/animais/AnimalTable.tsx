"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Animal } from "@/services/animais";
import {
  remove,
  SEXO_LABELS,
  STATUS_SAUDE_LABELS,
  getCategoriaLabel,
  ORIGEM_LABELS,
  isAnimalForaDoRebanho,
  MOTIVO_SAIDA_LABELS,
  type MotivoSaida,
  type OrigemAquisicao,
  type Sexo,
  type StatusSaude,
} from "@/services/animais";
import { canRegistrarBaixa } from "@/config/appAccess";
import { useAuth } from "@/contexts/AuthContext";
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
import { formatDatePtBr } from "@/lib/format";
import { MobileListCard } from "@/components/layout/list/MobileListCard";
import { ListRowActionsMenu } from "@/components/layout/list/ListRowActionsMenu";
import { ResponsiveListContainer } from "@/components/layout/list/ResponsiveListContainer";
import { DeleteRecordDialog } from "@/components/layout/list/DeleteRecordDialog";
import { ListEmptyState } from "@/components/layout/ListEmptyState";
import { getApiErrorMessage } from "@/lib/errors";
import { toast } from "@/hooks/use-toast";
import { Beef } from "lucide-react";

type Props = {
  items: Animal[];
  showFazenda?: boolean;
  canManage?: boolean;
  hasActiveFilters?: boolean;
  filterTerm?: string;
  onClearFilters?: () => void;
  novoAnimalHref?: string;
};

const STATUS_VARIANT: Record<
  StatusSaude,
  "default" | "secondary" | "destructive" | "outline"
> = {
  SAUDAVEL: "default",
  DOENTE: "destructive",
  EM_TRATAMENTO: "secondary",
};

function animalSubtitle(a: Animal): string {
  const parts = [
    a.raca ?? null,
    a.sexo ? (SEXO_LABELS[a.sexo as Sexo] ?? a.sexo) : null,
    getCategoriaLabel(a.categoria),
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "—";
}

export function AnimalTable({
  items,
  showFazenda = false,
  canManage = true,
  hasActiveFilters = false,
  filterTerm,
  onClearFilters,
  novoAnimalHref,
}: Props) {
  const { user } = useAuth();
  const showBaixa = canRegistrarBaixa(user?.perfil);
  const queryClient = useQueryClient();
  const [deleteDialogOpenId, setDeleteDialogOpenId] = useState<number | null>(
    null
  );
  const [deleteError, setDeleteError] = useState("");
  const deleteTarget = items.find((a) => a.id === deleteDialogOpenId);

  const deleteMutation = useMutation({
    mutationFn: remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["animais"] });
      setDeleteError("");
      setDeleteDialogOpenId(null);
      toast.success("Animal excluído");
    },
    onError: (err: unknown) => {
      const message = getApiErrorMessage(
        err,
        "Não foi possível excluir este animal."
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
        icon={Beef}
        emptyTitle="Nenhum animal cadastrado"
        emptyDescription="Comece cadastrando seu primeiro animal."
        registerLabel="Cadastrar animal"
        registerHref={novoAnimalHref}
        canRegister={!!canManage}
        hasActiveFilters={hasActiveFilters}
        filterTerm={filterTerm}
        filteredDescription={
          hasActiveFilters && !filterTerm
            ? "Nenhum animal corresponde aos filtros selecionados."
            : undefined
        }
        onClearFilters={onClearFilters}
      />
    );
  }

  return (
    <>
      <ResponsiveListContainer
        mobile={items.map((a) => {
          const baixado = isAnimalForaDoRebanho(a);
          const menuItems = [];
          if (canManage) {
            menuItems.push({
              label: "Editar",
              href: `/animais/${a.id}/editar`,
            });
          }
          if (showBaixa && !baixado) {
            menuItems.push({
              label: "Registrar baixa",
              href: `/animais/baixa?animal_id=${a.id}`,
            });
          }
          if (canManage) {
            menuItems.push({
              label: "Excluir",
              variant: "destructive" as const,
              onSelect: () => setDeleteDialogOpenId(a.id),
            });
          }
          return (
          <MobileListCard
            key={a.id}
            href={`/animais/${a.id}`}
            title={a.identificacao}
            subtitle={animalSubtitle(a)}
            className={baixado ? "opacity-75" : undefined}
            meta={
              <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
                {baixado && a.motivo_saida ? (
                  <Badge variant="secondary">
                    {MOTIVO_SAIDA_LABELS[a.motivo_saida as MotivoSaida] ??
                      a.motivo_saida}
                  </Badge>
                ) : null}
                {a.status_saude ? (
                  <Badge
                    variant={
                      STATUS_VARIANT[a.status_saude as StatusSaude] ??
                      "default"
                    }
                  >
                    {STATUS_SAUDE_LABELS[a.status_saude as StatusSaude] ??
                      a.status_saude}
                  </Badge>
                ) : null}
                <span>Nasc.: {formatDatePtBr(a.data_nascimento)}</span>
              </div>
            }
            actions={
              menuItems.length > 0 ? (
                <ListRowActionsMenu items={menuItems} />
              ) : null
            }
          />
          );
        })}
        desktop={
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Identificação</TableHead>
                  <TableHead>Raça</TableHead>
                  <TableHead>Sexo</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Saúde</TableHead>
                  <TableHead>Nascimento</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">
                      {a.identificacao}
                    </TableCell>
                    <TableCell>{a.raca ?? "—"}</TableCell>
                    <TableCell>
                      {a.sexo ? SEXO_LABELS[a.sexo as Sexo] ?? a.sexo : "—"}
                    </TableCell>
                    <TableCell>{getCategoriaLabel(a.categoria)}</TableCell>
                    <TableCell>
                      {a.origem_aquisicao ? (
                        <Badge variant="outline">
                          {ORIGEM_LABELS[
                            a.origem_aquisicao as OrigemAquisicao
                          ] ?? a.origem_aquisicao}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {a.status_saude ? (
                        <Badge
                          variant={
                            STATUS_VARIANT[a.status_saude as StatusSaude] ??
                            "default"
                          }
                        >
                          {STATUS_SAUDE_LABELS[
                            a.status_saude as StatusSaude
                          ] ?? a.status_saude}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>{formatDatePtBr(a.data_nascimento)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button variant="outline" size="default" asChild>
                          <Link href={`/animais/${a.id}`}>Ver</Link>
                        </Button>
                        {canManage && (
                          <>
                            <Button variant="outline" size="default" asChild>
                              <Link href={`/animais/${a.id}/editar`}>
                                Editar
                              </Link>
                            </Button>
                            <Button
                              variant="destructive"
                              size="default"
                              onClick={() => setDeleteDialogOpenId(a.id)}
                            >
                              Excluir
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        }
      />
      {canManage && deleteTarget ? (
        <DeleteRecordDialog
          open={deleteDialogOpenId != null}
          onOpenChange={(open) => {
            if (!open) {
              setDeleteDialogOpenId(null);
              setDeleteError("");
            }
          }}
          title="Excluir animal"
          description={
            <>
              Tem certeza que deseja excluir &quot;
              {deleteTarget.identificacao}&quot;? Esta ação não pode ser
              desfeita.
            </>
          }
          onConfirm={() => handleDelete(deleteTarget.id)}
          isPending={deleteMutation.isPending}
          error={deleteError}
        />
      ) : null}
    </>
  );
}
