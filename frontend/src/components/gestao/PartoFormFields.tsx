"use client";

import type { Dispatch, SetStateAction } from "react";
import { useMemo } from "react";
import { AnimalSelect } from "@/components/animais/AnimalSelect";
import { DecimalInput } from "@/components/ui/decimal-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormFieldError } from "@/components/ui/form-field-error";
import { useFormFieldError, useFormFieldErrors } from "@/contexts/FormFieldErrorsContext";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { DateTimePickerUnificado } from "@/components/ui/datetime-picker-pt-br";
import { todayISODate } from "@/lib/date-limits";
import {
  partoChronologyFromGestacoes,
  type GestaoChronologyContext,
} from "@/lib/gestao-date-limits";
import { GestaoDateMinHint } from "@/components/gestao/GestaoDateMinHint";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Gestacao } from "@/services/gestacoes";
import { useAnimaisCicloContext } from "@/components/animais/useAnimaisCicloContext";
import {
  CRIA_CONDICAO_OPTIONS,
  CRIA_SEXO_OPTIONS,
  type CriaLinhaFormState,
  defaultCriaLinha,
} from "@/components/gestao/cria-constants";

/** Valores enviados à API (backend). */
export const TIPO_PARTO_OPTIONS = [
  { value: "NORMAL", label: "Normal" },
  { value: "DISTOCICO", label: "Distócico" },
  { value: "CESARIANA", label: "Cesárea" },
] as const;

export const PARTO_SELECT_NONE = "__none__";

export type PartoFormState = {
  animalId: string;
  data: string;
  numeroCrias: string;
  /** Uma entrada por cria (comprimento alinhado a `numeroCrias` quando `includeCriasRepeater`). */
  crias: CriaLinhaFormState[];
  tipo: string;
  gestacaoId: string;
  complicacoes: string;
  observacoes: string;
};

type Props = {
  fazendaId: number;
  gestacoes: Gestacao[];
  formState: PartoFormState;
  setFormState: Dispatch<SetStateAction<PartoFormState>>;
  /** Em "editar parto", crias são tratadas em painel separado. */
  includeCriasRepeater?: boolean;
  preserveSelected?: boolean;
};

export function usePartoChronology(
  gestacoes: Gestacao[],
  gestacaoId: string,
  animalId: string
): GestaoChronologyContext {
  return useMemo(
    () => partoChronologyFromGestacoes(gestacoes, gestacaoId, animalId),
    [gestacoes, gestacaoId, animalId]
  );
}

/** @deprecated Use usePartoChronology — retorna apenas minDate. */
export function usePartoMinDate(
  gestacoes: Gestacao[],
  gestacaoId: string,
  animalId: string
): string | undefined {
  return usePartoChronology(gestacoes, gestacaoId, animalId).minDate;
}

export function PartoFormFields({
  fazendaId,
  gestacoes,
  formState,
  setFormState,
  includeCriasRepeater = true,
  preserveSelected = false,
}: Props) {
  const preserveAnimalId =
    preserveSelected && formState.animalId
      ? Number(formState.animalId)
      : undefined;

  const { animais: cicloAnimais } = useAnimaisCicloContext(fazendaId, "parto", {
    preserveAnimalId:
      preserveAnimalId && preserveAnimalId > 0 ? preserveAnimalId : undefined,
  });

  const animaisSafe = useMemo(
    () => (Array.isArray(cicloAnimais) ? cicloAnimais : []),
    [cicloAnimais],
  );
  const gestacoesSafe = useMemo(
    () => (Array.isArray(gestacoes) ? gestacoes : []),
    [gestacoes]
  );

  const identificacaoPorAnimalId = useMemo(() => {
    const m = new Map<number, string>();
    for (const a of animaisSafe) {
      m.set(a.id, a.identificacao);
    }
    return m;
  }, [animaisSafe]);

  const racaMae = useMemo(() => {
    const id = Number(formState.animalId);
    if (!id) return "";
    const a = animaisSafe.find((x) => x.id === id);
    return (a?.raca ?? "").trim();
  }, [animaisSafe, formState.animalId]);

  const animalIdError = useFormFieldError("animalId");
  const dataError = useFormFieldError("data");
  const numeroCriasError = useFormFieldError("numeroCrias");
  const allFieldErrors = useFormFieldErrors();
  const { minDate } = usePartoChronology(
    gestacoesSafe,
    formState.gestacaoId,
    formState.animalId
  );

  return (
    <>
      <AnimalSelect
        fazendaId={fazendaId}
        cicloContext="parto"
        preserveSelected={preserveSelected}
        value={formState.animalId}
        onValueChange={(value) => setFormState((s) => ({ ...s, animalId: value }))}
        label="Animal (mãe)"
        placeholder="Selecione"
        femeasOnly
        error={animalIdError}
      />
      <div className="space-y-2">
        <Label htmlFor="parto-data-hora">Data e hora do parto</Label>
        <DateTimePickerUnificado
          id="parto-data-hora"
          value={formState.data}
          maxDate={todayISODate()}
          minDate={minDate}
          onChange={(v) => setFormState((s) => ({ ...s, data: v }))}
          placeholder="Selecione data e hora"
        />
        <GestaoDateMinHint
          minDate={minDate}
          prefix="Data mínima: confirmação da gestação em"
        />
        <FormFieldError message={dataError} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="parto-num-crias">Número de animais na cria</Label>
        <Input
          id="parto-num-crias"
          type="number"
          min={1}
          value={formState.numeroCrias}
          aria-invalid={numeroCriasError ? true : undefined}
          className={cn("text-foreground", numeroCriasError && "border-destructive")}
          onChange={(e) => {
            const raw = e.target.value;
            setFormState((s) => {
              if (!includeCriasRepeater) return { ...s, numeroCrias: raw };
              const n = Math.max(1, parseInt(raw, 10) || 1);
              const crias = [...s.crias];
              while (crias.length < n) crias.push(defaultCriaLinha());
              while (crias.length > n) crias.pop();
              return { ...s, numeroCrias: raw, crias };
            });
          }}
        />
        <FormFieldError message={numeroCriasError} />
      </div>
      {includeCriasRepeater && formState.crias.length > 0 ? (
        <div className="space-y-4 border-t border-border pt-4">
          <p className="text-sm font-medium text-foreground">Dados das crias</p>
          <p className="text-xs text-muted-foreground">
            Informe sexo e situação ao nascer para cada cria. Cria viva gera bezerra/bezerro com data de
            nascimento igual à do parto, origem &quot;Nascido&quot; e identificação provisória no padrão
            FILHO-… (macho) ou FILHA-… (fêmea), identificação da mãe-data-parto-n, se você não informar o
            brinco.
          </p>
          {formState.crias.map((row, i) => {
            const pesoError = allFieldErrors[`cria_${i}_peso`];
            return (
            <div
              key={i}
              className={cn(
                "rounded-md border bg-muted/30 p-3 space-y-3",
                pesoError ? "border-destructive/40" : "border-border"
              )}
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-3">
              <div className="space-y-2 sm:col-span-1">
                <Label>Cria {i + 1} — sexo</Label>
                <Select
                  value={row.sexo}
                  onValueChange={(value) =>
                    setFormState((s) => {
                      const crias = [...s.crias];
                      crias[i] = { ...crias[i], sexo: value as CriaLinhaFormState["sexo"] };
                      return { ...s, crias };
                    })
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
              <div className="space-y-2 sm:col-span-1">
                <Label>Situação</Label>
                <Select
                  value={row.condicao}
                  onValueChange={(value) =>
                    setFormState((s) => {
                      const crias = [...s.crias];
                      const condicao = value as CriaLinhaFormState["condicao"];
                      crias[i] = {
                        ...crias[i],
                        condicao,
                        peso: condicao === "VIVO" ? crias[i].peso : "",
                      };
                      return { ...s, crias };
                    })
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
              <div className="space-y-2 sm:col-span-1">
                <Label htmlFor={`parto-cria-peso-${i}`}>Peso ao nascer (kg, opcional)</Label>
                <DecimalInput
                  id={`parto-cria-peso-${i}`}
                  placeholder="Ex.: 38,5"
                  disabled={row.condicao !== "VIVO"}
                  value={row.condicao === "VIVO" ? row.peso : ""}
                  onValueChange={(peso) =>
                    setFormState((s) => {
                      const crias = [...s.crias];
                      crias[i] = { ...crias[i], peso };
                      return { ...s, crias };
                    })
                  }
                  className={cn(
                    "text-foreground",
                    pesoError && "border-destructive"
                  )}
                  aria-invalid={pesoError ? true : undefined}
                />
                <FormFieldError message={pesoError} />
              </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3">
                <div className="space-y-2">
                  <Label htmlFor={`parto-cria-ident-${i}`}>Identificação (brinco, opcional)</Label>
                  <Input
                    id={`parto-cria-ident-${i}`}
                    type="text"
                    placeholder={
                      row.sexo === "M"
                        ? "Se vazio: FILHO-identMãe-AAAAMMDD-parto-n (editável depois em Animais)"
                        : "Se vazio: FILHA-identMãe-AAAAMMDD-parto-n (editável depois em Animais)"
                    }
                    value={row.identificacao}
                    onChange={(e) =>
                      setFormState((s) => {
                        const crias = [...s.crias];
                        crias[i] = { ...crias[i], identificacao: e.target.value };
                        return { ...s, crias };
                      })
                    }
                    className="text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`parto-cria-raca-${i}`}>Raça (opcional)</Label>
                  <Input
                    id={`parto-cria-raca-${i}`}
                    type="text"
                    placeholder={racaMae ? `Ex.: ${racaMae}` : "Raça da cria"}
                    value={row.raca}
                    onChange={(e) =>
                      setFormState((s) => {
                        const crias = [...s.crias];
                        crias[i] = { ...crias[i], raca: e.target.value };
                        return { ...s, crias };
                      })
                    }
                    className="text-foreground"
                  />
                </div>
              </div>
            </div>
            );
          })}
        </div>
      ) : null}
      <div className="space-y-2">
        <Label>Tipo de parto (opcional)</Label>
        <Select
          value={formState.tipo || PARTO_SELECT_NONE}
          onValueChange={(value) =>
            setFormState((s) => ({
              ...s,
              tipo: value === PARTO_SELECT_NONE ? "" : value,
            }))
          }
        >
          <SelectTrigger className="text-foreground">
            <SelectValue placeholder="Selecione o tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={PARTO_SELECT_NONE}>Nenhum</SelectItem>
            {TIPO_PARTO_OPTIONS.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Gestação vinculada (opcional)</Label>
        <Select
          value={formState.gestacaoId || PARTO_SELECT_NONE}
          onValueChange={(value) =>
            setFormState((s) => ({
              ...s,
              gestacaoId: value === PARTO_SELECT_NONE ? "" : value,
            }))
          }
        >
          <SelectTrigger className="text-foreground">
            <SelectValue placeholder="Selecione uma gestação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={PARTO_SELECT_NONE}>Nenhuma</SelectItem>
            {gestacoesSafe.map((g) => {
              const nomeMatriz =
                identificacaoPorAnimalId.get(g.animal_id) ?? `nº ${g.animal_id}`;
              return (
                <SelectItem key={g.id} value={String(g.id)}>
                  {`Gestação ${g.id} · ${nomeMatriz}`}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="parto-complicacoes">Complicações (opcional)</Label>
        <Textarea
          id="parto-complicacoes"
          value={formState.complicacoes}
          onChange={(e) =>
            setFormState((s) => ({ ...s, complicacoes: e.target.value }))
          }
          placeholder="Descreva complicações ocorridas no parto"
          className="text-foreground min-h-[88px]"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="parto-observacoes">Observações (opcional)</Label>
        <Textarea
          id="parto-observacoes"
          value={formState.observacoes}
          onChange={(e) =>
            setFormState((s) => ({ ...s, observacoes: e.target.value }))
          }
          placeholder="Informações adicionais"
          className="text-foreground min-h-[88px]"
        />
      </div>
    </>
  );
}
