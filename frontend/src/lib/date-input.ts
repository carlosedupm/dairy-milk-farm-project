import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export type DateInputErrorCode =
  | "incomplete"
  | "invalid"
  | "beforeMin"
  | "afterMax";

export type ParseDisplayOptions = {
  minYear: number;
  maxYear: number;
  minDate?: string;
  maxDate?: string;
};

export type ParseDisplayResult = {
  iso: string;
  error?: DateInputErrorCode;
};

export function digitsOnly(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 8);
}

export function formatDigitsToDisplay(digits: string): string {
  if (!digits) return "";
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function formatIsoToDisplay(isoDate?: string): string {
  if (!isoDate) return "";
  const parsed = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return "";
  return format(parsed, "dd/MM/yyyy", { locale: ptBR });
}

function formatIsoForMessage(iso: string): string {
  const parsed = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return iso;
  return format(parsed, "dd/MM/yyyy", { locale: ptBR });
}

export function parseDisplayToIso(
  displayDate: string,
  opts: ParseDisplayOptions
): ParseDisplayResult {
  const digits = digitsOnly(displayDate);
  if (!digits) {
    return { iso: "" };
  }

  if (digits.length !== 8) {
    return { iso: "", error: "incomplete" };
  }

  const day = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const year = Number(digits.slice(4, 8));

  if (year < opts.minYear || year > opts.maxYear) {
    return { iso: "", error: "invalid" };
  }

  const candidate = new Date(year, month - 1, day, 12, 0, 0);
  const isExactDate =
    candidate.getFullYear() === year &&
    candidate.getMonth() === month - 1 &&
    candidate.getDate() === day;

  if (!isExactDate) {
    return { iso: "", error: "invalid" };
  }

  const iso = format(candidate, "yyyy-MM-dd");
  if (opts.maxDate && iso > opts.maxDate) {
    return { iso: "", error: "afterMax" };
  }
  if (opts.minDate && iso < opts.minDate) {
    return { iso: "", error: "beforeMin" };
  }
  return { iso };
}

export function isValidDisplayDate(
  display: string,
  opts: ParseDisplayOptions
): boolean {
  const digits = digitsOnly(display);
  if (digits.length !== 8) return false;
  return !parseDisplayToIso(display, opts).error;
}

/** Se há exatamente 2 dígitos (dia 01–31), completa DD/MM/AAAA com mês/ano locais. */
export function tryCompleteDayWithCurrentMonthYear(
  display: string,
  opts: ParseDisplayOptions
): { display: string; iso: string } | null {
  const digits = digitsOnly(display);
  if (digits.length !== 2) return null;

  const day = Number(digits);
  if (day < 1 || day > 31) return null;

  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = String(now.getFullYear());
  const completed = `${digits.padStart(2, "0")}/${month}/${year}`;

  const parsed = parseDisplayToIso(completed, opts);
  if (parsed.error || !parsed.iso) return null;

  return { display: completed, iso: parsed.iso };
}

export function dateInputErrorMessage(
  code: DateInputErrorCode,
  opts?: { minDate?: string; maxDate?: string }
): string {
  switch (code) {
    case "incomplete":
      return "Informe a data completa (DD/MM/AAAA).";
    case "invalid":
      return "Data inválida.";
    case "beforeMin":
      return opts?.minDate
        ? `Data anterior a ${formatIsoForMessage(opts.minDate)}.`
        : "Data anterior ao limite permitido.";
    case "afterMax":
      return opts?.maxDate
        ? `Data posterior a ${formatIsoForMessage(opts.maxDate)}.`
        : "Data posterior ao limite permitido.";
  }
}
