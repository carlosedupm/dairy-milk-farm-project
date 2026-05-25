"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  get as getAnimal,
  getContexto,
  remove,
  reverterBaixa,
  SEXO_LABELS,
  STATUS_SAUDE_LABELS,
  getCategoriaLabel,
  ORIGEM_LABELS,
  isAnimalForaDoRebanho,
  MOTIVO_SAIDA_LABELS,
  type MotivoSaida,
} from "@/services/animais";
import {
  canRegistrarBaixa,
  canReverterBaixa,
} from "@/config/appAccess";
import { getStatusReprodutivoLabel } from "@/components/animais/animalResumoUtils";
import { AnimalFichaCiclo } from "@/components/animais/AnimalFichaCiclo";
import type { OrigemAquisicao } from "@/services/animais";
import type { Sexo, StatusSaude } from "@/services/animais";
import { get as getFazenda } from "@/services/fazendas";
import { isPathAllowedForPerfil } from "@/config/appAccess";
import { formatDatePtBr } from "@/lib/format";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
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
import { Beef, Edit, Trash2, PlusCircle, Milk, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  animaisFazendaQueryKey,
  patchAnimalInFazendaCaches,
} from "@/components/gestao/useAnimaisMap";

const STATUS_VARIANT: Record<
  StatusSaude,
  "default" | "secondary" | "destructive" | "outline"
> = {
  SAUDAVEL: "default",
  DOENTE: "destructive",
  EM_TRATAMENTO: "secondary",
};

function AnimalDetailContent() {
  const { user } = useAuth();
  const params = useParams();
  const id = Number(params.id);
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    data: animal,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["animais", id],
    queryFn: () => getAnimal(id),
    enabled: !Number.isNaN(id),
  });

  const { data: fazenda } = useQuery({
    queryKey: ["fazendas", animal?.fazenda_id],
    queryFn: () => getFazenda(animal!.fazenda_id),
    enabled: !!animal?.fazenda_id,
  });

  const { data: contexto, isLoading: contextoLoading } = useQuery({
    queryKey: ["animais", id, "contexto"],
    queryFn: () => getContexto(id),
    enabled: !Number.isNaN(id) && !!animal,
  });

  const foraDoRebanho =
    contexto?.fora_do_rebanho ?? (animal ? isAnimalForaDoRebanho(animal) : false);

  const canRegistrarProducao =
    !!user?.perfil &&
    isPathAllowedForPerfil(user.perfil, "/producao/novo") &&
    !foraDoRebanho;

  const revertMutation = useMutation({
    mutationFn: () => reverterBaixa(id),
    onSuccess: (animalAtualizado) => {
      patchAnimalInFazendaCaches(queryClient, animalAtualizado);
      const fid = animalAtualizado.fazenda_id ?? animal?.fazenda_id;
      queryClient.invalidateQueries({ queryKey: ["animais"] });
      if (fid) {
        queryClient.invalidateQueries({
          queryKey: animaisFazendaQueryKey(fid, "operacional"),
        });
        queryClient.invalidateQueries({
          queryKey: animaisFazendaQueryKey(fid, "todos"),
        });
      }
      queryClient.invalidateQueries({ queryKey: ["animais", id] });
      queryClient.invalidateQueries({ queryKey: ["animais", id, "contexto"] });
      queryClient.invalidateQueries({ queryKey: ["conformidade"] });
      queryClient.invalidateQueries({ queryKey: ["resumo-pecuario"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["animais"] });
      if (animal?.fazenda_id) {
        queryClient.invalidateQueries({
          queryKey: ["fazendas", animal.fazenda_id, "animais"],
        });
      }
      router.push("/animais");
    },
  });

  if (Number.isNaN(id)) {
    return (
      <PageContainer variant="narrow">
        <p className="text-destructive">ID inválido.</p>
        <BackLink href="/animais">Voltar</BackLink>
      </PageContainer>
    );
  }

  if (isLoading || (!error && !animal)) {
    return (
      <PageContainer variant="narrow">
        <p className="text-muted-foreground">Carregando…</p>
      </PageContainer>
    );
  }

  if (error || !animal) {
    return (
      <PageContainer variant="narrow">
        <p className="text-destructive">Animal não encontrado.</p>
        <BackLink href="/animais">Voltar</BackLink>
      </PageContainer>
    );
  }

  const statusSaude = animal.status_saude as StatusSaude | undefined;
  const sexo = animal.sexo as Sexo | undefined;
  const canManageAnimal = user?.perfil !== "FUNCIONARIO";
  const showRegistrarBaixa =
    canRegistrarBaixa(user?.perfil) && !foraDoRebanho;
  const showReverterBaixa =
    canReverterBaixa(user?.perfil) && foraDoRebanho;

  return (
    <PageContainer variant="narrow">
      <div className="mb-4">
        <BackLink href="/animais">Voltar aos animais</BackLink>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center gap-2 space-y-0 pb-2">
            <Beef className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-xl">{animal.identificacao}</CardTitle>
            {foraDoRebanho ? (
              <Badge variant="secondary">Fora do rebanho</Badge>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Raça
                </dt>
                <dd className="mt-0.5">{animal.raca ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Categoria
                </dt>
                <dd className="mt-0.5">{getCategoriaLabel(animal.categoria)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Origem
                </dt>
                <dd className="mt-0.5">
                  {animal.origem_aquisicao
                    ? ORIGEM_LABELS[animal.origem_aquisicao as OrigemAquisicao] ?? animal.origem_aquisicao
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
                    <dd className="mt-0.5">
                      {formatDatePtBr(animal.data_saida)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">
                      Motivo da baixa
                    </dt>
                    <dd className="mt-0.5">
                      {animal.motivo_saida
                        ? MOTIVO_SAIDA_LABELS[
                            animal.motivo_saida as MotivoSaida
                          ] ?? animal.motivo_saida
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
                <dt className="text-sm font-medium text-muted-foreground">
                  Sexo
                </dt>
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
                    <Link href={`/animais/baixa?animal_id=${id}`}>
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
                          reabre automaticamente lactação, gestação ou
                          restrição de leite — corrija manualmente se
                          necessário. O painel de conformidade pode sinalizar
                          inconsistências (INT-007).
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
                  <Link href={`/animais/${id}/editar`}>
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

        {fazenda && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Fazenda</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{fazenda.nome}</p>
              {canManageAnimal && (
                <Button variant="link" className="h-auto p-0 mt-1" asChild>
                  <Link href={`/fazendas/${animal.fazenda_id}/animais`}>
                    Ver todos os animais desta fazenda
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Milk className="h-4 w-4" />
              Produção de leite
            </CardTitle>
            {canRegistrarProducao && (
              <Button size="sm" asChild>
                <Link href={`/producao/novo?animal_id=${id}`}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Registrar produção
                </Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {contexto?.resumo_producao &&
            contexto.resumo_producao.total_registros > 0 ? (
              <dl className="grid gap-2 sm:grid-cols-3">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Total (litros)
                  </dt>
                  <dd className="text-lg font-semibold">
                    {contexto.resumo_producao.total_litros.toFixed(1)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Média (litros)
                  </dt>
                  <dd className="text-lg font-semibold">
                    {contexto.resumo_producao.media_litros.toFixed(1)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Registros
                  </dt>
                  <dd className="text-lg font-semibold">
                    {contexto.resumo_producao.total_registros}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-muted-foreground text-sm">
                Nenhum registro de produção ainda.
              </p>
            )}
          </CardContent>
        </Card>

        {contextoLoading && (
          <p className="text-sm text-muted-foreground">Carregando ciclo…</p>
        )}
        {contexto ? <AnimalFichaCiclo contexto={contexto} /> : null}
      </div>
    </PageContainer>
  );
}

export default function AnimalDetailPage() {
  return (
    <ProtectedRoute>
      <AnimalDetailContent />
    </ProtectedRoute>
  );
}
