"use client";

import { AnimalSelect } from "@/components/animais/AnimalSelect";
import { PeriodFilter } from "@/components/filters/PeriodFilter";
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
      <PeriodFilter
        idPrefix={idPrefix}
        start={values.start}
        end={values.end}
        onChange={({ start, end }) => onChange({ ...values, start, end })}
        className="sm:col-span-2 lg:col-span-2"
      />
    </div>
  );
}
