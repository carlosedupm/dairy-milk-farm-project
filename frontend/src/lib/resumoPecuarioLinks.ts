/** Data civil local em YYYY-MM-DD (alinhado ao backend resumo pecuário). */
export function formatLocalDateYmd(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Período de hoje (início e fim no mesmo dia civil). */
export function getResumoProducaoHojeRange(): { start: string; end: string } {
  const today = formatLocalDateYmd();
  return { start: today, end: today };
}

/**
 * Últimos 7 dias civis inclusive (hoje − 6 até hoje),
 * espelhando `ResumoPecuarioService` (startSemana = startHoje − 6).
 */
export function getResumoProducaoSemanaRange(): { start: string; end: string } {
  const now = new Date();
  const end = formatLocalDateYmd(now);
  const startDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 6,
  );
  return { start: formatLocalDateYmd(startDate), end };
}

export function buildProducaoListHref(start: string, end: string): string {
  const params = new URLSearchParams({ start, end });
  return `/producao?${params.toString()}`;
}

export function buildGestacoesPartos7dHref(): string {
  return "/gestao/gestacoes?status=CONFIRMADA&partos_dias=7";
}

export function buildAnimaisEmLactacaoHref(): string {
  return "/animais?em_lactacao=1";
}

export function buildAlertasCriticosHref(): string {
  return "/alertas?status=ABERTO&severidade=CRITICA";
}
