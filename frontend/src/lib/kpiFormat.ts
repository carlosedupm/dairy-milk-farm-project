/** Contagem KPI: zero → «Nenhum». */
export function formatKpiCount(n: number): string {
  return n === 0 ? "Nenhum" : String(n);
}

/** Litros KPI: zero → «Nenhum»; senão uma casa decimal + sufixo L. */
export function formatKpiLitros(litros: number): string {
  if (litros === 0) return "Nenhum";
  return `${litros.toFixed(1)} L`;
}

/** Rótulo acessível para contagem (ex.: aria-label). */
export function kpiCountAriaLabel(
  singular: string,
  plural: string,
  n: number,
): string {
  if (n === 0) return `Nenhum — ${plural}`;
  if (n === 1) return `Ver 1 ${singular}`;
  return `Ver ${n} ${plural}`;
}

/** Rótulo acessível para litros. */
export function kpiLitrosAriaLabel(litros: number, contexto: string): string {
  if (litros === 0) return `Nenhuma ${contexto}`;
  return `Ver ${contexto}, ${litros.toFixed(1)} litros`;
}
