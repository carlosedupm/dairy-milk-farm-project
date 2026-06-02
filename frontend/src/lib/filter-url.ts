const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseLocalYmd(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

/** Valida formato YYYY-MM-DD e data civil válida. */
export function isValidYmd(value: string): boolean {
  const trimmed = value.trim();
  if (!YMD_RE.test(trimmed)) return false;
  const parsed = parseLocalYmd(trimmed);
  if (Number.isNaN(parsed.getTime())) return false;
  const [y, m, d] = trimmed.split("-").map(Number);
  return (
    parsed.getFullYear() === y &&
    parsed.getMonth() === m - 1 &&
    parsed.getDate() === d
  );
}

/** Lê um param de URL como YYYY-MM-DD válido; senão string vazia. */
export function parseYmdParam(raw: string | null | undefined): string {
  const trimmed = raw?.trim() ?? "";
  return isValidYmd(trimmed) ? trimmed : "";
}

/** Grava na URL só YMD válido; inválido/vazio → omitir param. */
export function serializeYmdParam(value: string): string | null {
  const trimmed = value.trim();
  return isValidYmd(trimmed) ? trimmed : null;
}

/** Retorna par válido ou null se inválido/incompleto ou start > end. */
export function parseDateRange(
  start: string | null | undefined,
  end: string | null | undefined,
): { start: string; end: string } | null {
  const s = start?.trim() ?? "";
  const e = end?.trim() ?? "";
  if (!s || !e) return null;
  if (!isValidYmd(s) || !isValidYmd(e)) return null;
  if (s > e) return null;
  return { start: s, end: e };
}

export function parseOptionalInt(
  raw: string | null | undefined,
): number | undefined {
  if (raw == null) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  if (Number.isNaN(n) || n <= 0) return undefined;
  return n;
}

export function parseOptionalString(
  raw: string | null | undefined,
): string | undefined {
  const trimmed = raw?.trim() ?? "";
  return trimmed || undefined;
}

type ListCountSuffixArgs = {
  filtered: number;
  total: number;
  filtersActive: boolean;
};

/** RF05: sufixo de contagem no título — "(N de M)" ou "(N)". */
export function formatListCountSuffix({
  filtered,
  total,
  filtersActive,
}: ListCountSuffixArgs): string {
  if (total === 0 && filtered === 0) return "";
  if (!filtersActive) {
    return total > 0 ? ` (${total})` : "";
  }
  if (filtered !== total && total > 0) {
    return ` (${filtered} de ${total})`;
  }
  return filtered > 0 ? ` (${filtered})` : "";
}
