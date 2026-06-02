import { parseISODateLocal } from "@/lib/date-limits";
import type { Cobertura } from "@/services/coberturas";
import type { Cio } from "@/services/cios";
import type { Gestacao } from "@/services/gestacoes";

/** Espelha backend/internal/service/animal_service.go DiasMinimosToque */
export const DIAS_MINIMOS_TOQUE = 15;

/** Extrai YYYY-MM-DD de ISO ou YYYY-MM-DDTHH:mm (local). */
export function isoDateFromDatetime(isoOrLocal: string): string {
  const t = isoOrLocal.trim();
  if (!t) return "";
  const datePart = t.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return datePart;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Soma dias civis a uma data ISO (YYYY-MM-DD). */
export function addDaysToISODate(iso: string, days: number): string {
  const base = parseISODateLocal(iso);
  if (!base || days === 0) return iso.slice(0, 10);
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function minDateCoberturaFromCios(cios: Cio[]): string | undefined {
  if (cios.length === 0) return undefined;
  const sorted = [...cios].sort(
    (a, b) =>
      new Date(b.data_detectado).getTime() - new Date(a.data_detectado).getTime()
  );
  const latest = sorted[0];
  if (!latest) return undefined;
  const iso = isoDateFromDatetime(latest.data_detectado);
  return iso || undefined;
}

export function minDateToqueFromCobertura(cobertura: Cobertura | undefined): string | undefined {
  if (!cobertura?.data) return undefined;
  return addDaysToISODate(isoDateFromDatetime(cobertura.data), DIAS_MINIMOS_TOQUE);
}

export function minDatePartoFromGestacao(gestacao: Gestacao | undefined): string | undefined {
  if (!gestacao?.data_confirmacao) return undefined;
  const iso = isoDateFromDatetime(gestacao.data_confirmacao);
  return iso || undefined;
}

export function resolveCoberturaForToque(
  coberturas: Cobertura[],
  coberturaId: string,
  coberturaSelectValue: string
): Cobertura | undefined {
  const id = coberturaId || coberturaSelectValue;
  if (!id) return undefined;
  return coberturas.find((c) => c.id.toString() === id);
}

export function resolveGestacaoForParto(
  gestacoes: Gestacao[],
  gestacaoId: string
): Gestacao | undefined {
  if (!gestacaoId) return undefined;
  return gestacoes.find((g) => g.id.toString() === gestacaoId);
}

/** Gestação CONFIRMADA do animal (ex.: formulário de parto sem vínculo manual). */
export function resolveGestacaoAtivaForPartoAnimal(
  gestacoes: Gestacao[],
  animalId: string
): Gestacao | undefined {
  const aid = Number(animalId);
  if (!aid) return undefined;
  const confirmed = gestacoes.filter(
    (g) => g.animal_id === aid && g.status === "CONFIRMADA"
  );
  if (confirmed.length === 0) return undefined;
  return [...confirmed].sort(
    (a, b) =>
      new Date(b.data_confirmacao).getTime() -
      new Date(a.data_confirmacao).getTime()
  )[0];
}

export function resolveGestacaoForPartoMinDate(
  gestacoes: Gestacao[],
  gestacaoId: string,
  animalId: string
): Gestacao | undefined {
  return (
    resolveGestacaoForParto(gestacoes, gestacaoId) ??
    resolveGestacaoAtivaForPartoAnimal(gestacoes, animalId)
  );
}

export const GESTAO_DATE_MESSAGES = {
  coberturaAfterCio: "A cobertura deve ser posterior ao cio registrado.",
  toqueAfterCobertura:
    "O toque deve ser pelo menos 15 dias após a cobertura.",
  partoAfterGestacao:
    "O parto deve ser posterior à confirmação da gestação.",
  secagemAfterLactacao:
    "A secagem deve ser posterior ao início da lactação.",
  dateFuture: "Não é permitido registrar data no futuro.",
  datetimeFuture: "Não é permitido registrar data e hora no futuro.",
} as const;

export function isIsoDateBeforeMin(value: string, minDate?: string): boolean {
  if (!minDate || !value.trim()) return false;
  const day = isoDateFromDatetime(value);
  return Boolean(day && day < minDate);
}

export function isIsoDateAfterMax(value: string, maxDate?: string): boolean {
  if (!maxDate || !value.trim()) return false;
  const day = isoDateFromDatetime(value);
  return Boolean(day && day > maxDate);
}
