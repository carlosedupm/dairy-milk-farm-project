const EMPTY = "—";

/** Data curta pt-BR; vazio ou null → "—". */
export function formatDatePtBr(value?: string | null): string {
  if (value == null || value === "") return EMPTY;
  return new Date(value).toLocaleDateString("pt-BR");
}

/** Data e hora pt-BR (ex.: registros de produção). */
export function formatDateTimePtBr(dateTime: string): string {
  return new Date(dateTime).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Data e hora pt-BR; vazio ou null → "—" (tabelas de gestão: cio, parto, etc.). */
export function formatDateTimePtBrOptional(value?: string | null): string {
  if (value == null || value === "") return EMPTY;
  return formatDateTimePtBr(value);
}
