"use client";

import Link from "next/link";
import {
  ORIGEM_LABELS,
  SEXO_LABELS,
  STATUS_SAUDE_LABELS,
  getCategoriaLabel,
  MOTIVO_SAIDA_LABELS,
  type MotivoSaida,
  type OrigemAquisicao,
  type Sexo,
  type StatusSaude,
} from "@/services/animais";
import type { Animal, AnimalContexto } from "@/services/animais";
import type { Fazenda } from "@/services/fazendas";
import { getStatusReprodutivoLabel } from "@/components/animais/animalResumoUtils";
import { AnimalFichaCiclo } from "@/components/animais/AnimalFichaCiclo";
import { formatDatePtBr } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Edit, LogOut, Trash2 } from "lucide-react";
import type { UseMutationResult } from "@tanstack/react-query";

const STATUS_VARIANT: Record<
  StatusSaude,
  "default" | "secondary" | "destructive" | "outline"
> = {
  SAUDAVEL: "default",
  DOENTE: "destructive",
  EM_TRATAMENTO: "secondary",
};

type Props = {
  animalId: number;
  animal: Animal;
  contexto: AnimalContexto | undefined;
  contextoLoading: boolean;
  fazenda: Fazenda | undefined;
  foraDoRebanho: boolean;
  canManageAnimal: boolean;
  showRegistrarBaixa: boolean;
  showReverterBaixa: boolean;
  revertMutation: UseMutationResult<Animal, Error, void, unknown>;
  deleteMutation: UseMutationResult<void, Error, void, unknown>;
};

export function AnimalFichaTabVisaoGeral({
  animalId,
  animal,
  contexto,
  contextoLoading,
  fazenda,
  foraDoRebanho,
  canManageAnimal,
  showRegistrarBaixa,
  showReverterBaixa,
  revertMutation,
  deleteMutation,
}: Props) {
  const statusSaude = animal.status_saude as StatusSaude | undefined;
  const sexo = animal.sexo as Sexo | undefined;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Dados do animal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Raça</dt>
              <dd className="mt-0.5">{animal.raca ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Categoria
              </dt>
              <dd className="mt-0.5">{getCategoriaLabel(animal.categoria)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Origem</dt>
              <dd className="mt-0.5">
                {animal.origem_aquisicao
                  ? ORIGEM_LABELS[animal.origem_aquisicao as OrigemAquisicao] ??
                    animal.origem_aquisicao
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Data de nascimento
              </dt>
              <dd className="mt-0.5">{formatDatePtBr(animal.data_nascimento)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Data de entrada
              </dt>
              <dd className="mt-0.5">{formatDatePtBr(animal.data_entrada)}</dd>
            </div>
            {foraDoRebanho ? (
              <>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Data de saída
                  </dt>
                  <dd className="mt-0.5">{formatDatePtBr(animal.data_saida)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Motivo da baixa
                  </dt>
                  <dd className="mt-0.5">
                    {animal.motivo_saida
                      ? MOTIVO_SAIDA_LABELS[animal.motivo_saida as MotivoSaida] ??
                        animal.motivo_saida
                      : "—"}
                  </dd>
                </div>
                {animal.observacao_saida ? (
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-muted-foreground">
                      Observação
                    </dt>
                    <dd className="mt-0.5 whitespace-pre-wrap">
                      {animal.observacao_saida}
                    </dd>
                  </div>
                ) : null}
                {contexto?.saida_resumo?.registrado_por ? (
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-muted-foreground">
                      Baixa registada por
                    </dt>
                    <dd className="mt-0.5">
                      {contexto.saida_resumo.registrado_por}
                    </dd>
                  </div>
                ) : null}
              </>
            ) : null}
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Sexo</dt>
              <dd className="mt-0.5">
                {sexo ? SEXO_LABELS[sexo] ?? sexo : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Status de saúde
              </dt>
              <dd className="mt-0.5">
                {statusSaude ? (
                  <Badge variant={STATUS_VARIANT[statusSaude] ?? "default"}>
                    {STATUS_SAUDE_LABELS[statusSaude] ?? statusSaude}
                  </Badge>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                {foraDoRebanho
                  ? "Estado reprodutivo ao sair"
                  : "Status reprodutivo"}
              </dt>
              <dd className="mt-0.5">
                {animal.status_reprodutivo
                  ? getStatusReprodutivoLabel(animal.status_reprodutivo)
                  : "—"}
              </dd>
            </div>
          </dl>

          {(canManageAnimal || showRegistrarBaixa || showReverterBaixa) && (
            <div className="flex flex-wrap gap-2 pt-2">
              {showRegistrarBaixa && (
                <Button variant="default" size="default" asChild>
                  <Link href={`/animais/baixa?animal_id=${animalId}`}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Registrar baixa
                  </Link>
                </Button>
              )}
              {showReverterBaixa && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="default">
                      Reverter baixa
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Reverter baixa</DialogTitle>
                      <DialogDescription>
                        Remove a data e o motivo de saída deste animal. Não
                        reabre automaticamente lactação, gestação ou restrição de
                        leite — corrija manualmente se necessário. O painel de
                        conformidade pode sinalizar inconsistências (INT-007).
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline">Cancelar</Button>
                      </DialogClose>
                      <Button
                        onClick={() => revertMutation.mutate()}
                        disabled={revertMutation.isPending}
                      >
                        {revertMutation.isPending
                          ? "A reverter…"
                          : "Confirmar reversão"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
              {canManageAnimal && (
                <Button variant="outline" size="default" asChild>
                  <Link href={`/animais/${animalId}/editar`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </Link>
                </Button>
              )}
              {canManageAnimal && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="destructive" size="default">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Excluir animal</DialogTitle>
                      <DialogDescription>
                        Tem certeza que deseja excluir &quot;
                        {animal.identificacao}&quot;? Esta ação não pode ser
                        desfeita.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline">Cancelar</Button>
                      </DialogClose>
                      <Button
                        variant="destructive"
                        onClick={() => deleteMutation.mutate()}
                        disabled={deleteMutation.isPending}
                      >
                        {deleteMutation.isPending ? "Excluindo…" : "Excluir"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {fazenda && !canManageAnimal ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Fazenda</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{fazenda.nome}</p>
          </CardContent>
        </Card>
      ) : null}

      {contextoLoading && (
        <p className="text-sm text-muted-foreground">Carregando ciclo…</p>
      )}
      {contexto ? <AnimalFichaCiclo contexto={contexto} /> : null}
    </div>
  );
}
