"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ProducaoLeite } from "@/services/producao";
import type { Lactacao } from "@/services/lactacoes";
import { remove } from "@/services/producao";
import { invalidateAnimalTimeline } from "@/services/animais";
import { AnimalGestaoLabel } from "@/components/gestao/AnimalGestaoLabel";
import { useGestaoAnimaisByIdMap } from "@/components/gestao/useAnimaisMap";
import { formatDateTimePtBr } from "@/lib/format";
import { formatLitrosForList } from "@/lib/litros-format";
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
import { ListEmptyState } from "@/components/layout/ListEmptyState";
import { getApiErrorMessage } from "@/lib/errors";
import { toast } from "@/hooks/use-toast";
import { Milk } from "lucide-react";

type Props = {
  items: ProducaoLeite[];
  fazendaId?: number;
  showAnimal?: boolean;
  lactacoesById?: Map<number, Lactacao>;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
  novoProducaoHref?: string;
  canRegister?: boolean;
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
  lactacoesById,
  hasActiveFilters = false,
  onClearFilters,
  novoProducaoHref,
  canRegister = true,
}: Props) {
  const queryClient = useQueryClient();
  const animalIds = useMemo(
    () =>
      showAnimal
        ? items.map((i) => i.animal_id).filter((id): id is number => id > 0)
        : [],
    [items, showAnimal],
  );
  const { animaisById } = useGestaoAnimaisByIdMap(
    showAnimal ? fazendaId : undefined,
    animalIds,
  );
  const [deleteDialogOpenId, setDeleteDialogOpenId] = useState<number | null>(
    null
  );
  const [deleteError, setDeleteError] = useState("");
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
        invalidateAnimalTimeline(queryClient, item.animal_id);
      }
      setDeleteError("");
      setDeleteDialogOpenId(null);
      toast.success("Registro de produção excluído");
    },
    onError: (err: unknown) => {
      const message = getApiErrorMessage(
        err,
        "Não foi possível excluir este registro."
      );
      setDeleteError(message);
      toast.error(message);
    },
  });

  const handleDelete = (id: number) => {
    setDeleteError("");
    deleteMutation.mutate(id);
  };

  const formatLactacao = (lactacaoId?: number | null) => {
    if (lactacaoId == null) return "—";
    const lact = lactacoesById?.get(lactacaoId);
    if (lact) return `#${lact.numero_lactacao}`;
    return `#${lactacaoId}`;
  };

  const showLactacao = lactacoesById != null;

  if (items.length === 0) {
    return (
      <ListEmptyState
        icon={Milk}
        emptyTitle="Registe a primeira ordenha"
        emptyDescription="Use o modo ordenha para lançar o leite vaca a vaca no turno, ou o registo avulso para um animal."
        registerLabel="Iniciar ordenha"
        registerHref={novoProducaoHref}
        canRegister={canRegister ?? true}
        hasActiveFilters={hasActiveFilters}
        filteredDescription="Nenhum registro corresponde aos filtros selecionados."
        onClearFilters={onClearFilters}
      />
    );
  }

  return (
    <>
      <ResponsiveListContainer
        mobile={items.map((p) => {
          const animalTitle = showAnimal ? (
            <AnimalGestaoLabel
              animalId={p.animal_id}
              animaisById={animaisById}
            />
          ) : null;
          return (
            <MobileListCard
              key={p.id}
              href={`/producao/${p.id}/editar`}
              title={animalTitle ?? formatDateTimePtBr(p.data_hora)}
              subtitle={
                animalTitle ? formatDateTimePtBr(p.data_hora) : undefined
              }
              meta={
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono">
                    {formatLitrosForList(p.quantidade)} L
                  </span>
                  {showLactacao ? (
                    <span className="text-muted-foreground">
                      Lactação {formatLactacao(p.lactacao_id)}
                    </span>
                  ) : null}
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
                  {showLactacao ? <TableHead>Lactação</TableHead> : null}
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
                          <AnimalGestaoLabel
                            animalId={p.animal_id}
                            animaisById={animaisById}
                          />
                        </Link>
                      </TableCell>
                    ) : null}
                    {showLactacao ? (
                      <TableCell>{formatLactacao(p.lactacao_id)}</TableCell>
                    ) : null}
                    <TableCell className="font-medium">
                      {formatDateTimePtBr(p.data_hora)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatLitrosForList(p.quantidade)} L
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
            if (!open) {
              setDeleteDialogOpenId(null);
              setDeleteError("");
            }
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
          error={deleteError}
        />
      ) : null}
    </>
  );
}
