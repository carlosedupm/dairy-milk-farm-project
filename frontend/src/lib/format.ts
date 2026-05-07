const EMPTY = "—";

function parseDateSafe(value: string): Date {
  const trimmed = value.trim();

  // Evita deslocamento de fuso em datas "date-only" (YYYY-MM-DD)
  // e também quando a API envia datetime mas o campo é semanticamente DATE
  // (ex.: 2022-01-01T00:00:00Z). Nesse caso usamos apenas a parte da data.
  const dateOnly = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/);
  if (dateOnly) {
    const year = Number(dateOnly[1]);
    const month = Number(dateOnly[2]);
    const day = Number(dateOnly[3]);
    return new Date(year, month - 1, day, 12, 0, 0);
  }

  return new Date(trimmed);
}

/** Data curta pt-BR; vazio ou null → "—". */
export function formatDatePtBr(value?: string | null): string {
  if (value == null || value === "") return EMPTY;
  const parsed = parseDateSafe(value);
  if (Number.isNaN(parsed.getTime())) return EMPTY;
  return parsed.toLocaleDateString("pt-BR");
}

/**
 * Data e hora pt-BR no fuso local (ex.: parto, produção).
 * Strings só com dia civil (`YYYY-MM-DD`, sem hora) seguem `parseDateSafe` para não virar véspera por UTC midnight.
 */
export function formatDateTimePtBr(dateTime: string): string {
  const trimmed = dateTime.trim();
  if (!trimmed) return EMPTY;
  const hasExplicitTime = /^\d{4}-\d{2}-\d{2}[T\s]\d/.test(trimmed);
  const parsed = hasExplicitTime ? new Date(trimmed) : parseDateSafe(trimmed);
  if (Number.isNaN(parsed.getTime())) return EMPTY;
  return parsed.toLocaleString("pt-BR", {
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

/**
 * Instante da API (RFC3339 / ISO com Z ou offset) → valor para `<input type="datetime-local">`
 * no fuso local do navegador (`YYYY-MM-DDTHH:mm`). Evita usar `.slice(0, 16)` na string ISO,
 * que trata dígitos UTC como se fossem horário local.
 */
export function toDatetimeLocalInputValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Agora no fuso local, para valor inicial de `datetime-local`. */
export function nowDatetimeLocalInputValue(): string {
  return toDatetimeLocalInputValue(new Date().toISOString());
}
