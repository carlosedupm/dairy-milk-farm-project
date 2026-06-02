"use client";

import type { Dispatch, SetStateAction } from "react";
import { AnimalSelect } from "@/components/animais/AnimalSelect";
import { DatePickerUnificado } from "@/components/ui/date-picker";
import { FormFieldError } from "@/components/ui/form-field-error";
import { useFormFieldError } from "@/contexts/FormFieldErrorsContext";
import { todayISODate } from "@/lib/date-limits";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type LactacaoFormState = {
  animalId: string;
  numeroLactacao: string;
  dataInicio: string;
};

type Props = {
  fazendaId: number;
  formState: LactacaoFormState;
  setFormState: Dispatch<SetStateAction<LactacaoFormState>>;
  preserveSelected?: boolean;
};

export function LactacaoFormFields({
  fazendaId,
  formState,
  setFormState,
  preserveSelected = false,
}: Props) {
  const animalIdError = useFormFieldError("animalId");
  const dataInicioError = useFormFieldError("dataInicio");

  return (
    <>
      <AnimalSelect
        fazendaId={fazendaId}
        cicloContext="lactacao"
        preserveSelected={preserveSelected}
        value={formState.animalId}
        onValueChange={(value) =>
          setFormState((s) => ({ ...s, animalId: value }))
        }
        label="Animal"
        placeholder="Selecione"
        femeasOnly
        error={animalIdError}
      />
      <div className="space-y-2">
        <Label htmlFor="lactacao-numero">Número da lactação</Label>
        <Input
          id="lactacao-numero"
          type="number"
          min={1}
          value={formState.numeroLactacao}
          onChange={(e) =>
            setFormState((s) => ({ ...s, numeroLactacao: e.target.value }))
          }
          className="text-foreground"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="lactacao-data-inicio">Data de início</Label>
        <DatePickerUnificado
          id="lactacao-data-inicio"
          value={formState.dataInicio}
          onChange={(dataInicio) =>
            setFormState((s) => ({ ...s, dataInicio }))
          }
          maxDate={todayISODate()}
          placeholder="Selecione a data"
        />
        <FormFieldError message={dataInicioError} />
      </div>
    </>
  );
}

export function lactacaoFormSubmitDisabled(
  formState: LactacaoFormState
): boolean {
  return !formState.animalId || !formState.dataInicio.trim();
}
