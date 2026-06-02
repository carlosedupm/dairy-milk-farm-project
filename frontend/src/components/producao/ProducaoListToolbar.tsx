"use client";

import { PeriodFilter } from "@/components/filters/PeriodFilter";
import { Label } from "@/components/ui/label";
import {
  getDefaultServerListPeriod,
  isDefaultServerListPeriod,
} from "@/lib/period-filter";
import { ResponsiveFiltersShell } from "@/components/layout/ResponsiveFiltersShell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatLactacaoFilterLabel } from "@/components/animais/producaoPorLactacaoUtils";
import type { Lactacao } from "@/services/lactacoes";
import type { Animal } from "@/services/animais";

const LACTACAO_ALL = "all";

export type ProducaoFilterState = {
  start: string;
  end: string;
  lactacao_id: string;
};

export const emptyProducaoFilterState = (): ProducaoFilterState => ({
  start: "",
  end: "",
  lactacao_id: LACTACAO_ALL,
});

/** Estado inicial de produção (período = últimos 30 dias). */
export const defaultProducaoFilterState = (): ProducaoFilterState => {
  const { start, end } = getDefaultServerListPeriod();
  return {
    start,
    end,
    lactacao_id: LACTACAO_ALL,
  };
};

export function countActiveProducaoFilters(state: ProducaoFilterState): number {
  let count = 0;
  if (
    (state.start || state.end) &&
    !isDefaultServerListPeriod(state.start, state.end)
  ) {
    count += 1;
  }
  if (state.lactacao_id !== LACTACAO_ALL) count += 1;
  return count;
}

export function hasActiveProducaoFilters(state: ProducaoFilterState): boolean {
  return countActiveProducaoFilters(state) > 0;
}

type Props = {
  values: ProducaoFilterState;
  lactacoes: Lactacao[];
  animaisById: Map<number, Animal>;
  onChange: (next: ProducaoFilterState) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
};

export function ProducaoListToolbar({
  values,
  lactacoes,
  animaisById,
  onChange,
  onClear,
  hasActiveFilters,
}: Props) {
  const activeCount = countActiveProducaoFilters(values);

  const form = (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
      <div className="space-y-2">
        <Label htmlFor="producao-filter-lactacao">Lactação</Label>
        <Select
          value={values.lactacao_id}
          onValueChange={(lactacao_id) => onChange({ ...values, lactacao_id })}
        >
          <SelectTrigger id="producao-filter-lactacao">
            <SelectValue placeholder="Todas as lactações" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={LACTACAO_ALL}>Todas as lactações</SelectItem>
            {lactacoes.map((l) => {
              const animal = animaisById.get(l.animal_id);
              const animalLabel =
                animal?.identificacao ?? `Animal #${l.animal_id}`;
              return (
                <SelectItem key={l.id} value={String(l.id)}>
                  {formatLactacaoFilterLabel(l, animalLabel)}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
      <PeriodFilter
        idPrefix="producao-filter"
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
      title="Filtros de produção"
      description="Lactação e período de registos."
    >
      {form}
    </ResponsiveFiltersShell>
  );
}

export { LACTACAO_ALL as PRODUCAO_LACTACAO_ALL };
