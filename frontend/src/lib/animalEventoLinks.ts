/**
 * Mapper único de links da timeline (Histórico / Ciclo / mini-preview).
 * BR-CICLO-019 / BR-ANIMAIS-013 — ver docs/briefings/BRF-008.
 */

import { isPathAllowedForPerfil } from "@/config/appAccess";

export type TimelineLinkItem = {
  tipo: string;
  ref_id?: number | null;
};

/**
 * Resolve o path de detalhe/edição para um item da timeline.
 * Retorna null quando não há link (ref_id ausente, BAIXA, ou path não permitido ao perfil).
 */
export function timelineItemHref(
  animalId: number,
  item: TimelineLinkItem,
  perfil: string | undefined
): string | null {
  const tipo = item.tipo?.toUpperCase?.() ?? item.tipo;
  if (tipo === "BAIXA") return null;
  if (tipo === "ALERTA") {
    return isPathAllowedForPerfil(perfil, "/alertas") ? "/alertas" : null;
  }

  const refId = item.ref_id;
  if (refId == null || refId <= 0) return null;

  let href: string | null = null;
  switch (tipo) {
    case "CIO":
      href = `/gestao/cios/${refId}/editar`;
      break;
    case "COBERTURA":
      href = `/gestao/coberturas/${refId}/editar`;
      break;
    case "PARTO":
      href = `/gestao/partos/${refId}/editar`;
      break;
    case "PRODUCAO":
      href = `/producao/${refId}/editar`;
      break;
    case "SAUDE":
      href = `/animais/${animalId}/saude/editar/${refId}`;
      break;
    case "VACINA":
      href = `/animais/${animalId}/vacinas/editar/${refId}`;
      break;
    case "HORMONIO_LACTACAO":
      href = `/animais/${animalId}/hormonios-lactacao/${refId}/editar`;
      break;
    case "TOQUE":
      href = `/gestao/toques/${refId}/editar`;
      break;
    case "GESTACAO":
      href = `/gestao/gestacoes/${refId}/editar`;
      break;
    case "SECAGEM":
      href = `/gestao/secagens/${refId}/editar`;
      break;
    case "LACTACAO":
      href = `/gestao/lactacoes/${refId}/editar`;
      break;
    default:
      return null;
  }

  return isPathAllowedForPerfil(perfil, href) ? href : null;
}
