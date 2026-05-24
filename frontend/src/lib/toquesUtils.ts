export const CLASSIFICACOES_OPERACIONAIS = [
  { value: "PRENHA", label: "Prenha" },
  { value: "VAZIA", label: "Vazia" },
  { value: "VAZIA_PEV", label: "Vazia PEV" },
  { value: "CLOE", label: "CLOE" },
  { value: "CL", label: "CL" },
  { value: "RETOQUE", label: "Retoque" },
] as const;

export type ClassificacaoOperacional =
  (typeof CLASSIFICACOES_OPERACIONAIS)[number]["value"];

export const METODOS_DIAGNOSTICO = [
  { value: "PALPACAO", label: "Palpação" },
  { value: "ULTRASSOM", label: "Ultrassom" },
] as const;

export const OBS_SUGESTOES_VAZIA = ["PROTOCOLO", "OK", "0,5ML ECP"] as const;
export const OBS_SUGESTOES_AGUARDAR = ["AGUARDAR"] as const;

export function classificacaoLabel(value: string | null | undefined): string {
  if (!value) return "";
  const found = CLASSIFICACOES_OPERACIONAIS.find((c) => c.value === value);
  if (found) return found.label.toUpperCase();
  return value.replace("_", " ");
}

export function classificacaoRequiresCobertura(
  classificacao: string
): boolean {
  return classificacao === "PRENHA";
}

export function classificacaoDefaultObs(classificacao: string): string {
  if (classificacao === "CLOE" || classificacao === "CL" || classificacao === "RETOQUE") {
    return "AGUARDAR";
  }
  return "";
}

export function gestacaoToDias(
  valor: string,
  unidade: "dias" | "meses"
): number | null {
  const n = Number.parseFloat(valor.replace(",", "."));
  if (Number.isNaN(n) || n <= 0) return null;
  if (unidade === "meses") return Math.round(n * 30);
  return Math.round(n);
}

export function formatDiasGestacao(dias: number | null | undefined): string {
  if (dias == null || dias <= 0) return "";
  if (dias >= 30 && dias % 30 === 0) {
    const meses = dias / 30;
    return `${meses} ${meses === 1 ? "MÊS" : "MESES"}`;
  }
  return `${dias} DIAS`;
}

export function formatToqueObs(item: {
  observacoes?: string | null;
  dias_gestacao_estimados?: number | null;
  classificacao_operacional?: string | null;
}): string {
  if (item.observacoes?.trim()) return item.observacoes.trim();
  if (item.classificacao_operacional === "PRENHA") {
    return formatDiasGestacao(item.dias_gestacao_estimados);
  }
  return "";
}

export type ObsHighlight = "none" | "protocolo" | "medicamento";

export function getObsHighlight(obs: string): ObsHighlight {
  const upper = obs.toUpperCase();
  if (upper.includes("PROTOCOLO")) return "protocolo";
  if (
    /\d+\s*(ML|MG|DIAS)/i.test(obs) ||
    /ECP|LACTOFUR|CIDR|GNRH/i.test(upper)
  ) {
    return "medicamento";
  }
  return "none";
}

export function todayDateInputValue(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
