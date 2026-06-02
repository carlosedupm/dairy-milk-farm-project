"use client";

import { AnimalSelect } from "@/components/animais/AnimalSelect";
import { ResponsiveFiltersShell } from "@/components/layout/ResponsiveFiltersShell";
import { COBERTURA_TIPOS } from "@/components/gestao/CoberturaFormFields";
import { PeriodFilter } from "@/components/filters/PeriodFilter";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Animal } from "@/services/animais";
import { countActiveCoberturaUrlFilters } from "@/lib/coberturas-filter";

const ALL_TIPOS = "__all__";

const COBERTURA_TIPO_LABELS: Record<string, string> = {
  IA: "IA",
  IATF: "IATF",
  MONTA_NATURAL: "Monta natural",
  TE: "TE",
};

export type CoberturasFilterState = {
  animal_id: string;
  tipo: string;
  start: string;
  end: string;
};

export const emptyCoberturasFilterState = (): CoberturasFilterState => ({
  animal_id: "",
  tipo: ALL_TIPOS,
  start: "",
  end: "",
});

type Props = {
  animais: Animal[];
  values: CoberturasFilterState;
  onChange: (next: CoberturasFilterState) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
};

export function CoberturasListToolbar({
  animais,
  values,
  onChange,
  onClear,
  hasActiveFilters,
}: Props) {
  const activeCount = countActiveCoberturaUrlFilters(values);

  const form = (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 items-end">
      <AnimalSelect
        animais={animais}
        value={values.animal_id}
        onValueChange={(animal_id) => onChange({ ...values, animal_id })}
        label="Animal"
        placeholder="Todos os animais"
        femeasOnly
      />
      <div className="space-y-2">
        <Label htmlFor="coberturas-filter-tipo">Tipo</Label>
        <Select
          value={values.tipo}
          onValueChange={(tipo) => onChange({ ...values, tipo })}
        >
          <SelectTrigger id="coberturas-filter-tipo" className="text-foreground">
            <SelectValue placeholder="Todos os tipos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_TIPOS}>Todos os tipos</SelectItem>
            {COBERTURA_TIPOS.map((tipo) => (
              <SelectItem key={tipo} value={tipo}>
                {COBERTURA_TIPO_LABELS[tipo] ?? tipo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <PeriodFilter
        idPrefix="coberturas-filter"
        start={values.start}
        end={values.end}
        onChange={({ start, end }) => onChange({ ...values, start, end })}
        className="sm:col-span-2"
      />
    </div>
  );

  return (
    <ResponsiveFiltersShell
      hasActiveFilters={hasActiveFilters}
      onClear={onClear}
      activeCount={activeCount}
      title="Filtros de coberturas"
      description="Animal, tipo e período. A lista atualiza automaticamente."
    >
      {form}
    </ResponsiveFiltersShell>
  );
}

export function hasActiveCoberturaFilterState(
  state: CoberturasFilterState,
): boolean {
  return (
    state.animal_id !== "" ||
    state.tipo !== ALL_TIPOS ||
    state.start !== "" ||
    state.end !== ""
  );
}

export function coberturasFilterStateToParams(
  state: CoberturasFilterState,
): {
  animalId?: number;
  tipo?: string;
  startDate?: string;
  endDate?: string;
} {
  const dateFilterActive = Boolean(state.start && state.end);
  return {
    animalId: state.animal_id ? Number(state.animal_id) : undefined,
    tipo: state.tipo !== ALL_TIPOS ? state.tipo : undefined,
    startDate: dateFilterActive ? state.start : undefined,
    endDate: dateFilterActive ? state.end : undefined,
  };
}
