import { isoDateFromDatetime } from "@/lib/gestao-date-limits";
import type { LactacaoAtiva } from "@/services/animais";

/**
 * Indica se a lactação ativa cobre o dia civil da produção (BR-PRODUCAO-003 / INT-002).
 * Espelha ExistsAtivaNaFazendaNaData / lactacaoCoveringProducaoDate no backend.
 */
export function isLactacaoAtivaNaData(
  lact: LactacaoAtiva,
  dataHora: string
): boolean {
  const prodDate = isoDateFromDatetime(dataHora);
  if (!prodDate) return false;

  const inicio = isoDateFromDatetime(lact.data_inicio);
  if (!inicio || inicio > prodDate) return false;

  if (lact.data_fim) {
    const fim = isoDateFromDatetime(lact.data_fim);
    if (fim && fim < prodDate) return false;
  }

  return true;
}
