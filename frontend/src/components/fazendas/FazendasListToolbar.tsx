"use client";

import { ResponsiveFiltersShell } from "@/components/layout/ResponsiveFiltersShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FazendasFilterState } from "@/lib/fazendas-filter";

type Props = {
  values: FazendasFilterState;
  onChange: (next: FazendasFilterState) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
};

export function FazendasListToolbar({
  values,
  onChange,
  onClear,
  hasActiveFilters,
}: Props) {
  const activeCount = values.q.trim() ? 1 : 0;

  return (
    <ResponsiveFiltersShell
      hasActiveFilters={hasActiveFilters}
      onClear={onClear}
      activeCount={activeCount}
      title="Filtros de fazendas"
      description="Busque pelo nome da fazenda."
    >
      <div className="max-w-md space-y-2">
        <Label htmlFor="fazendas-filter-q">Nome da fazenda</Label>
        <Input
          id="fazendas-filter-q"
          className="min-h-[44px]"
          value={values.q}
          onChange={(e) => onChange({ q: e.target.value })}
          placeholder="Buscar por nome…"
          autoComplete="off"
        />
      </div>
    </ResponsiveFiltersShell>
  );
}
