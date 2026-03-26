/**
 * Matriz perfil → áreas da aplicação. Manter alinhado com
 * backend/internal/auth/perfil_access.go ao alterar permissões.
 */

export type AppArea =
  | "fazendas"
  | "animais"
  | "producao"
  | "lotes"
  | "agricultura"
  | "gestao"
  | "folgas";

/** Ordem dos itens no menu principal (exceto Fazendas/Admin/Dev, tratados à parte). */
export const MAIN_NAV_AREA_ORDER: AppArea[] = [
  "animais",
  "producao",
  "lotes",
  "agricultura",
  "gestao",
  "folgas",
];

const AREA_PATH_PREFIX: Record<AppArea, string> = {
  fazendas: "/fazendas",
  animais: "/animais",
  producao: "/producao",
  lotes: "/lotes",
  agricultura: "/agricultura",
  gestao: "/gestao",
  folgas: "/folgas",
};

export function getAreaHref(area: AppArea): string {
  return AREA_PATH_PREFIX[area];
}

/** Labels para o menu (ícones ficam no Header). */
export const AREA_LABEL: Record<AppArea, string> = {
  fazendas: "Fazendas",
  animais: "Animais",
  producao: "Produção",
  lotes: "Lotes",
  agricultura: "Agricultura",
  gestao: "Gestão",
  folgas: "Folgas",
};

/**
 * Perfis com lista explícita: apenas essas áreas. Ausente = acesso a todas as áreas.
 */
export const PERFIL_AREAS: Partial<Record<string, AppArea[]>> = {
  FUNCIONARIO: ["folgas"],
};

export type AreasMode = AppArea[] | "full";

export function getAreasMode(perfil: string | undefined): AreasMode {
  if (!perfil) return "full";
  if (perfil === "ADMIN" || perfil === "DEVELOPER") return "full";
  const list = PERFIL_AREAS[perfil];
  if (!list || list.length === 0) return "full";
  return list;
}

export function getNavAreasForPerfil(perfil: string | undefined): AppArea[] {
  const mode = getAreasMode(perfil);
  if (mode === "full") return [...MAIN_NAV_AREA_ORDER];
  return MAIN_NAV_AREA_ORDER.filter((a) => mode.includes(a));
}

export function getDefaultLandingPath(perfil: string | undefined): string {
  const mode = getAreasMode(perfil);
  if (mode === "full") return "/";
  if (mode.length === 0) return "/folgas";
  const first = MAIN_NAV_AREA_ORDER.find((a) => mode.includes(a));
  return first ? AREA_PATH_PREFIX[first] : `/${mode[0]}`;
}

const PUBLIC_PATHS = new Set(["/login", "/registro"]);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  return false;
}

/** Rotas autenticadas úteis fora das áreas (onboarding, seleção de fazenda). */
function isAuthUtilityPath(pathname: string): boolean {
  if (pathname === "/onboarding") return true;
  if (pathname.startsWith("/fazendas/selecionar")) return true;
  return false;
}

/**
 * Indica se o caminho pode ser exibido para o perfil (utilizador autenticado).
 */
export function isPathAllowedForPerfil(
  perfil: string | undefined,
  pathname: string
): boolean {
  const path = pathname.split("?")[0] ?? pathname;
  if (isPublicPath(path)) return true;
  if (isAuthUtilityPath(path)) return true;

  const mode = getAreasMode(perfil);
  if (mode === "full") return true;

  const prefixes = mode.map((a) => AREA_PATH_PREFIX[a]);
  if (path === "/") return false;

  return prefixes.some(
    (p) => path === p || path.startsWith(`${p}/`)
  );
}

export function showAssistenteForPerfil(perfil: string | undefined): boolean {
  const mode = getAreasMode(perfil);
  if (mode === "full") return true;
  return mode.some((a) => a !== "folgas");
}
