import { addDaysToISODate } from "@/lib/gestao-date-limits";
import { isValidYmd, parseDateRange } from "@/lib/filter-url";
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

/** Parse de `start` para useFilterSync (listagens server-side). */
export function parseServerListPeriodStart(
  raw: string | null,
  params: URLSearchParams,
): string {
  const range = parseDateRange(raw, params.get("end"));
  if (range) return range.start;
  if (!raw?.trim() && !params.get("end")?.trim()) {
    return getDefaultServerListPeriod().start;
  }
  return "";
}

/** Parse de `end` para useFilterSync (listagens server-side). */
export function parseServerListPeriodEnd(
  raw: string | null,
  params: URLSearchParams,
): string {
  const range = parseDateRange(params.get("start"), raw);
  if (range) return range.end;
  if (!params.get("start")?.trim() && !raw?.trim()) {
    return getDefaultServerListPeriod().end;
  }
  return "";
}
