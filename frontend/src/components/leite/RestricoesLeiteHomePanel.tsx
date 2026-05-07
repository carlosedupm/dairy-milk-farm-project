"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { getApiErrorMessage } from "@/lib/errors";
import { formatDatePtBr } from "@/lib/format";
import { listEmLactacaoByFazenda, type Animal } from "@/services/animais";
import {
  createRestricao,
  liberarRestricao,
  listAtivas,
  MOTIVO_RESTRICAO_LEITE_LABELS,
  MOTIVOS_RESTRICAO_LEITE,
  type MotivoRestricaoLeite,
  type RestricaoLeiteAtiva,
} from "@/services/restricoesLeite";
import { QueryListContent } from "@/components/layout/QueryListContent";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function motivoLabel(m: string): string {
  return MOTIVO_RESTRICAO_LEITE_LABELS[m as MotivoRestricaoLeite] ?? m;
}

function podeLiberarRestricao(perfil: string | undefined): boolean {
  if (!perfil) return false;
  return perfil !== "FUNCIONARIO";
}

const qkAtivas = (fazendaId: number) =>
  ["restricoes-leite", "ativas", fazendaId] as const;
const qkAnimaisEmLactacao = (fazendaId: number) =>
  ["animais", "fazenda", fazendaId, "em-lactacao"] as const;

export function RestricoesLeiteHomePanel() {
  const { user } = useAuth();
  const { fazendaAtiva, isReady: fazendaReady } = useFazendaAtiva();
  const queryClient = useQueryClient();
  const podeLiberar = podeLiberarRestricao(user?.perfil);

  const [dialogNova, setDialogNova] = useState(false);
  const [dialogLiberar, setDialogLiberar] =
    useState<RestricaoLeiteAtiva | null>(null);

  const [animalIdStr, setAnimalIdStr] = useState<string>("");
  const [motivo, setMotivo] = useState<MotivoRestricaoLeite>(
    "TRATAMENTO_ANTIBIOTICO",
  );
  const [inicioEm, setInicioEm] = useState<string>("");
  const [observacao, setObservacao] = useState("");
  const [formErro, setFormErro] = useState<string | null>(null);

  const [liberadoEm, setLiberadoEm] = useState<string>("");
  const [liberadoObs, setLiberadoObs] = useState("");
  const [liberarErro, setLiberarErro] = useState<string | null>(null);

  const fazendaId = fazendaAtiva?.id;

  const {
    data: lista = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: fazendaId
      ? qkAtivas(fazendaId)
      : ["restricoes-leite", "ativas", "none"],
    queryFn: () => listAtivas(fazendaId!),
    enabled: Boolean(fazendaReady && fazendaId),
  });

  const { data: animais = [] } = useQuery({
    queryKey: fazendaId
      ? qkAnimaisEmLactacao(fazendaId)
      : ["animais", "fazenda", "none"],
    queryFn: () => listEmLactacaoByFazenda(fazendaId!),
    enabled: Boolean(fazendaReady && fazendaId && dialogNova),
  });

  const animaisOrdenados = useMemo(() => {
    return [...animais].sort((a, b) =>
      a.identificacao.localeCompare(b.identificacao, "pt-BR", {
        numeric: true,
      }),
    );
  }, [animais]);

  const invalidate = () => {
    if (fazendaId) {
      queryClient.invalidateQueries({ queryKey: qkAtivas(fazendaId) });
    }
  };

  const mutCriar = useMutation({
    mutationFn: (animalId: number) => {
      if (!fazendaId) throw new Error("Fazenda não selecionada");
      return createRestricao(fazendaId, {
        animal_id: animalId,
        motivo,
        inicio_em: inicioEm.trim() ? inicioEm.trim() : undefined,
        observacao: observacao.trim() ? observacao.trim() : null,
      });
    },
    onSuccess: () => {
      setDialogNova(false);
      setAnimalIdStr("");
      setMotivo("TRATAMENTO_ANTIBIOTICO");
      setInicioEm("");
      setObservacao("");
      setFormErro(null);
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["animais", "contexto"] });
    },
    onError: (e: unknown) => {
      setFormErro(getApiErrorMessage(e, "Não foi possível registrar."));
    },
  });

  const openLiberarDialog = (row: RestricaoLeiteAtiva) => {
    setLiberarErro(null);
    setLiberadoEm("");
    setLiberadoObs("");
    setDialogLiberar(row);
  };

  const mutLiberar = useMutation({
    mutationFn: (restricao: RestricaoLeiteAtiva) => {
      if (!fazendaId) throw new Error("Fazenda não selecionada");
      return liberarRestricao(fazendaId, restricao.id, {
        liberado_em: liberadoEm.trim() ? liberadoEm.trim() : undefined,
        liberado_observacao: liberadoObs.trim() ? liberadoObs.trim() : null,
      });
    },
    onSuccess: () => {
      setDialogLiberar(null);
      setLiberadoEm("");
      setLiberadoObs("");
      setLiberarErro(null);
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["animais", "contexto"] });
    },
    onError: (e: unknown) => {
      setLiberarErro(getApiErrorMessage(e, "Não foi possível liberar."));
    },
  });

  if (!fazendaReady) {
    return null;
  }

  if (!fazendaId) {
    return (
      <Card className="mb-6 border-amber-500/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden />
            Leite para descarte
          </CardTitle>
          <CardDescription>
            Selecione uma fazenda no topo para ver animais aguardando resultado
            do laboratório.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card className="mb-6 border-amber-500/30">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:space-y-0 pb-2">
          <div>
            <CardTitle className="text-lg">
              Leite para descarte (aguardando laboratório)
            </CardTitle>
            <CardDescription>
              Animais com leite apenas no "balde ao pé" até liberação do
              laticínio. Corda no pescoço, amostra pós-parto ou sintomas na
              ordenha — registre aqui para todos verem na ordenha.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="shrink-0 min-h-[44px]"
            onClick={() => {
              setFormErro(null);
              setDialogNova(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" aria-hidden />
            Registrar
          </Button>
        </CardHeader>
        <CardContent>
          <QueryListContent
            isLoading={isLoading}
            error={error}
            errorFallback="Não foi possível carregar a lista."
          >
            {lista.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum animal nesta situação no momento.
              </p>
            ) : (
              <>
                {/* Mobile: cards empilhados — status e ação sempre visíveis sem scroll horizontal */}
                <ul className="flex flex-col gap-3 md:hidden" aria-label="Animais aguardando laboratório">
                  {lista.map((row) => (
                    <li
                      key={row.id}
                      className="rounded-lg border border-amber-500/25 bg-card p-4 shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2 gap-y-3">
                        <Link
                          href={`/animais/${row.animal_id}`}
                          className="min-h-[44px] min-w-0 flex-1 text-base font-semibold text-primary underline-offset-4 hover:underline"
                        >
                          {row.identificacao}
                        </Link>
                        <Badge
                          variant="secondary"
                          className="shrink-0 border-amber-500/40 bg-amber-500/15 text-amber-950 dark:text-amber-100"
                        >
                          Aguardando laboratório
                        </Badge>
                      </div>
                      <dl className="mt-3 space-y-2 text-sm">
                        <div>
                          <dt className="text-muted-foreground">Motivo</dt>
                          <dd className="font-medium text-foreground">
                            {motivoLabel(row.motivo)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Desde</dt>
                          <dd className="text-foreground">
                            {formatDatePtBr(row.inicio_em)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Observação</dt>
                          <dd className="break-words text-foreground">
                            {row.observacao?.trim() ? row.observacao : "—"}
                          </dd>
                        </div>
                      </dl>
                      <div className="mt-4 border-t border-border pt-4">
                        {podeLiberar ? (
                          <Button
                            type="button"
                            variant="default"
                            className="h-12 w-full text-base"
                            onClick={() => openLiberarDialog(row)}
                          >
                            Liberar após laboratório
                          </Button>
                        ) : (
                          <p className="rounded-md bg-muted/60 px-3 py-3 text-center text-sm leading-snug text-muted-foreground">
                            Liberação após o resultado do laboratório é feita pela{" "}
                            <span className="font-medium text-foreground">gestão</span>
                            {" "}(este perfil consulta e registra descarte).
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Desktop: tabela */}
                <div className="hidden overflow-x-auto rounded-md border md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Animal</TableHead>
                        <TableHead>Motivo</TableHead>
                        <TableHead>Desde</TableHead>
                        <TableHead>Observação</TableHead>
                        <TableHead className="w-[1%] whitespace-nowrap text-right">
                          Ações
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lista.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium">
                            <Link
                              href={`/animais/${row.animal_id}`}
                              className="text-primary underline-offset-4 hover:underline"
                            >
                              {row.identificacao}
                            </Link>
                          </TableCell>
                          <TableCell>{motivoLabel(row.motivo)}</TableCell>
                          <TableCell>{formatDatePtBr(row.inicio_em)}</TableCell>
                          <TableCell className="max-w-[200px] truncate text-muted-foreground">
                            {row.observacao?.trim() ? row.observacao : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            {podeLiberar ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="min-h-[40px]"
                                onClick={() => openLiberarDialog(row)}
                              >
                                Liberar
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                Gestão libera
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </QueryListContent>
        </CardContent>
      </Card>

      <Dialog open={dialogNova} onOpenChange={setDialogNova}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar descarte / amostra</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="rl-animal">Animal</Label>
              {animaisOrdenados.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum animal em lactação ativa nesta fazenda (cadastre lactação após o parto ou
                  verifique secagem).
                </p>
              ) : (
                <Select
                  value={animalIdStr || undefined}
                  onValueChange={setAnimalIdStr}
                >
                  <SelectTrigger id="rl-animal" className="w-full">
                    <SelectValue placeholder="Selecione o animal" />
                  </SelectTrigger>
                  <SelectContent>
                    {animaisOrdenados.map((a: Animal) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.identificacao}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Select
                value={motivo}
                onValueChange={(v) => setMotivo(v as MotivoRestricaoLeite)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MOTIVOS_RESTRICAO_LEITE.map((m) => (
                    <SelectItem key={m} value={m}>
                      {MOTIVO_RESTRICAO_LEITE_LABELS[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Início (opcional)</Label>
              <DatePicker
                value={inicioEm || undefined}
                onChange={(v) => setInicioEm(v)}
                manualInput
              />
              <p className="text-xs text-muted-foreground">
                Se vazio, usa a data de hoje.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rl-obs">Observação (opcional)</Label>
              <Textarea
                id="rl-obs"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Ex.: corda no pescoço; grumos na ordenha"
                rows={3}
              />
            </div>
            {formErro ? (
              <p className="text-sm text-destructive">{formErro}</p>
            ) : null}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogNova(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={mutCriar.isPending}
              onClick={() => {
                const animalId = Number(animalIdStr);
                if (!animalIdStr || Number.isNaN(animalId)) {
                  setFormErro("Selecione o animal.");
                  return;
                }
                setFormErro(null);
                mutCriar.mutate(animalId);
              }}
            >
              {mutCriar.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialogLiberar !== null}
        onOpenChange={(o) => !o && setDialogLiberar(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Liberar após laboratório</DialogTitle>
          </DialogHeader>
          {dialogLiberar ? (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Animal{" "}
                <span className="font-medium text-foreground">
                  {dialogLiberar.identificacao}
                </span>{" "}
                — {motivoLabel(dialogLiberar.motivo)}
              </p>
              <div className="space-y-2">
                <Label>Data da liberação (opcional)</Label>
                <DatePicker
                  value={liberadoEm || undefined}
                  onChange={(v) => setLiberadoEm(v)}
                  manualInput
                />
                <p className="text-xs text-muted-foreground">
                  Se vazio, usa hoje.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rl-lib-obs">Observação (opcional)</Label>
                <Textarea
                  id="rl-lib-obs"
                  value={liberadoObs}
                  onChange={(e) => setLiberadoObs(e.target.value)}
                  placeholder="Ex.: resultado laboratório OK"
                  rows={2}
                />
              </div>
              {liberarErro ? (
                <p className="text-sm text-destructive">{liberarErro}</p>
              ) : null}
            </div>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogLiberar(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={mutLiberar.isPending || !dialogLiberar}
              onClick={() => {
                if (dialogLiberar) mutLiberar.mutate(dialogLiberar);
              }}
            >
              {mutLiberar.isPending ? "Salvando…" : "Confirmar liberação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
