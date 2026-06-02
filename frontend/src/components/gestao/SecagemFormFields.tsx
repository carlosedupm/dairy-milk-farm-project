"use client";

import { useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimalSelect } from "@/components/animais/AnimalSelect";
import { GestaoDateMinHint } from "@/components/gestao/GestaoDateMinHint";
import { DatePicker } from "@/components/ui/date-picker";
import { FormFieldError } from "@/components/ui/form-field-error";
import { useFormFieldError } from "@/contexts/FormFieldErrorsContext";
import { Label } from "@/components/ui/label";
import { isoDateFromDatetime } from "@/lib/gestao-date-limits";
import { todayISODate } from "@/lib/date-limits";
import { getContexto } from "@/services/animais";

export type SecagemFormState = {
  animalId: string;
  data: string;
};

type Props = {
  fazendaId: number;
  formState: SecagemFormState;
  setFormState: Dispatch<SetStateAction<SecagemFormState>>;
  preserveSelected?: boolean;
};

export function useSecagemMinDate(animalId: string): string | undefined {
  const animalIdNum = Number(animalId);
  const { data: contexto } = useQuery({
    queryKey: ["animais", animalIdNum, "contexto"],
    queryFn: () => getContexto(animalIdNum),
    enabled: animalIdNum > 0,
  });
  if (!contexto?.lactacao_ativa?.data_inicio) return undefined;
  return isoDateFromDatetime(contexto.lactacao_ativa.data_inicio) || undefined;
}

export function SecagemFormFields({
  fazendaId,
  formState,
  setFormState,
  preserveSelected = false,
}: Props) {
  const animalIdError = useFormFieldError("animalId");
  const dataError = useFormFieldError("data");
  const minDate = useSecagemMinDate(formState.animalId);

  useEffect(() => {
    if (!minDate || !formState.data) return;
    if (formState.data < minDate) {
      setFormState((s) => ({ ...s, data: minDate }));
    }
  }, [minDate, formState.animalId, formState.data, setFormState]);

  return (
    <>
      <AnimalSelect
        fazendaId={fazendaId}
        cicloContext="secagem"
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
        <Label htmlFor="secagem-data">Data da secagem</Label>
        <DatePicker
          id="secagem-data"
          value={formState.data}
          onChange={(data) => setFormState((s) => ({ ...s, data }))}
          maxDate={todayISODate()}
          minDate={minDate}
          placeholder="Selecione a data"
        />
        <GestaoDateMinHint
          minDate={minDate}
          prefix="Data mínima: início da lactação em"
        />
        <FormFieldError message={dataError} />
      </div>
    </>
  );
}

export function secagemFormSubmitDisabled(formState: SecagemFormState): boolean {
  return !formState.animalId || !formState.data.trim();
}
