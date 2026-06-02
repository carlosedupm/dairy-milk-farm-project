"use client";

import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { ResponsiveFiltersShell } from "@/components/layout/ResponsiveFiltersShell";

type Props = {
  dataFiltro: string;
  onDataFiltroChange: (value: string) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
};

export function ToquesListToolbar({
  dataFiltro,
  onDataFiltroChange,
  onClear,
  hasActiveFilters,
}: Props) {
  const form = (
    <div className="max-w-xs space-y-2">
      <Label htmlFor="filtro-data-toques">Dia da palpação</Label>
      <DatePicker
        id="filtro-data-toques"
        value={dataFiltro}
        onChange={onDataFiltroChange}
        placeholder="Selecione o dia"
      />
    </div>
  );

  return (
    <ResponsiveFiltersShell
      hasActiveFilters={hasActiveFilters}
      onClear={onClear}
      activeCount={hasActiveFilters ? 1 : 0}
      title="Filtros de toques"
      description="Filtrar diagnósticos pelo dia da palpação."
    >
      {form}
    </ResponsiveFiltersShell>
  );
}
