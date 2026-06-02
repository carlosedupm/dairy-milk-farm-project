import { addDaysToISODate } from "@/lib/gestao-date-limits";
import {
  isValidYmd,
  parseDateRange,
  parseYmdParam,
} from "@/lib/filter-url";
import { formatLocalDateYmd } from "@/lib/resumoPecuarioLinks";

/** Dias civis inclusivos no período padrão de listagens server-side. */
export const SERVER_LIST_PERIOD_DAYS = 30;

export const PERIOD_RANGE_ORDER_ERROR =
  "Data início não pode ser maior que data fim";

export type PeriodRange = { start: string; end: string };

/** Últimos 30 dias civis inclusivos (hoje − 29 … hoje). */
export function getDefaultServerListPeriod(): PeriodRange {
  const end = formatLocalDateYmd();
  const start = addDaysToISODate(end, -(SERVER_LIST_PERIOD_DAYS - 1));
  return { start, end };
}

export function isDefaultServerListPeriod(start: string, end: string): boolean {
  const def = getDefaultServerListPeriod();
  return start === def.start && end === def.end;
}

export function getPeriodRangeOrderError(
  start: string,
  end: string,
): string | undefined {
  const s = start.trim();
  const e = end.trim();
  if (!s || !e) return undefined;
  if (!isValidYmd(s) || !isValidYmd(e)) return undefined;
  if (s > e) return PERIOD_RANGE_ORDER_ERROR;
  return undefined;
}

/** Par válido na UI/API; senão período padrão server-side (30 dias). */
export function resolveServerListPeriod(
  start: string,
  end: string,
): PeriodRange {
  const range = parseDateRange(start, end);
  if (range) return range;
  return getDefaultServerListPeriod();
}

/**
 * Período para consultas server-side (produção, alertas).
 * Retorna null quando início > fim (UI inválida — não usar fallback silencioso).
 */
export function resolveServerListPeriodForApi(
  start: string,
  end: string,
): PeriodRange | null {
  if (getPeriodRangeOrderError(start, end)) return null;
  const range = parseDateRange(start, end);
  if (range) return range;
  const s = start.trim();
  const e = end.trim();
  const hasStart = isValidYmd(s);
  const hasEnd = isValidYmd(e);
  if (hasStart !== hasEnd) return null;
  if (!hasStart && !hasEnd) return getDefaultServerListPeriod();
  return null;
}

/** Parse de `start` para useFilterSync (listagens server-side). */
export function parseServerListPeriodStart(
  raw: string | null,
  params: URLSearchParams,
): string {
  const parsed = parseYmdParam(raw);
  if (parsed) return parsed;
  if (!parseYmdParam(params.get("end"))) {
    return getDefaultServerListPeriod().start;
  }
  return "";
}

/** Parse de `end` para useFilterSync (listagens server-side). */
export function parseServerListPeriodEnd(
  raw: string | null,
  params: URLSearchParams,
): string {
  const parsed = parseYmdParam(raw);
  if (parsed) return parsed;
  if (!parseYmdParam(params.get("start"))) {
    return getDefaultServerListPeriod().end;
  }
  return "";
}
