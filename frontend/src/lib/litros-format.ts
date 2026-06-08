import { parseDecimalValue, sanitizeDecimalInput } from "@/lib/decimal-input";

/** Casas decimais em registos individuais de produção (listagens). */
export const LITROS_LIST_FRACTION_DIGITS = 2;

/** Máximo de casas decimais no input de litros. */
export const LITROS_INPUT_MAX_FRACTION_DIGITS = 2;

const listFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: LITROS_LIST_FRACTION_DIGITS,
  maximumFractionDigits: LITROS_LIST_FRACTION_DIGITS,
});

const flexibleFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: LITROS_INPUT_MAX_FRACTION_DIGITS,
});

/** Exibição de litros em tabelas de produção (ex.: `25,50`). */
export function formatLitrosForList(litros: number): string {
  return listFormatter.format(litros);
}

/** Exibição flexível (totais, médias, resumos) — até 2 casas, sem zeros à direita. */
export function formatLitrosFlexible(litros: number): string {
  return flexibleFormatter.format(litros);
}

function toCanonicalInput(raw: string): string {
  return sanitizeDecimalInput(
    raw.replace(",", "."),
    LITROS_INPUT_MAX_FRACTION_DIGITS
  );
}

function toDisplayInput(raw: string): string {
  return raw.replace(".", ",");
}

/** Sanitiza texto parcial do input (vírgula ou ponto, máx. 2 decimais). */
export function sanitizeLitrosInput(raw: string): string {
  return toDisplayInput(toCanonicalInput(raw));
}

/** Converte número da API para valor inicial do input (ex.: `25,5`). */
export function litrosNumberToInputValue(litros: number): string {
  if (!Number.isFinite(litros)) return "";
  return toDisplayInput(String(litros));
}

/** Converte string do input em número para envio à API. */
export function parseLitrosValue(raw: string): number {
  return parseDecimalValue(toCanonicalInput(raw));
}

/** Formata valor válido ao sair do campo; mantém parcial inválido para validação. */
export function formatLitrosInputOnBlur(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  const parsed = parseLitrosValue(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return sanitizeLitrosInput(trimmed);
  }

  return formatLitrosFlexible(parsed);
}
