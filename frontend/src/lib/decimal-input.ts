/** Caracteres aceitos enquanto o usuário digita um decimal parcial. */
const DECIMAL_CHAR = /^[\d.,]$/;

/**
 * Normaliza texto parcial de decimal: só dígitos e um separador (. ou ,).
 * Mantém separador final durante a digitação (ex.: "25.").
 */
export function sanitizeDecimalInput(
  raw: string,
  maxFractionDigits?: number
): string {
  if (!raw) return "";

  const endsWithSeparator = /[.,]$/.test(raw);
  let result = "";
  let separatorUsed = false;

  for (const ch of raw) {
    if (ch >= "0" && ch <= "9") {
      if (separatorUsed && maxFractionDigits != null) {
        const dotIndex = result.indexOf(".");
        const fractionLength =
          dotIndex === -1 ? 0 : result.length - dotIndex - 1;
        if (fractionLength >= maxFractionDigits) continue;
      }
      result += ch;
      continue;
    }

    if ((ch === "." || ch === ",") && !separatorUsed) {
      separatorUsed = true;
      result += ".";
    }
  }

  if (endsWithSeparator && separatorUsed && !result.endsWith(".")) {
    const dotIndex = result.indexOf(".");
    if (dotIndex !== -1 && result.length === dotIndex + 1) {
      return result;
    }
    if (dotIndex !== -1 && result.slice(dotIndex + 1).length === 0) {
      return `${result}.`;
    }
    if (dotIndex === -1) {
      return `${result}.`;
    }
  }

  return result;
}

/** Converte string sanitizada em número; retorna NaN se vazio ou só separador. */
export function parseDecimalValue(raw: string): number {
  const normalized = sanitizeDecimalInput(raw).replace(/\.$/, "");
  if (!normalized || normalized === ".") return NaN;
  return parseFloat(normalized);
}

/** Indica se um caractere (digitação) pode ser inserido no valor atual. */
export function canInsertDecimalChar(
  currentValue: string,
  data: string,
  maxFractionDigits?: number
): boolean {
  if (!data) return true;
  if (data.length > 1) return true;

  if (/^\d$/.test(data)) {
    const dotIndex = currentValue.indexOf(".");
    if (dotIndex !== -1 && maxFractionDigits != null) {
      const fractionLength = currentValue.length - dotIndex - 1;
      if (fractionLength >= maxFractionDigits) return false;
    }
    return true;
  }

  if (DECIMAL_CHAR.test(data) && (data === "." || data === ",")) {
    return !currentValue.includes(".") && !currentValue.includes(",");
  }

  return false;
}

/**
 * Calcula posição do cursor após sanitização (colagem ou caracteres removidos).
 */
export function decimalCursorAfterSanitize(
  raw: string,
  sanitized: string,
  cursor: number
): number {
  if (raw === sanitized) return cursor;

  let nextCursor = 0;
  let sanitizedIndex = 0;

  for (let rawIndex = 0; rawIndex < raw.length; rawIndex += 1) {
    const rawChar = raw[rawIndex];
    const sanitizedChar = sanitized[sanitizedIndex];

    const matches =
      sanitizedChar != null &&
      (rawChar === sanitizedChar ||
        ((rawChar === "," || rawChar === ".") && sanitizedChar === "."));

    if (matches) {
      sanitizedIndex += 1;
      if (rawIndex < cursor) {
        nextCursor = sanitizedIndex;
      }
      continue;
    }

    if (rawIndex < cursor) {
      nextCursor = sanitizedIndex;
    }
  }

  return Math.min(nextCursor, sanitized.length);
}
