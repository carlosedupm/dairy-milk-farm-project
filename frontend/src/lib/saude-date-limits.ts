import { isoDateFromDatetime } from "@/lib/gestao-date-limits";
import { formatDatePtBr } from "@/lib/format";

export const SAUDE_CONFORMIDADE = {
  naoFuturo: "TMP-001",
  aposEntrada: "TMP-002",
} as const;

export const SAUDE_DATE_MESSAGES = {
  inicioFuture:
    "A data de início não pode ser futura (BR-CICLO-012).",
  beforeAnimalRef: (ref: string) =>
    `A data não pode ser anterior a ${ref} do animal (BR-CICLO-013).`,
} as const;

/** Limite inferior efetivo: max(data_entrada, data_nascimento) quando preenchidas. */
export function minDateFromAnimal(animal: {
  data_entrada?: string | null;
  data_nascimento?: string | null;
}): string | undefined {
  const dates: string[] = [];
  if (animal.data_entrada?.trim()) {
    const d = isoDateFromDatetime(animal.data_entrada);
    if (d) dates.push(d);
  }
  if (animal.data_nascimento?.trim()) {
    const d = isoDateFromDatetime(animal.data_nascimento);
    if (d) dates.push(d);
  }
  if (dates.length === 0) return undefined;
  return dates.sort().pop();
}

export function saudeMessageBeforeAnimalRef(referenceDateIso: string): string {
  return SAUDE_DATE_MESSAGES.beforeAnimalRef(formatDatePtBr(referenceDateIso));
}
