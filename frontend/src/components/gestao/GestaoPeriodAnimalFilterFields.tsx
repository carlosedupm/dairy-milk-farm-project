"use client";

import { AnimalSelect } from "@/components/animais/AnimalSelect";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import type { Animal } from "@/services/animais";
import type { GestaoPeriodFilterState } from "@/lib/gestao-period-filter";

type Props = {
  animais: Animal[];
  values: GestaoPeriodFilterState;
  onChange: (next: GestaoPeriodFilterState) => void;
  idPrefix: string;
  femeasOnly?: boolean;
};

export function GestaoPeriodAnimalFilterFields({
  animais,
  values,
  onChange,
  idPrefix,
  femeasOnly = true,
}: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 items-end">
      <AnimalSelect
        animais={animais}
        value={values.animal_id}
        onValueChange={(animal_id) => onChange({ ...values, animal_id })}
        label="Animal"
        placeholder="Todos os animais"
        femeasOnly={femeasOnly}
      />
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-start`}>Data inicial</Label>
        <DatePicker
          id={`${idPrefix}-start`}
          value={values.start}
          onChange={(start) => onChange({ ...values, start })}
          placeholder="Selecione a data inicial"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-end`}>Data final</Label>
        <DatePicker
          id={`${idPrefix}-end`}
          value={values.end}
          onChange={(end) => onChange({ ...values, end })}
          placeholder="Selecione a data final"
        />
      </div>
    </div>
  );
}
