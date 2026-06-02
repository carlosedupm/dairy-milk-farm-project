"use client";

import { ResponsiveFiltersShell } from "@/components/layout/ResponsiveFiltersShell";
import { GestaoPeriodAnimalFilterFields } from "@/components/gestao/GestaoPeriodAnimalFilterFields";
import {
  countActiveGestaoPeriodFilters,
  type GestaoPeriodFilterState,
} from "@/lib/gestao-period-filter";
import type { Animal } from "@/services/animais";

type Props = {
  animais: Animal[];
  values: GestaoPeriodFilterState;
  onChange: (next: GestaoPeriodFilterState) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
  idPrefix: string;
  title?: string;
  description?: string;
  femeasOnly?: boolean;
};

export function GestaoPeriodListToolbar({
  animais,
  values,
  onChange,
  onClear,
  hasActiveFilters,
  idPrefix,
  title = "Filtros",
  description = "Animal e período. A lista atualiza automaticamente.",
  femeasOnly = true,
}: Props) {
  const activeCount = countActiveGestaoPeriodFilters(values);

  return (
    <ResponsiveFiltersShell
      hasActiveFilters={hasActiveFilters}
      onClear={onClear}
      activeCount={activeCount}
      title={title}
      description={description}
    >
      <GestaoPeriodAnimalFilterFields
        animais={animais}
        values={values}
        onChange={onChange}
        idPrefix={idPrefix}
        femeasOnly={femeasOnly}
      />
    </ResponsiveFiltersShell>
  );
}

/** Alias por domínio — mantém referências explícitas nos imports das páginas. */
export function CiosListToolbar(props: Omit<Props, "idPrefix">) {
  return <GestaoPeriodListToolbar {...props} idPrefix="cios-filter" />;
}

export function PartosListToolbar(props: Omit<Props, "idPrefix">) {
  return <GestaoPeriodListToolbar {...props} idPrefix="partos-filter" />;
}

export function SecagensListToolbar(props: Omit<Props, "idPrefix">) {
  return <GestaoPeriodListToolbar {...props} idPrefix="secagens-filter" />;
}

export function LactacoesListToolbar(props: Omit<Props, "idPrefix">) {
  return <GestaoPeriodListToolbar {...props} idPrefix="lactacoes-filter" />;
}
