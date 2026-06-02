import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { nowDatetimeLocalMax, todayISODate } from "@/lib/date-limits";

export type DatetimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

export type DatetimeInputErrorCode =
  | "incomplete"
  | "invalid"
  | "beforeMin"
  | "afterMax";

export type ValidateDatetimeOptions = {
  minDate?: string;
  maxDate?: string;
  maxDateTime?: string;
};

export type ValidateDatetimeResult = {
  valid: boolean;
  error?: DatetimeInputErrorCode;
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toDayIso(parts: Pick<DatetimeParts, "year" | "month" | "day">): string {
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

/** String no formato local usado nos formulários (`YYYY-MM-DDTHH:mm`). */
export function composeLocalDatetimeString(parts: DatetimeParts): string {
  return `${toDayIso(parts)}T${pad2(parts.hour)}:${pad2(parts.minute)}`;
}

export function parseValueToDatetimeParts(value: string): DatetimeParts | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return null;
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
    hour: d.getHours(),
    minute: d.getMinutes(),
  };
}

export function getEffectiveMaxDateTime(opts: {
  maxDateTime?: string;
  maxDate?: string;
}): string | undefined {
  if (opts.maxDateTime) return opts.maxDateTime;
  if (opts.maxDate === todayISODate()) return nowDatetimeLocalMax();
  return undefined;
}

export function clampDatetimeToMax(value: string, cap?: string): string {
  if (!cap || !value.trim()) return value;
  return value > cap ? cap : value;
}

export function getAvailableHours(
  parts: DatetimeParts,
  cap?: string
): number[] {
  if (!cap) return HOURS;
  const capParts = parseValueToDatetimeParts(cap);
  if (!capParts) return HOURS;

  const dayIso = toDayIso(parts);
  const capDayIso = toDayIso(capParts);
  if (dayIso < capDayIso) return HOURS;
  if (dayIso > capDayIso) return [];
  return HOURS.filter((h) => h <= capParts.hour);
}

export function getAvailableMinutes(
  parts: DatetimeParts,
  hour: number,
  cap?: string
): number[] {
  if (!cap) return MINUTES;
  const capParts = parseValueToDatetimeParts(cap);
  if (!capParts) return MINUTES;

  const dayIso = toDayIso(parts);
  const capDayIso = toDayIso(capParts);
  if (dayIso < capDayIso) return MINUTES;
  if (dayIso > capDayIso) return [];
  if (hour < capParts.hour) return MINUTES;
  if (hour > capParts.hour) return [];
  return MINUTES.filter((m) => m <= capParts.minute);
}

export function validateDatetime(
  value: string,
  opts: ValidateDatetimeOptions
): ValidateDatetimeResult {
  const trimmed = value.trim();
  if (!trimmed) {
    return { valid: false, error: "incomplete" };
  }

  const parts = parseValueToDatetimeParts(trimmed);
  if (!parts) {
    return { valid: false, error: "invalid" };
  }

  const dayIso = toDayIso(parts);
  if (opts.minDate && dayIso < opts.minDate) {
    return { valid: false, error: "beforeMin" };
  }
  if (opts.maxDate && dayIso > opts.maxDate) {
    return { valid: false, error: "afterMax" };
  }

  const cap = getEffectiveMaxDateTime(opts);
  if (cap && trimmed > cap) {
    return { valid: false, error: "afterMax" };
  }

  return { valid: true };
}

function formatDatetimeForMessage(value: string): string {
  const parts = parseValueToDatetimeParts(value);
  if (!parts) return value;
  const d = new Date(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute
  );
  return format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

export function datetimeInputErrorMessage(
  code: DatetimeInputErrorCode,
  opts?: { maxDateTime?: string }
): string {
  switch (code) {
    case "incomplete":
      return "Informe data e hora completas.";
    case "invalid":
      return "Data ou hora inválida.";
    case "beforeMin":
      return "Data e hora anterior ao limite permitido.";
    case "afterMax":
      return opts?.maxDateTime
        ? `Data e hora posterior a ${formatDatetimeForMessage(opts.maxDateTime)}.`
        : "Não é permitido registrar data e hora no futuro.";
  }
}

export function defaultDatetimeParts(): DatetimeParts {
  const n = new Date();
  return {
    year: n.getFullYear(),
    month: n.getMonth() + 1,
    day: n.getDate(),
    hour: n.getHours(),
    minute: n.getMinutes(),
  };
}
