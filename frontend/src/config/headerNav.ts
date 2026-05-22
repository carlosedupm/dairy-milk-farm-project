/**
 * Agrupamento visual do menu do Header (sem alterar permissões em appAccess).
 */

import {
  getNavAreasForPerfil,
  AREA_LABEL,
  type AppArea,
} from "@/config/appAccess";

/** Áreas sempre visíveis como links no desktop (ordem de MAIN_NAV_AREA_ORDER). */
const PRINCIPAL_AREA_ORDER: AppArea[] = [
  "animais",
  "producao",
  "gestao",
  "folgas",
];

export type HeaderNavSystemId = "fazendas" | "admin" | "dev-studio";

export type HeaderNavSystemItem = {
  type: "system";
  id: HeaderNavSystemId;
  href: string;
  label: string;
};

export type HeaderNavAreaItem = {
  type: "area";
  area: AppArea;
};

export type HeaderNavGroups = {
  principal: AppArea[];
  mais: AppArea[];
  sistema: HeaderNavSystemItem[];
};

export const HEADER_NAV_SYSTEM_LABEL: Record<HeaderNavSystemId, string> = {
  fazendas: AREA_LABEL.fazendas,
  admin: "Admin",
  "dev-studio": "Dev Studio",
};

function buildSistemaItems(perfil: string | undefined): HeaderNavSystemItem[] {
  const items: HeaderNavSystemItem[] = [];
  if (perfil === "ADMIN" || perfil === "DEVELOPER") {
    items.push({
      type: "system",
      id: "fazendas",
      href: "/fazendas",
      label: HEADER_NAV_SYSTEM_LABEL.fazendas,
    });
    items.push({
      type: "system",
      id: "admin",
      href: "/admin/usuarios",
      label: HEADER_NAV_SYSTEM_LABEL.admin,
    });
  }
  if (perfil === "DEVELOPER") {
    items.push({
      type: "system",
      id: "dev-studio",
      href: "/dev-studio",
      label: HEADER_NAV_SYSTEM_LABEL["dev-studio"],
    });
  }
  return items;
}

/**
 * Divide as áreas permitidas ao perfil em grupos Principal / Mais e itens de Sistema.
 */
export function getHeaderNavGroups(
  perfil: string | undefined
): HeaderNavGroups {
  const navAreas = getNavAreasForPerfil(perfil);
  const principalSet = new Set(PRINCIPAL_AREA_ORDER);
  const principal = PRINCIPAL_AREA_ORDER.filter((a) => navAreas.includes(a));
  const mais = navAreas.filter((a) => !principalSet.has(a));
  return {
    principal,
    mais,
    sistema: buildSistemaItems(perfil),
  };
}

/** Prefixo de rota para item de sistema (ex.: Admin cobre /admin/*). */
export function getSystemItemPathPrefix(item: HeaderNavSystemItem): string {
  if (item.id === "admin") return "/admin";
  return item.href;
}
