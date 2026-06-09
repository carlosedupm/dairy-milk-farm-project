import { parseISODateLocal } from "@/lib/date-limits";
import { formatDatePtBr } from "@/lib/format";
import type { Cobertura } from "@/services/coberturas";
import type { Cio } from "@/services/cios";
import type { Gestacao } from "@/services/gestacoes";

export type GestaoChronologyContext = {
  minDate?: string;
  referenceDateIso?: string;
  /** Só toque: data civil da cobertura vinculada (distinta de minDate = +15d). */
  coberturaDateIso?: string;
};

export const GESTAO_CONFORMIDADE = {
  coberturaAfterCio: "TMP-003",
  toqueAfterCobertura: "TMP-003",
  partoAfterGestacao: "TMP-004",
  secagemAfterLactacao: "TMP-005",
} as const;

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

export function coberturaDateIsoFromCobertura(
  cobertura: Cobertura | undefined
): string | undefined {
  if (!cobertura?.data) return undefined;
  const iso = isoDateFromDatetime(cobertura.data);
  return iso || undefined;
}

export function minDateToqueFromCobertura(cobertura: Cobertura | undefined): string | undefined {
  const coberturaIso = coberturaDateIsoFromCobertura(cobertura);
  if (!coberturaIso) return undefined;
  return addDaysToISODate(coberturaIso, DIAS_MINIMOS_TOQUE);
}

export function toqueChronologyFromCoberturas(
  coberturas: Cobertura[],
  coberturaId: string,
  coberturaSelectValue: string
): GestaoChronologyContext {
  const cobertura = resolveCoberturaForToque(
    coberturas,
    coberturaId,
    coberturaSelectValue
  );
  const coberturaDateIso = coberturaDateIsoFromCobertura(cobertura);
  const minDate = minDateToqueFromCobertura(cobertura);
  return { minDate, coberturaDateIso, referenceDateIso: coberturaDateIso };
}

/** Cobertura mais recente do animal (ex.: toque em lote). */
export function toqueChronologyForAnimalCoberturas(
  coberturas: Cobertura[],
  animalId: number
): GestaoChronologyContext {
  const sorted = coberturas
    .filter((c) => c.animal_id === animalId)
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  const cobertura = sorted[0];
  const coberturaDateIso = coberturaDateIsoFromCobertura(cobertura);
  const minDate = minDateToqueFromCobertura(cobertura);
  return { minDate, coberturaDateIso, referenceDateIso: coberturaDateIso };
}

export function coberturaChronologyFromCios(cios: Cio[]): GestaoChronologyContext {
  const referenceDateIso = minDateCoberturaFromCios(cios);
  return { minDate: referenceDateIso, referenceDateIso };
}

export function partoChronologyFromGestacoes(
  gestacoes: Gestacao[],
  gestacaoId: string,
  animalId: string
): GestaoChronologyContext {
  const gestacao = resolveGestacaoForPartoMinDate(gestacoes, gestacaoId, animalId);
  const referenceDateIso = minDatePartoFromGestacao(gestacao);
  return { minDate: referenceDateIso, referenceDateIso };
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

function formatReferenceDate(referenceDateIso: string): string {
  return formatDatePtBr(referenceDateIso);
}

export function gestaoMessageCoberturaAfterCio(referenceDateIso: string): string {
  return `A data da cobertura não pode ser anterior ao cio detectado em ${formatReferenceDate(referenceDateIso)}.`;
}

export function gestaoMessageToqueBeforeCobertura(referenceDateIso: string): string {
  return `A data do toque não pode ser anterior à cobertura de ${formatReferenceDate(referenceDateIso)}.`;
}

export function gestaoMessageToqueMinDaysAfterCobertura(
  referenceDateIso: string
): string {
  return `O toque deve ser pelo menos ${DIAS_MINIMOS_TOQUE} dias após a cobertura de ${formatReferenceDate(referenceDateIso)}.`;
}

export function gestaoMessagePartoAfterGestacao(referenceDateIso: string): string {
  return `A data do parto não pode ser anterior à confirmação da gestação em ${formatReferenceDate(referenceDateIso)}.`;
}

export function gestaoMessageSecagemAfterLactacao(referenceDateIso: string): string {
  return `A data da secagem não pode ser anterior ao início da lactação em ${formatReferenceDate(referenceDateIso)}.`;
}

export const GESTAO_DATE_MESSAGES = {
  dateFuture: "Não é permitido registrar data no futuro.",
  datetimeFuture: "Não é permitido registrar data e hora no futuro.",
} as const;

/** Resolve mensagem de cronologia do toque (ordem: antes da cobertura, depois janela de 15 dias). */
export function resolveToqueChronologyError(
  data: string,
  ctx: Pick<GestaoChronologyContext, "minDate" | "coberturaDateIso">
): string | undefined {
  if (!data.trim()) return undefined;
  const coberturaDateIso = ctx.coberturaDateIso;
  if (
    coberturaDateIso &&
    isIsoDateBeforeMin(data, coberturaDateIso)
  ) {
    return gestaoMessageToqueBeforeCobertura(coberturaDateIso);
  }
  if (ctx.minDate && isIsoDateBeforeMin(data, ctx.minDate)) {
    const ref = coberturaDateIso ?? ctx.minDate;
    return gestaoMessageToqueMinDaysAfterCobertura(ref);
  }
  return undefined;
}

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
