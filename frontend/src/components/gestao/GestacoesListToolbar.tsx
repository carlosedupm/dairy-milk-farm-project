"use client";

import { AnimalSelect } from "@/components/animais/AnimalSelect";
import { ResponsiveFiltersShell } from "@/components/layout/ResponsiveFiltersShell";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { Animal } from "@/services/animais";
import {
  countActiveGestacoesFilters,
  GESTACAO_STATUS_ALL,
  GESTACAO_STATUS_LABELS,
  GESTACAO_STATUS_OPTIONS,
  type GestacoesFilterState,
} from "@/lib/gestacoes-list-filter";

type Props = {
  animais: Animal[];
  values: GestacoesFilterState;
  onChange: (next: GestacoesFilterState) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
};

export function GestacoesListToolbar({
  animais,
  values,
  onChange,
  onClear,
  hasActiveFilters,
}: Props) {
  const activeCount = countActiveGestacoesFilters(values);

  const form = (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 items-end">
      <AnimalSelect
        animais={animais}
        value={values.animal_id}
        onValueChange={(animal_id) => onChange({ ...values, animal_id })}
        label="Animal"
        placeholder="Todos os animais"
        femeasOnly
      />
      <div className="space-y-2">
        <Label htmlFor="gestacoes-filter-status">Status</Label>
        <Select
          value={values.status}
          onValueChange={(status) => onChange({ ...values, status })}
        >
          <SelectTrigger id="gestacoes-filter-status">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={GESTACAO_STATUS_ALL}>Todos os status</SelectItem>
            {GESTACAO_STATUS_OPTIONS.map((status) => (
              <SelectItem key={status} value={status}>
                {GESTACAO_STATUS_LABELS[status] ?? status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex min-h-[44px] items-end sm:col-span-2 lg:col-span-1">
        <Button
          type="button"
          variant={values.partos_dias === "7" ? "default" : "outline"}
          className="min-h-[44px] w-full"
          onClick={() =>
            onChange({
              ...values,
              partos_dias: values.partos_dias === "7" ? "" : "7",
            })
          }
        >
          Partos previstos em 7 dias
        </Button>
      </div>
      <div className="space-y-2">
        <Label htmlFor="gestacoes-filter-start">Parto previsto — de</Label>
        <DatePicker
          id="gestacoes-filter-start"
          value={values.start}
          onChange={(start) => onChange({ ...values, start })}
          placeholder="Data inicial"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="gestacoes-filter-end">Parto previsto — até</Label>
        <DatePicker
          id="gestacoes-filter-end"
          value={values.end}
          onChange={(end) => onChange({ ...values, end })}
          placeholder="Data final"
        />
      </div>
    </div>
  );

  return (
    <ResponsiveFiltersShell
      hasActiveFilters={hasActiveFilters}
      onClear={onClear}
      activeCount={activeCount}
      title="Filtros de gestações"
      description="Animal, status, janela de parto previsto ou partos nos próximos 7 dias."
    >
      {form}
    </ResponsiveFiltersShell>
  );
}
