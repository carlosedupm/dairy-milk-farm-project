import type { EscalaFolga, FolgasRodizioDia } from "@/services/folgas";

export function labelRodizioPrevisto(r: FolgasRodizioDia | undefined): string | null {
  if (!r) return null;
  if (!r.tem_folga) return "Rodízio 5x1: sem folga neste dia do ciclo";
  const nome = r.usuario_nome?.trim();
  const id = r.usuario_id;
  if (nome) return `Rodízio 5x1: folga prevista para ${nome}`;
  if (id != null) return `Rodízio 5x1: folga prevista para usuário #${id}`;
  return "Rodízio 5x1: folga prevista";
}

/** Indica diferença entre o registrado na escala e o previsto pelo ciclo (informativo). */
export function divergeRegistradoDoRodizio(
  lista: EscalaFolga[],
  r: FolgasRodizioDia | undefined
): boolean {
  if (!r) return false;
  if (!r.tem_folga) return lista.length > 0;
  if (lista.length === 0) return true;
  const exp = r.usuario_id;
  if (exp == null) return lista.length > 0;
  const ids = new Set(lista.map((e) => e.usuario_id));
  if (lista.length === 1 && ids.size === 1) return lista[0].usuario_id !== exp;
  if (!ids.has(exp)) return true;
  return lista.length > 1;
}

/** Se, em modo substituir, gravar com esse usuario_id diverge do previsto. */
export function substituirDivergeDoRodizio(
  usuarioId: number,
  modo: "substituir" | "adicionar",
  r: FolgasRodizioDia | undefined
): boolean {
  if (modo !== "substituir" || !r) return false;
  if (!r.tem_folga) return usuarioId > 0;
  return r.usuario_id == null || usuarioId !== r.usuario_id;
}
