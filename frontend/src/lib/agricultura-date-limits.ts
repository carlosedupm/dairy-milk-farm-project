import { todayISODate } from "@/lib/date-limits";
import { addDaysToISODate } from "@/lib/gestao-date-limits";
import type { SafraCultura } from "@/services/agricultura";

/** Antiguidade máxima aceitável para data de plantio (~5 anos). */
export const ANOS_MAX_ANTIGUIDADE_PLANTIO = 5;

const DIAS_POR_ANO_PLANTIO = ANOS_MAX_ANTIGUIDADE_PLANTIO * 365;

export const AGRICULTURA_DATE_MESSAGES = {
  dateFuture: "Não é permitido registrar data no futuro.",
  dateOutsideSafra: "A data deve estar dentro do período da safra/cultura.",
  plantioTooOld: "A data de plantio não pode ser anterior a 5 anos.",
  colheitaBeforePlantio:
    "A data de colheita deve ser igual ou posterior à data de plantio.",
} as const;

export type SafraCulturaDateRange = {
  minDate?: string;
  maxDate?: string;
};

/** Limite inferior: a data mais restritiva (mais recente) entre os candidatos. */
export function minIsoDateBound(
  ...dates: (string | undefined)[]
): string | undefined {
  const valid = dates
    .map((d) => d?.trim().slice(0, 10))
    .filter((d): d is string => !!d && /^\d{4}-\d{2}-\d{2}$/.test(d));
  if (valid.length === 0) return undefined;
  return valid.reduce((a, b) => (a > b ? a : b));
}

/** Limite superior: a data mais restritiva (mais antiga) entre os candidatos. */
export function maxIsoDateBound(
  ...dates: (string | undefined)[]
): string | undefined {
  const valid = dates
    .map((d) => d?.trim().slice(0, 10))
    .filter((d): d is string => !!d && /^\d{4}-\d{2}-\d{2}$/.test(d));
  if (valid.length === 0) return undefined;
  return valid.reduce((a, b) => (a < b ? a : b));
}

export function safraAnoBounds(ano: number): { start: string; end: string } {
  return {
    start: `${ano}-01-01`,
    end: `${ano}-12-31`,
  };
}

export function plantioMinDateAntiguidade(): string {
  return addDaysToISODate(todayISODate(), -DIAS_POR_ANO_PLANTIO);
}

/** Período para custos, produções e receitas vinculados à safra/cultura. */
export function resolveSafraCulturaDateRange(
  sc: SafraCultura | null | undefined
): SafraCulturaDateRange {
  if (!sc?.ano) return {};

  const today = todayISODate();
  const { start, end } = safraAnoBounds(sc.ano);
  const plantio = sc.data_plantio?.trim().slice(0, 10);
  const colheita = sc.data_colheita?.trim().slice(0, 10);

  const minDate = plantio || start;
  const maxDate = maxIsoDateBound(colheita, end, today);

  return { minDate, maxDate };
}

export type SafraPlantioColheitaLimits = {
  minDate: string;
  maxDate: string;
  minYear: number;
  maxYear: number;
};

export function resolvePlantioDateLimits(
  ano: number,
  dataColheita?: string
): SafraPlantioColheitaLimits {
  const today = todayISODate();
  const { start, end } = safraAnoBounds(ano);
  const minDate =
    minIsoDateBound(plantioMinDateAntiguidade(), start) ?? start;
  const maxDate =
    maxIsoDateBound(today, dataColheita, end) ?? today;

  return {
    minDate,
    maxDate,
    minYear: ano - ANOS_MAX_ANTIGUIDADE_PLANTIO,
    maxYear: ano + 1,
  };
}

export function resolveColheitaDateLimits(
  ano: number,
  dataPlantio?: string
): SafraPlantioColheitaLimits {
  const today = todayISODate();
  const { start, end } = safraAnoBounds(ano);
  const plantio = dataPlantio?.trim().slice(0, 10);
  const minDate = plantio || start;
  const maxDate = maxIsoDateBound(today, end) ?? today;

  return {
    minDate,
    maxDate,
    minYear: ano - ANOS_MAX_ANTIGUIDADE_PLANTIO,
    maxYear: ano + 1,
  };
}

export function resolveAnaliseSoloColetaLimits(): {
  maxDate: string;
} {
  return { maxDate: todayISODate() };
}

export function resolveAnaliseSoloResultadoLimits(dataColeta?: string): {
  minDate?: string;
  maxDate: string;
} {
  const coleta = dataColeta?.trim().slice(0, 10);
  return {
    minDate: coleta || undefined,
    maxDate: todayISODate(),
  };
}
