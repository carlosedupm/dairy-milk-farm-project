/** Data civil local YYYY-MM-DD → Date à meia-noite local. */
function parseLocalYmd(ymd: string): Date {
  const [y, m, d] = ymd.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Parto previsto entre hoje e hoje+7 dias (inclusive), alinhado ao resumo pecuário. */
export function isPartoPrevistoProximos7Dias(
  dataPrevistaParto: string | null | undefined,
): boolean {
  if (!dataPrevistaParto) return false;
  const hoje = startOfToday();
  const ate = new Date(hoje);
  ate.setDate(ate.getDate() + 7);
  const previsto = parseLocalYmd(dataPrevistaParto);
  return previsto >= hoje && previsto <= ate;
}
