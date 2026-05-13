/** Rótulos de perfil (alinhado ao backend `usuarios.perfil`). */

export const PERFIS_DISPONIVEIS = [
  { value: "USER", label: "Usuário" },
  { value: "FUNCIONARIO", label: "Funcionário" },
  { value: "GERENTE", label: "Gerente" },
  { value: "GESTAO", label: "Gestão" },
  { value: "PROPRIETARIO", label: "Proprietário (titular da fazenda)" },
  { value: "ADMIN", label: "Administrador da plataforma" },
  { value: "DEVELOPER", label: "Developer" },
] as const;

/** Rótulo curto para header e UI compacta (sem o texto longo do select admin). */
export const PERFIL_LABEL: Record<string, string> = {
  USER: "Usuário",
  FUNCIONARIO: "Funcionário",
  GERENTE: "Gerente",
  GESTAO: "Gestão",
  PROPRIETARIO: "Proprietário",
  ADMIN: "Administrador",
  DEVELOPER: "Developer",
};

export function getPerfilLabel(perfil: string | undefined): string {
  if (!perfil) return "—";
  return PERFIL_LABEL[perfil] ?? perfil;
}
