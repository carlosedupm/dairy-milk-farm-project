"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { create as createCria, listByParto } from "@/services/crias";
import { Button } from "@/components/ui/button";
import { DecimalInput } from "@/components/ui/decimal-input";
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
  CRIA_STATUS_SAUDE_INICIAL_OPTIONS,
  criaSaudeInicialPayload,
  defaultCriaLinha,
  type CriaLinhaFormState,
} from "@/components/gestao/cria-constants";
import { AnimalGestaoLabel } from "@/components/gestao/AnimalGestaoLabel";
import { GestaoRegistroBaixadoAlert } from "@/components/gestao/GestaoRegistroBaixadoAlert";
import {
  isGestaoRegistroAnimalBaixado,
} from "@/components/gestao/gestaoRebanhoUtils";
import {
  animaisFazendaQueryKey,
  useGestaoAnimaisByIdMap,
} from "@/components/gestao/useAnimaisMap";
import { getApiErrorMessage, parsePrefixedConformidadeMessage } from "@/lib/errors";
import { FormValidationAlert } from "@/components/ui/form-validation-alert";
import { cn } from "@/lib/utils";
import { getCategoriaLabel, type Animal } from "@/services/animais";
import type { Cria } from "@/services/crias";

type Props = {
  partoId: number;
  fazendaId: number;
  numeroCriasText: string;
  /** ID da matriz do parto — para bloquear novo cadastro de cria se baixada. */
  matrizAnimalId: number;
  /** Raça da vaca selecionada no formulário (placeholder na raça da cria). */
  racaMae?: string;
};

function sexoLabel(v: string): string {
  return CRIA_SEXO_OPTIONS.find((o) => o.value === v)?.label ?? v;
}

function condicaoLabel(v: string): string {
  return CRIA_CONDICAO_OPTIONS.find((o) => o.value === v)?.label ?? v;
}

function renderColunaCadastro(cria: Cria, animaisById: Map<number, Animal>) {
  if (cria.condicao === "NATIMORTO") {
    return <span className="text-muted-foreground text-sm">Natimorto (sem cadastro)</span>;
  }
  if (!cria.animal_id) {
    return <span className="text-muted-foreground text-sm">Cadastro pendente</span>;
  }
  const animal = animaisById.get(cria.animal_id);
  const categoria = animal ? getCategoriaLabel(animal.categoria) : null;
  const raca = (animal?.raca ?? "").trim();
  const meta =
    animal && (categoria !== "—" || raca)
      ? [categoria !== "—" ? categoria : null, raca || null]
          .filter(Boolean)
          .join(" · ")
      : null;
  return (
    <Link
      href={`/animais/${cria.animal_id}`}
      className="text-primary underline-offset-4 hover:underline text-sm font-medium inline-flex flex-col gap-0.5 min-w-0"
    >
      <AnimalGestaoLabel
        animalId={cria.animal_id}
        animaisById={animaisById}
      />
      {meta ? (
        <span className="text-muted-foreground font-normal text-xs">
          {meta}
        </span>
      ) : null}
    </Link>
  );
}

export function PartoEditCriasPanel({
  partoId,
  fazendaId,
  numeroCriasText,
  matrizAnimalId,
  racaMae,
}: Props) {
  const queryClient = useQueryClient();
  const esperado = Math.max(1, parseInt(numeroCriasText, 10) || 1);
  const [draft, setDraft] = useState<CriaLinhaFormState>(() => defaultCriaLinha());
  const [localError, setLocalError] = useState<string | null>(null);

  const {
    data: crias = [],
    isLoading,
    isError,
    error: loadError,
  } = useQuery({
    queryKey: ["crias", partoId],
    queryFn: () => listByParto(partoId),
  });

  const animalIds = useMemo(() => {
    const ids = [matrizAnimalId];
    for (const c of crias) {
      if (c.animal_id) ids.push(c.animal_id);
    }
    return ids;
  }, [matrizAnimalId, crias]);

  const { animaisById } = useGestaoAnimaisByIdMap(fazendaId, animalIds);
  const matrizBaixada = isGestaoRegistroAnimalBaixado(matrizAnimalId, animaisById);

  const loadErrorMessage = isError
    ? getApiErrorMessage(loadError, "Não foi possível carregar as crias deste parto.")
    : null;

  const count = crias.length;
  const faltaCadastrar = !isError && !isLoading && count < esperado;
  const maisQueInformado = !isError && !isLoading && count > esperado;
  const showCountBanner = !isError && !isLoading && (count !== esperado || maisQueInformado);

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
        ...criaSaudeInicialPayload(draft),
      });
    },
    onMutate: () => setLocalError(null),
    onSuccess: () => {
      setDraft(defaultCriaLinha());
      queryClient.invalidateQueries({ queryKey: ["crias", partoId] });
      queryClient.invalidateQueries({
        queryKey: animaisFazendaQueryKey(fazendaId, "operacional"),
      });
      queryClient.invalidateQueries({
        queryKey: animaisFazendaQueryKey(fazendaId, "todos"),
      });
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
        <h3 className="text-sm font-medium text-foreground">Bezerras e bezerros deste parto</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Confira sexo, situação ao nascer e o cadastro na fazenda (brinco e categoria). Se o parto foi registrado
          sem todas as crias, use o formulário abaixo para completar.
        </p>
      </div>

      {loadErrorMessage ? (
        <FormValidationAlert
          title="Não foi possível carregar"
          {...parsePrefixedConformidadeMessage(loadErrorMessage)}
        />
      ) : null}

      {showCountBanner && (
        <div
          className={cn(
            "rounded-md border px-3 py-2 text-sm",
            maisQueInformado
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : "border-feedback-warning/50 bg-feedback-warning/10 text-feedback-warning-foreground"
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
      ) : isError ? null : (
        <div className="rounded-md border border-border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sexo</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead className="text-right">Peso (kg)</TableHead>
                <TableHead>Cadastro na fazenda</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {crias.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground text-center py-6">
                    Nenhuma bezerra ou bezerro registrado neste parto.
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
                    <TableCell>{renderColunaCadastro(c, animaisById)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {matrizBaixada ? (
        <GestaoRegistroBaixadoAlert
          animalId={matrizAnimalId}
          animaisById={animaisById}
        />
      ) : null}

      {faltaCadastrar && !matrizBaixada ? (
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
                    naoSaudavel: value === "VIVO" ? d.naoSaudavel : false,
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
              <DecimalInput
                id="edit-parto-nova-cria-peso"
                placeholder="Ex.: 38,5"
                disabled={draft.condicao !== "VIVO"}
                value={draft.condicao === "VIVO" ? draft.peso : ""}
                onValueChange={(peso) => setDraft((d) => ({ ...d, peso }))}
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
          {draft.condicao === "VIVO" ? (
            <div className="space-y-3 rounded-md border border-border/60 bg-background/50 p-3">
              <label className="flex items-start gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-input"
                  checked={draft.naoSaudavel}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, naoSaudavel: e.target.checked }))
                  }
                />
                <span>Cria nasceu não saudável</span>
              </label>
              {draft.naoSaudavel ? (
                <div className="space-y-2 max-w-xs">
                  <Label htmlFor="edit-parto-nova-cria-saude">Status inicial</Label>
                  <Select
                    value={draft.statusSaudeInicial}
                    onValueChange={(value) =>
                      setDraft((d) => ({
                        ...d,
                        statusSaudeInicial:
                          value as CriaLinhaFormState["statusSaudeInicial"],
                      }))
                    }
                  >
                    <SelectTrigger
                      id="edit-parto-nova-cria-saude"
                      className="text-foreground"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CRIA_STATUS_SAUDE_INICIAL_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>
          ) : null}
          {submitError ? (
            <FormValidationAlert
              {...parsePrefixedConformidadeMessage(submitError)}
            />
          ) : null}
          <Button type="button" variant="secondary" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Registrando…" : "Registrar cria"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
