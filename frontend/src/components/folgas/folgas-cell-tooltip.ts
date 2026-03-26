import type { EscalaFolga, FolgasRodizioDia } from "@/services/folgas";
import { labelRodizioPrevisto } from "./folgas-rodizio-utils";

type BuildTooltipParams = {
  /** Entradas a descrever no tooltip (pode ser o dia completo na gestão com filtro ativo). */
  entradas: EscalaFolga[];
  rodizioDia?: FolgasRodizioDia | null;
  excecaoMotivoDia: string | null;
  /** Se a exceção do dia entra no texto (regras de perfil / filtro). */
  incluirExcecao: boolean;
  canManage: boolean;
  isFuncionario: boolean;
  userId: number | undefined;
};

/** Texto para tooltip ao passar o mouse na célula (motivos e exceção visíveis ao perfil). */
export function buildFolgasCellTooltipText({
  entradas,
  rodizioDia,
  excecaoMotivoDia,
  incluirExcecao,
  canManage,
  isFuncionario,
  userId,
}: BuildTooltipParams): string | null {
  const blocos: string[] = [];

  const prev = labelRodizioPrevisto(rodizioDia ?? undefined);
  if (prev) blocos.push(prev);

  for (const e of entradas) {
    const nome = e.usuario_nome || `Usuário #${e.usuario_id}`;
    const podeVerMotivo =
      canManage || (isFuncionario && userId != null && e.usuario_id === userId);
    if (podeVerMotivo && e.motivo?.trim()) {
      blocos.push(`${nome}\nMotivo: ${e.motivo.trim()}`);
    } else {
      let linha = nome;
      if (e.origem === "MANUAL") linha += " (ajuste manual)";
      if (e.justificada) linha += " — justificada";
      blocos.push(linha);
    }
  }

  if (incluirExcecao && excecaoMotivoDia?.trim()) {
    blocos.push(`Exceção do dia:\n${excecaoMotivoDia.trim()}`);
  }

  if (blocos.length === 0) return null;
  return blocos.join("\n\n—\n\n");
}
