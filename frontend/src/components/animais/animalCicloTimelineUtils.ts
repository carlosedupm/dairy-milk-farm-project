import {
  Baby,
  BarChart3,
  Droplets,
  Eye,
  Link2,
  LogOut,
  PauseCircle,
  PartyPopper,
  Search,
  type LucideIcon,
} from "lucide-react";
import type { ProximaAcao } from "@/services/animais";

export type CicloTimelineTipo =
  | "CIO"
  | "COBERTURA"
  | "TOQUE"
  | "GESTACAO"
  | "SECAGEM"
  | "PARTO"
  | "LACTACAO"
  | "PRODUCAO"
  | "BAIXA";

export type CicloMarcoStatus = "concluido" | "previsto";

const CICLO_TIPO_ICONS: Record<CicloTimelineTipo, LucideIcon> = {
  CIO: Eye,
  COBERTURA: Link2,
  TOQUE: Search,
  GESTACAO: Baby,
  SECAGEM: PauseCircle,
  PARTO: PartyPopper,
  LACTACAO: Droplets,
  PRODUCAO: BarChart3,
  BAIXA: LogOut,
};

const CICLO_TIPO_LABELS: Record<CicloTimelineTipo, string> = {
  CIO: "Cio",
  COBERTURA: "Cobertura",
  TOQUE: "Toque",
  GESTACAO: "Gestação",
  SECAGEM: "Secagem",
  PARTO: "Parto",
  LACTACAO: "Lactação",
  PRODUCAO: "Produção",
  BAIXA: "Baixa",
};

/** Tipos fora da sequência reprodutiva principal (BR-CICLO-008). */
const TIPOS_SECUNDARIOS = new Set<CicloTimelineTipo>(["PRODUCAO", "BAIXA"]);

const PROXIMA_ACAO_TO_TIPO: Record<string, CicloTimelineTipo> = {
  REGISTRAR_TOQUE: "TOQUE",
  REGISTRAR_COBERTURA: "COBERTURA",
  REGISTRAR_SECAGEM: "SECAGEM",
  REGISTRAR_PARTO: "PARTO",
  REGISTRAR_PRODUCAO: "PRODUCAO",
  REGISTRAR_BAIXA: "BAIXA",
};

export function isCicloTimelineTipo(tipo: string): tipo is CicloTimelineTipo {
  return tipo in CICLO_TIPO_ICONS;
}

export function getCicloTipoIcon(tipo: string): LucideIcon {
  if (isCicloTimelineTipo(tipo)) {
    return CICLO_TIPO_ICONS[tipo];
  }
  return Eye;
}

export function getCicloTipoLabel(tipo: string): string {
  if (isCicloTimelineTipo(tipo)) {
    return CICLO_TIPO_LABELS[tipo];
  }
  return tipo;
}

export function isTipoSecundario(tipo: string): boolean {
  return isCicloTimelineTipo(tipo) && TIPOS_SECUNDARIOS.has(tipo);
}

export function proximaAcaoToTipo(acao: ProximaAcao): CicloTimelineTipo {
  return PROXIMA_ACAO_TO_TIPO[acao.codigo] ?? "COBERTURA";
}

export type CicloMarcoPrevisto = {
  status: "previsto";
  tipo: CicloTimelineTipo;
  titulo: string;
  hrefPath: string;
  codigo: string;
};

export type CicloMarcoConcluido = {
  status: "concluido";
  tipo: string;
  data: string;
  titulo: string;
  detalhe?: string;
  registrado_por?: string;
  ref_id?: number;
};

export type CicloMarco = CicloMarcoPrevisto | CicloMarcoConcluido;

export function buildMarcosPrevistos(acoes: ProximaAcao[]): CicloMarcoPrevisto[] {
  return acoes.map((acao) => ({
    status: "previsto" as const,
    tipo: proximaAcaoToTipo(acao),
    titulo: acao.label,
    hrefPath: acao.href_path,
    codigo: acao.codigo,
  }));
}
