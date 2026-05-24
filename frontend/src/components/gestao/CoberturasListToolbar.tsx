"use client";

import { AnimalSelect } from "@/components/animais/AnimalSelect";
import { COBERTURA_TIPOS } from "@/components/gestao/CoberturaFormFields";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Animal } from "@/services/animais";

const ALL_TIPOS = "__all__";

const COBERTURA_TIPO_LABELS: Record<string, string> = {
  IA: "IA",
  IATF: "IATF",
  MONTA_NATURAL: "Monta natural",
  TE: "TE",
};

export type CoberturasFilterState = {
  animalId: string;
  tipo: string;
  startDate: string;
  endDate: string;
};

export const emptyCoberturasFilterState = (): CoberturasFilterState => ({
  animalId: "",
  tipo: ALL_TIPOS,
  startDate: "",
  endDate: "",
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
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 items-end">
      <AnimalSelect
        animais={animais}
        value={values.animalId}
        onValueChange={(animalId) => onChange({ ...values, animalId })}
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
      <div className="space-y-2">
        <Label htmlFor="coberturas-filter-start">Data inicial</Label>
        <DatePicker
          id="coberturas-filter-start"
          value={values.startDate}
          onChange={(startDate) => onChange({ ...values, startDate })}
          placeholder="Selecione a data inicial"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="coberturas-filter-end">Data final</Label>
        <DatePicker
          id="coberturas-filter-end"
          value={values.endDate}
          onChange={(endDate) => onChange({ ...values, endDate })}
          placeholder="Selecione a data final"
        />
      </div>
      {hasActiveFilters ? (
        <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-4">
          <Button
            type="button"
            variant="outline"
            className="min-h-[44px]"
            onClick={onClear}
          >
            Limpar filtros
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function hasActiveCoberturaFilterState(
  state: CoberturasFilterState,
): boolean {
  return (
    state.animalId !== "" ||
    state.tipo !== ALL_TIPOS ||
    state.startDate !== "" ||
    state.endDate !== ""
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
  const dateFilterActive = Boolean(state.startDate && state.endDate);
  return {
    animalId: state.animalId ? Number(state.animalId) : undefined,
    tipo: state.tipo !== ALL_TIPOS ? state.tipo : undefined,
    startDate: dateFilterActive ? state.startDate : undefined,
    endDate: dateFilterActive ? state.endDate : undefined,
  };
}
