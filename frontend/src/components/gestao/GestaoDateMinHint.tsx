"use client";

import { formatDatePtBr } from "@/lib/format";

type Props = {
  minDate?: string;
  /** Texto antes da data formatada, ex.: "Data mínima: 15 dias após a cobertura de" */
  prefix: string;
};

export function GestaoDateMinHint({ minDate, prefix }: Props) {
  if (!minDate) return null;
  return (
    <p className="text-sm text-muted-foreground">
      {prefix} {formatDatePtBr(minDate)}.
    </p>
  );
}
