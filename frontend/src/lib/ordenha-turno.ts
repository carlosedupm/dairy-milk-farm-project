/**
 * Turno de ordenha (BR-PRODUCAO-008 / BRF-009).
 * MANHA 00:00–11:59; TARDE 12:00–23:59 (noite absorvida na tarde).
 */

export type OrdenhaTurno = "MANHA" | "TARDE";

export const ORDENHA_TURNOS: OrdenhaTurno[] = ["MANHA", "TARDE"];

export const ORDENHA_TURNO_LABELS: Record<OrdenhaTurno, string> = {
  MANHA: "Manhã",
  TARDE: "Tarde",
};

/** Inferência a partir de Date local (hora do browser). */
export function turnoFromDateTime(date: Date = new Date()): OrdenhaTurno {
  const hour = date.getHours();
  return hour < 12 ? "MANHA" : "TARDE";
}

/**
 * Classifica um instante (ISO / RFC3339 da API) no turno local.
 * Strings inválidas → null.
 */
export function turnoFromApiDateTime(value: string): OrdenhaTurno | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return null;
  return turnoFromDateTime(d);
}

export function isSameTurno(
  dataHoraApi: string,
  turnoSessao: OrdenhaTurno,
): boolean {
  const t = turnoFromApiDateTime(dataHoraApi);
  return t != null && t === turnoSessao;
}

/** IDs de animais com pelo menos uma produção no turno da sessão. */
export function animalIdsComProducaoNoTurno(
  producoes: { animal_id: number; data_hora: string }[],
  turnoSessao: OrdenhaTurno,
): Set<number> {
  const ids = new Set<number>();
  for (const p of producoes) {
    if (isSameTurno(p.data_hora, turnoSessao)) {
      ids.add(p.animal_id);
    }
  }
  return ids;
}

export function sessionStorageKey(
  fazendaId: number,
  diaYmd: string,
  turno: OrdenhaTurno,
): string {
  return `ceialmilk:ordenha:v1:${fazendaId}:${diaYmd}:${turno}`;
}
