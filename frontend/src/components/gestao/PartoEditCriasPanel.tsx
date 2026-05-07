"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { create as createCria, listByParto } from "@/services/crias";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CRIA_CONDICAO_OPTIONS,
  CRIA_SEXO_OPTIONS,
  defaultCriaLinha,
  type CriaLinhaFormState,
} from "@/components/gestao/cria-constants";
import { getApiErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

type Props = {
  partoId: number;
  fazendaId: number;
  numeroCriasText: string;
  /** Raça da vaca selecionada no formulário (placeholder na raça da cria). */
  racaMae?: string;
};

function sexoLabel(v: string): string {
  return CRIA_SEXO_OPTIONS.find((o) => o.value === v)?.label ?? v;
}

function condicaoLabel(v: string): string {
  return CRIA_CONDICAO_OPTIONS.find((o) => o.value === v)?.label ?? v;
}

export function PartoEditCriasPanel({ partoId, fazendaId, numeroCriasText, racaMae }: Props) {
  const queryClient = useQueryClient();
  const esperado = Math.max(1, parseInt(numeroCriasText, 10) || 1);
  const [draft, setDraft] = useState<CriaLinhaFormState>(() => defaultCriaLinha());
  const [localError, setLocalError] = useState<string | null>(null);

  const { data: crias = [], isLoading } = useQuery({
    queryKey: ["crias", partoId],
    queryFn: () => listByParto(partoId),
  });

  const count = crias.length;
  const faltaCadastrar = count < esperado;
  const maisQueInformado = count > esperado;

  const mutation = useMutation({
    mutationFn: async () => {
      let peso: number | undefined;
      if (draft.condicao === "VIVO" && draft.peso.trim()) {
        const p = Number(draft.peso.trim().replace(",", "."));
        if (!Number.isFinite(p) || p < 0) {
          throw new Error("Peso inválido. Use número em kg (ex.: 38 ou 38,5).");
        }
        peso = p;
      }
      const ident = draft.identificacao.trim();
      const raca = draft.raca.trim();
      return createCria({
        parto_id: partoId,
        sexo: draft.sexo,
        condicao: draft.condicao,
        peso,
        ...(ident ? { animal_identificacao: ident } : {}),
        ...(raca ? { animal_raca: raca } : {}),
      });
    },
    onMutate: () => setLocalError(null),
    onSuccess: () => {
      setDraft(defaultCriaLinha());
      queryClient.invalidateQueries({ queryKey: ["crias", partoId] });
      queryClient.invalidateQueries({ queryKey: ["animais", fazendaId] });
    },
    onError: (err) => {
      setLocalError(
        err instanceof Error ? err.message : getApiErrorMessage(err, "Erro ao registrar cria.")
      );
    },
  });

  const submitError = localError;

  return (
    <div className="space-y-4 border-t border-border pt-5">
      <div>
        <h3 className="text-sm font-medium text-foreground">Crias registradas</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Cada cria é um registro separado (sexo e situação ao nascer). Você pode complementar aqui se o parto
          já existia sem todas as crias cadastradas.
        </p>
      </div>

      {(count !== esperado || maisQueInformado) && (
        <div
          className={cn(
            "rounded-md border px-3 py-2 text-sm",
            maisQueInformado
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : "border-amber-500/50 bg-amber-500/10 text-amber-950 dark:text-amber-100"
          )}
          role="status"
        >
          {maisQueInformado ? (
            <>
              Existem <strong>{count}</strong> animais na cria registrados, mas o parto indica{" "}
              <strong>{esperado}</strong>. Ajuste o campo <strong>Número de animais na cria</strong> no formulário acima
              ou revise os registros.
            </>
          ) : (
            <>
              Faltam registrar <strong>{esperado - count}</strong> animal(is) na cria para coincidir com o número
              informado no parto (<strong>{esperado}</strong>).
            </>
          )}
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando crias…</p>
      ) : (
        <div className="rounded-md border border-border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sexo</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead className="text-right">Peso (kg)</TableHead>
                <TableHead>Animal gerado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {crias.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground text-center py-6">
                    Nenhuma cria registrada para este parto.
                  </TableCell>
                </TableRow>
              ) : (
                crias.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{sexoLabel(c.sexo)}</TableCell>
                    <TableCell>{condicaoLabel(c.condicao)}</TableCell>
                    <TableCell className="text-right">
                      {c.peso != null && Number.isFinite(Number(c.peso))
                        ? String(c.peso).replace(".", ",")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {c.animal_id ? (
                        <Link
                          href={`/animais/${c.animal_id}`}
                          className="text-primary underline-offset-4 hover:underline text-sm"
                        >
                          Ver animal #{c.animal_id}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {faltaCadastrar ? (
        <div className="rounded-md border border-border bg-muted/20 p-3 space-y-3">
          <p className="text-sm font-medium text-foreground">Registrar próxima cria</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Sexo</Label>
              <Select
                value={draft.sexo}
                onValueChange={(value) =>
                  setDraft((d) => ({ ...d, sexo: value as CriaLinhaFormState["sexo"] }))
                }
              >
                <SelectTrigger className="text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CRIA_SEXO_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Situação</Label>
              <Select
                value={draft.condicao}
                onValueChange={(value) =>
                  setDraft((d) => ({
                    ...d,
                    condicao: value as CriaLinhaFormState["condicao"],
                    peso: value === "VIVO" ? d.peso : "",
                  }))
                }
              >
                <SelectTrigger className="text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CRIA_CONDICAO_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-parto-nova-cria-peso">Peso ao nascer (opcional)</Label>
              <Input
                id="edit-parto-nova-cria-peso"
                type="text"
                inputMode="decimal"
                placeholder="Ex.: 38,5"
                disabled={draft.condicao !== "VIVO"}
                value={draft.condicao === "VIVO" ? draft.peso : ""}
                onChange={(e) => setDraft((d) => ({ ...d, peso: e.target.value }))}
                className="text-foreground"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-parto-nova-cria-ident">Identificação (brinco, opcional)</Label>
              <Input
                id="edit-parto-nova-cria-ident"
                type="text"
                placeholder="Se vazio, o sistema gera código provisório"
                value={draft.identificacao}
                onChange={(e) => setDraft((d) => ({ ...d, identificacao: e.target.value }))}
                className="text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-parto-nova-cria-raca">Raça (opcional)</Label>
              <Input
                id="edit-parto-nova-cria-raca"
                type="text"
                placeholder={racaMae ? `Ex.: ${racaMae}` : "Raça da cria"}
                value={draft.raca}
                onChange={(e) => setDraft((d) => ({ ...d, raca: e.target.value }))}
                className="text-foreground"
              />
            </div>
          </div>
          {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}
          <Button type="button" variant="secondary" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Registrando…" : "Registrar cria"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
