import type { ProducaoLeite } from "@/services/producao";
import type { Lactacao } from "@/services/lactacoes";
import { formatDatePtBr } from "@/lib/format";

export type ProducaoLactacaoGrupo = {
  lactacaoId: number | null;
  numeroLactacao?: number;
  dataInicio?: string;
  dataFim?: string | null;
  titulo: string;
  totalLitros: number;
  mediaDiaria: number;
  duracaoDias: number;
  registros: ProducaoLeite[];
};

function parseISODate(value: string): Date {
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

function civilDaysBetween(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.floor(ms / (24 * 60 * 60 * 1000)) + 1);
}

function lactacaoDuracaoDias(lact?: Lactacao): number {
  if (!lact?.data_inicio) return 1;
  const inicio = parseISODate(lact.data_inicio);
  const fim = lact.data_fim ? parseISODate(lact.data_fim) : new Date();
  return civilDaysBetween(inicio, fim);
}

export function buildProducaoGruposPorLactacao(
  registros: ProducaoLeite[],
  lactacoes: Lactacao[],
): ProducaoLactacaoGrupo[] {
  const lactById = new Map(lactacoes.map((l) => [l.id, l]));
  const byKey = new Map<string, ProducaoLeite[]>();

  for (const r of registros) {
    const key = r.lactacao_id != null ? String(r.lactacao_id) : "null";
    const list = byKey.get(key) ?? [];
    list.push(r);
    byKey.set(key, list);
  }

  const grupos: ProducaoLactacaoGrupo[] = [];

  for (const [key, items] of byKey.entries()) {
    const totalLitros = items.reduce((acc, r) => acc + r.quantidade, 0);
    if (key === "null") {
      grupos.push({
        lactacaoId: null,
        titulo: "Sem lactação vinculada",
        totalLitros,
        mediaDiaria: items.length > 0 ? totalLitros / items.length : 0,
        duracaoDias: 0,
        registros: items.sort(
          (a, b) =>
            new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime(),
        ),
      });
      continue;
    }

    const lactacaoId = Number(key);
    const lact = lactById.get(lactacaoId);
    const duracaoDias = lactacaoDuracaoDias(lact);
    grupos.push({
      lactacaoId,
      numeroLactacao: lact?.numero_lactacao,
      dataInicio: lact?.data_inicio,
      dataFim: lact?.data_fim,
      titulo: lact
        ? `Lactação #${lact.numero_lactacao} (desde ${formatDatePtBr(lact.data_inicio)})`
        : `Lactação #${lactacaoId}`,
      totalLitros,
      mediaDiaria: duracaoDias > 0 ? totalLitros / duracaoDias : totalLitros,
      duracaoDias,
      registros: items.sort(
        (a, b) =>
          new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime(),
      ),
    });
  }

  return grupos.sort((a, b) => {
    if (a.lactacaoId == null) return 1;
    if (b.lactacaoId == null) return -1;
    const aStart = a.dataInicio ?? "";
    const bStart = b.dataInicio ?? "";
    return bStart.localeCompare(aStart);
  });
}

export function formatLactacaoFilterLabel(
  lact: Lactacao,
  animalLabel?: string,
): string {
  const animalPart = animalLabel ? `${animalLabel} — ` : "";
  return `${animalPart}Lactação #${lact.numero_lactacao} (desde ${formatDatePtBr(lact.data_inicio)})`;
}
