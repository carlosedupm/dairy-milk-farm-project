import { isPathAllowedForPerfil } from "@/config/appAccess";
import type { ProximaAcao } from "@/services/animais";

export const PROXIMA_ACAO_MAX_VISIBLE = 2;

const PROXIMA_ACAO_PRIORITY: string[] = [
  "REGISTRAR_PARTO",
  "REGISTRAR_SECAGEM",
  "REGISTRAR_COBERTURA",
  "REGISTRAR_TOQUE",
  "REGISTRAR_PRODUCAO",
];

/** Ordena e limita (defensivo; o backend já devolve no máximo 2). */
export function takeProximasAcoes(
  acoes: ProximaAcao[],
  max = PROXIMA_ACAO_MAX_VISIBLE
): ProximaAcao[] {
  if (acoes.length === 0 || max <= 0) return [];
  const rank = new Map(PROXIMA_ACAO_PRIORITY.map((c, i) => [c, i]));
  const sorted = [...acoes].sort((a, b) => {
    const ra = rank.get(a.codigo) ?? PROXIMA_ACAO_PRIORITY.length;
    const rb = rank.get(b.codigo) ?? PROXIMA_ACAO_PRIORITY.length;
    return ra - rb;
  });
  return sorted.slice(0, max);
}

export function canProximaAcao(
  perfil: string | undefined,
  acao: ProximaAcao
): boolean {
  if (!perfil) return false;
  return isPathAllowedForPerfil(perfil, acao.href_path);
}
