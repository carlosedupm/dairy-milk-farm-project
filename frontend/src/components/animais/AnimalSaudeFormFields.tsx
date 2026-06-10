"use client";

import type { Dispatch, SetStateAction } from "react";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormFieldError } from "@/components/ui/form-field-error";
import { useFormFieldError } from "@/contexts/FormFieldErrorsContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { todayISODate } from "@/lib/date-limits";
import { GestaoDateMinHint } from "@/components/gestao/GestaoDateMinHint";
import { cn } from "@/lib/utils";
import {
  STATUS_CASO_SAUDE,
  STATUS_CASO_SAUDE_LABELS,
  TIPOS_CASO_SAUDE,
  TIPO_CASO_SAUDE_LABELS,
  type SaveAnimalSaudePayload,
} from "@/services/animalSaude";

export type AnimalSaudeFormState = {
  tipoCaso: string;
  dataInicio: string;
  dataFim: string;
  status: string;
  observacoes: string;
};

export function emptyAnimalSaudeFormState(): AnimalSaudeFormState {
  return {
    tipoCaso: "TRATAMENTO",
    dataInicio: todayISODate(),
    dataFim: "",
    status: "ATIVO",
    observacoes: "",
  };
}

export function animalSaudeFormSubmitDisabled(state: AnimalSaudeFormState): boolean {
  if (!state.tipoCaso.trim() || !state.dataInicio.trim() || !state.status.trim()) {
    return true;
  }
  if (state.dataFim.trim() && state.dataFim < state.dataInicio) {
    return true;
  }
  return false;
}

type Props = {
  formState: AnimalSaudeFormState;
  setFormState: Dispatch<SetStateAction<AnimalSaudeFormState>>;
  minDate?: string;
};

function effectiveMinDateForFim(dataInicio: string, animalMinDate?: string): string | undefined {
  const candidates = [dataInicio.trim(), animalMinDate].filter(Boolean) as string[];
  if (candidates.length === 0) return undefined;
  return candidates.sort().pop();
}

export function AnimalSaudeFormFields({ formState, setFormState, minDate }: Props) {
  const tipoCasoError = useFormFieldError("tipoCaso");
  const dataInicioError = useFormFieldError("dataInicio");
  const dataFimError = useFormFieldError("dataFim");
  const statusError = useFormFieldError("status");

  return (
    <>
      <div className="space-y-2">
        <Label>Tipo de caso *</Label>
        <Select
          value={formState.tipoCaso}
          onValueChange={(v) => setFormState((s) => ({ ...s, tipoCaso: v }))}
        >
          <SelectTrigger
            className={cn(
              "text-foreground",
              tipoCasoError && "border-destructive"
            )}
            aria-invalid={tipoCasoError ? true : undefined}
          >
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {TIPOS_CASO_SAUDE.map((t) => (
              <SelectItem key={t} value={t}>
                {TIPO_CASO_SAUDE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FormFieldError message={tipoCasoError} />
      </div>
      <div className="space-y-2">
        <Label>Data de início *</Label>
        <DatePicker
          value={formState.dataInicio || undefined}
          onChange={(v) => setFormState((s) => ({ ...s, dataInicio: v }))}
          minDate={minDate}
          maxDate={todayISODate()}
          placeholder="Selecione a data"
        />
        <GestaoDateMinHint
          minDate={minDate}
          prefix="Data mínima (entrada ou nascimento):"
        />
        <FormFieldError message={dataInicioError} />
      </div>
      <div className="space-y-2">
        <Label>Data de fim (opcional)</Label>
        <DatePicker
          value={formState.dataFim || undefined}
          onChange={(v) => setFormState((s) => ({ ...s, dataFim: v }))}
          minDate={effectiveMinDateForFim(formState.dataInicio, minDate)}
          placeholder="Sem data de fim"
        />
        <FormFieldError message={dataFimError} />
      </div>
      <div className="space-y-2">
        <Label>Status *</Label>
        <Select
          value={formState.status}
          onValueChange={(v) => setFormState((s) => ({ ...s, status: v }))}
        >
          <SelectTrigger
            className={cn(
              "text-foreground",
              statusError && "border-destructive"
            )}
            aria-invalid={statusError ? true : undefined}
          >
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_CASO_SAUDE.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_CASO_SAUDE_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FormFieldError message={statusError} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="obs-saude">Observações (opcional)</Label>
        <Textarea
          id="obs-saude"
          value={formState.observacoes}
          onChange={(e) =>
            setFormState((s) => ({ ...s, observacoes: e.target.value }))
          }
          placeholder="Detalhes clínicos, medicamento, veterinário…"
          rows={3}
          className="min-h-[4.5rem]"
        />
      </div>
    </>
  );
}

export function animalSaudeFormToPayload(
  state: AnimalSaudeFormState
): SaveAnimalSaudePayload {
  return {
    tipo_caso: state.tipoCaso,
    data_inicio: state.dataInicio,
    data_fim: state.dataFim.trim() ? state.dataFim : null,
    status: state.status,
    observacoes: state.observacoes.trim() || null,
  };
}
