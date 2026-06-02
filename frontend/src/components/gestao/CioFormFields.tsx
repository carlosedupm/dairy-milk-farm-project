"use client";

import type { Dispatch, SetStateAction } from "react";
import { AnimalSelect } from "@/components/animais/AnimalSelect";
import { Label } from "@/components/ui/label";
import { FormFieldError } from "@/components/ui/form-field-error";
import { useFormFieldError } from "@/contexts/FormFieldErrorsContext";
import { DateTimePickerUnificado } from "@/components/ui/datetime-picker-pt-br";
import { todayISODate } from "@/lib/date-limits";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Animal } from "@/services/animais";

export const CIO_METODOS = ["VISUAL", "PEDOMETRO", "RUFIAO", "OUTRO"] as const;
export const CIO_INTENSIDADES = ["FRACO", "MODERADO", "FORTE"] as const;
const CIO_SELECT_NONE = "__none__";

export type CioFormState = {
  animalId: string;
  dataDetectado: string;
  metodo: string;
  intensidade: string;
};

type Props = {
  animais: Animal[];
  formState: CioFormState;
  setFormState: Dispatch<SetStateAction<CioFormState>>;
};

export function CioFormFields({ animais, formState, setFormState }: Props) {
  const animalIdError = useFormFieldError("animalId");
  const dataError = useFormFieldError("dataDetectado");

  return (
    <>
      <AnimalSelect
        animais={animais}
        value={formState.animalId}
        onValueChange={(v) => setFormState((s) => ({ ...s, animalId: v }))}
        label="Animal"
        placeholder="Selecione"
        femeasOnly
        error={animalIdError}
      />
      <div className="space-y-2">
        <Label htmlFor="cio-data-detectado">Data e hora detectado</Label>
        <DateTimePickerUnificado
          id="cio-data-detectado"
          value={formState.dataDetectado}
          maxDate={todayISODate()}
          onChange={(v) => setFormState((s) => ({ ...s, dataDetectado: v }))}
          placeholder="Selecione data e hora"
        />
        <FormFieldError message={dataError} />
      </div>
      <div className="space-y-2">
        <Label>Método (opcional)</Label>
        <Select
          value={formState.metodo || CIO_SELECT_NONE}
          onValueChange={(v) =>
            setFormState((s) => ({
              ...s,
              metodo: v === CIO_SELECT_NONE ? "" : v,
            }))
          }
        >
          <SelectTrigger className="text-foreground">
            <SelectValue placeholder="Selecione o método" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={CIO_SELECT_NONE}>Nenhum</SelectItem>
            {CIO_METODOS.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Intensidade (opcional)</Label>
        <Select
          value={formState.intensidade || CIO_SELECT_NONE}
          onValueChange={(v) =>
            setFormState((s) => ({
              ...s,
              intensidade: v === CIO_SELECT_NONE ? "" : v,
            }))
          }
        >
          <SelectTrigger className="text-foreground">
            <SelectValue placeholder="Selecione a intensidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={CIO_SELECT_NONE}>Nenhuma</SelectItem>
            {CIO_INTENSIDADES.map((i) => (
              <SelectItem key={i} value={i}>
                {i}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}

export function cioFormSubmitDisabled(formState: CioFormState): boolean {
  return !formState.animalId || !formState.dataDetectado;
}
