/**
 * Matriz perfil → áreas da aplicação. Manter alinhado com
 * backend/internal/auth/perfil_access.go ao alterar permissões.
 */

import {
  MOTIVOS_SAIDA,
  MOTIVO_SAIDA_LABELS,
  type MotivoSaida,
} from "@/services/animais";

export type AppArea =
  | "fazendas"
  | "animais"
  | "alertas"
  | "producao"
  | "lotes"
  | "agricultura"
  | "gestao"
  | "folgas";

/** Ordem dos itens no menu principal (exceto Fazendas/Admin/Dev, tratados à parte). */
export const MAIN_NAV_AREA_ORDER: AppArea[] = [
  "animais",
  "alertas",
  "producao",
  "lotes",
  "agricultura",
  "gestao",
  "folgas",
];

const AREA_PATH_PREFIX: Record<AppArea, string> = {
  fazendas: "/fazendas",
  animais: "/animais",
  alertas: "/alertas",
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
  alertas: "Alertas",
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
  FUNCIONARIO: ["animais", "alertas", "gestao", "folgas"],
};

export type AreasMode = AppArea[] | "full" | "pending";

export function getAreasMode(perfil: string | undefined): AreasMode {
  if (!perfil) return "full";
  if (perfil === "ADMIN" || perfil === "DEVELOPER") return "full";
  if (perfil === "USER") return "pending";
  const list = PERFIL_AREAS[perfil];
  if (!list || list.length === 0) return "full";
  return list;
}

export function getNavAreasForPerfil(perfil: string | undefined): AppArea[] {
  const mode = getAreasMode(perfil);
  if (mode === "full") return [...MAIN_NAV_AREA_ORDER];
  if (mode === "pending") return [];
  return MAIN_NAV_AREA_ORDER.filter((a) => mode.includes(a));
}

export function getDefaultLandingPath(perfil: string | undefined): string {
  if (perfil === "FUNCIONARIO") return "/";
  const mode = getAreasMode(perfil);
  if (mode === "pending") return "/onboarding";
  if (mode === "full") return "/";
  if (mode.length === 0) return "/folgas";
  const first = MAIN_NAV_AREA_ORDER.find((a) => mode.includes(a));
  return first ? AREA_PATH_PREFIX[first] : `/${mode[0]}`;
}

/** Gestão pecuária parcial; API de crias (GET|POST /api/v1/crias) espelhada em perfil_access.go. */
const FUNCIONARIO_GESTAO_PATHS = [
  "/gestao",
  "/gestao/cios",
  "/gestao/coberturas",
  "/gestao/toques",
  "/gestao/partos",
  "/gestao/secagens",
  "/gestao/gestacoes",
  "/gestao/lactacoes",
  "/gestao/hormonios-lactacao",
] as const;

function isFuncionarioAllowedPath(path: string): boolean {
  if (path === "/") return true;
  if (path === "/animais") return true;
  if (path === "/animais/baixa") return true;
  if (/^\/animais\/\d+$/.test(path)) return true;
  if (/^\/animais\/\d+\/saude(\/novo|\/editar\/\d+)?$/.test(path)) return true;
  if (/^\/animais\/\d+\/vacinas(\/novo|\/editar\/\d+)?$/.test(path)) return true;
  if (/^\/animais\/\d+\/producao$/.test(path)) return true;
  if (/^\/animais\/\d+\/hormonios-lactacao(\/novo|\/\d+\/editar)?$/.test(path))
    return true;
  if (path === "/producao/novo") return true;
  if (/^\/producao\/\d+\/editar$/.test(path)) return true;
  if (path === "/folgas" || path.startsWith("/folgas/")) return true;
  if (path === "/alertas" || path.startsWith("/alertas/")) return true;
  return FUNCIONARIO_GESTAO_PATHS.some(
    (base) => path === base || path.startsWith(`${base}/`)
  );
}

/**
 * Aceita apenas paths internos da aplicação como destino de redirect.
 * Bloqueia open redirect: URLs absolutas ("https://..."), protocol-relative ("//evil.com")
 * e truques com backslash ("/\evil.com").
 */
export function isSafeInternalPath(path: string | null | undefined): boolean {
  if (!path) return false;
  if (!path.startsWith("/")) return false;
  if (path.startsWith("//")) return false;
  if (path.includes("\\")) return false;
  return true;
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
  if (perfil === "FUNCIONARIO") return isFuncionarioAllowedPath(path);

  const mode = getAreasMode(perfil);
  if (mode === "pending") {
    return path === "/" || path === "/fazendas";
  }

  if (mode === "full") return true;

  const prefixes = mode.map((a) => AREA_PATH_PREFIX[a]);
  if (path === "/") return false;

  return prefixes.some(
    (p) => path === p || path.startsWith(`${p}/`)
  );
}

export function showAssistenteForPerfil(perfil: string | undefined): boolean {
  return isAssistenteEnabledForPerfil(perfil);
}

export function canRegistrarProducao(perfil: string | undefined): boolean {
  return isPathAllowedForPerfil(perfil, "/producao/novo");
}

/** PUT /api/v1/producao/:id — exceto FUNCIONARIO e USER (BR-CICLO-019 read-only). */
export function canEditarProducao(perfil: string | undefined): boolean {
  if (!perfil || perfil === "USER" || perfil === "FUNCIONARIO") return false;
  return true;
}

export function canRegistrarBaixa(perfil: string | undefined): boolean {
  if (!perfil) return false;
  if (perfil === "USER") return false;
  if (perfil === "FUNCIONARIO") return true;
  return true;
}

export function canReverterBaixa(perfil: string | undefined): boolean {
  if (!perfil) return false;
  if (perfil === "FUNCIONARIO" || perfil === "USER") return false;
  return true;
}

/** POST /api/v1/animais/:id/saude — FUNCIONARIO e perfis operacionais. */
export function canCriarRegistroSaude(perfil: string | undefined): boolean {
  if (!perfil || perfil === "USER") return false;
  return true;
}

/** PUT /api/v1/animais/:id/saude/:saudeId — exceto FUNCIONARIO e USER. */
export function canEditarRegistroSaude(perfil: string | undefined): boolean {
  if (!perfil || perfil === "USER" || perfil === "FUNCIONARIO") return false;
  return true;
}

/** DELETE /api/v1/animais/:id/saude/:saudeId — mesma matriz que editar. */
export function canExcluirRegistroSaude(perfil: string | undefined): boolean {
  return canEditarRegistroSaude(perfil);
}

/** POST /api/v1/animais/:id/vacinas — FUNCIONARIO e perfis operacionais (BR-SAUDE-007). */
export function canCriarVacina(perfil: string | undefined): boolean {
  if (!perfil || perfil === "USER") return false;
  return true;
}

/** Agendar vacina prevista (POST sem data_aplicacao) — GERENTE+ (decisão G1 #4 do BRF-001). */
export function canAgendarVacina(perfil: string | undefined): boolean {
  if (!perfil || perfil === "USER" || perfil === "FUNCIONARIO") return false;
  return true;
}

/** PATCH /api/v1/animais/:id/vacinas/:vacinaId/aplicar — FUNCIONARIO e perfis operacionais. */
export function canAplicarVacina(perfil: string | undefined): boolean {
  return canCriarVacina(perfil);
}

/** PUT /api/v1/animais/:id/vacinas/:vacinaId — exceto FUNCIONARIO e USER. */
export function canEditarVacina(perfil: string | undefined): boolean {
  if (!perfil || perfil === "USER" || perfil === "FUNCIONARIO") return false;
  return true;
}

/** DELETE /api/v1/animais/:id/vacinas/:vacinaId — mesma matriz que editar. */
export function canExcluirVacina(perfil: string | undefined): boolean {
  return canEditarVacina(perfil);
}

/** POST hormônios lactação — FUNCIONARIO+ (BR-ACESSO-025). */
export function canCriarHormonioLactacao(perfil: string | undefined): boolean {
  if (!perfil || perfil === "USER") return false;
  return true;
}

/** PUT/DELETE aplicações — GERENTE+ (BR-ACESSO-025). */
export function canEditarHormonioLactacao(perfil: string | undefined): boolean {
  if (!perfil || perfil === "USER" || perfil === "FUNCIONARIO") return false;
  return true;
}

export function canExcluirHormonioLactacao(perfil: string | undefined): boolean {
  return canEditarHormonioLactacao(perfil);
}

/** PATCH encerrar protocolo — GERENTE+ (BR-ACESSO-025). */
export function canEncerrarProtocoloHormonio(perfil: string | undefined): boolean {
  return canEditarHormonioLactacao(perfil);
}

/** POST /api/v1/fazendas/:id/alertas — GERENTE, GESTAO, PROPRIETARIO, ADMIN, DEVELOPER. */
export function canCriarAlertaManual(perfil: string | undefined): boolean {
  if (!perfil || perfil === "USER" || perfil === "FUNCIONARIO") return false;
  return true;
}

/** DELETE /api/v1/fazendas/:id/alertas/:id — GERENTE+. */
export function canExcluirAlerta(perfil: string | undefined): boolean {
  return canCriarAlertaManual(perfil);
}

/** PATCH status → RESOLVIDO | IGNORADO — GERENTE+. */
export function canResolverAlerta(perfil: string | undefined): boolean {
  return canCriarAlertaManual(perfil);
}

/** PATCH status ABERTO → EM_ANDAMENTO — FUNCIONARIO+. */
export function canMarcarAlertaEmAndamento(perfil: string | undefined): boolean {
  if (!perfil || perfil === "USER") return false;
  return true;
}

export function motivosBaixaParaPerfil(
  perfil: string | undefined
): MotivoSaida[] {
  if (perfil === "FUNCIONARIO") return ["MORTE"];
  return [...MOTIVOS_SAIDA];
}

export function showConformidadePanelForPerfil(
  perfil: string | undefined
): boolean {
  if (!perfil) return false;
  if (perfil === "FUNCIONARIO" || perfil === "USER") return false;
  const mode = getAreasMode(perfil);
  if (mode === "pending") return false;
  return true;
}

export function showKpiGridForPerfil(perfil: string | undefined): boolean {
  if (!perfil) return false;
  if (perfil === "USER") return false;
  if (perfil === "FUNCIONARIO") return true;
  const mode = getAreasMode(perfil);
  if (mode === "pending") return false;
  return true;
}

export function showPecuarioResumoPanelForPerfil(
  perfil: string | undefined
): boolean {
  if (!perfil) return false;
  if (perfil === "USER") return false;
  if (perfil === "FUNCIONARIO") return true;
  const mode = getAreasMode(perfil);
  if (mode === "pending") return false;
  return true;
}

/**
 * Capacidades futuras do assistente para liberação gradual por negócio.
 * Neste momento não há capacidades liberadas para FUNCIONARIO.
 */
export type AssistenteCapability =
  | "assistente.consulta"
  | "assistente.folgas"
  | "assistente.gestao";

const PERFIL_ASSISTENTE_CAPABILITIES: Partial<
  Record<string, AssistenteCapability[]>
> = {
  FUNCIONARIO: ["assistente.consulta"],
};

export function isAssistenteEnabledForPerfil(
  perfil: string | undefined,
  requiredCapabilities: AssistenteCapability[] = []
): boolean {
  if (!perfil) return false;
  if (perfil === "ADMIN" || perfil === "DEVELOPER") return true;
  if (perfil === "USER") return false;

  const allowed = PERFIL_ASSISTENTE_CAPABILITIES[perfil];
  if (perfil === "FUNCIONARIO") {
    if (!allowed || allowed.length === 0) return false;
    return requiredCapabilities.every((cap) => allowed.includes(cap));
  }

  const mode = getAreasMode(perfil);
  if (mode === "pending") return false;
  const baseAllowed = mode === "full" ? true : mode.some((a) => a !== "folgas");
  if (!baseAllowed) return false;

  if (!requiredCapabilities.length) return true;
  if (!allowed || allowed.length === 0) return false;
  return requiredCapabilities.every((cap) => allowed.includes(cap));
}
