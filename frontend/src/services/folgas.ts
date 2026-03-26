import api, { type ApiResponse } from "./api";

export type FolgasEscalaConfig = {
  fazenda_id: number;
  data_anchor: string;
  usuario_slot_0: number;
  usuario_slot_1: number;
  usuario_slot_2: number;
  updated_at: string;
};

export type EscalaFolga = {
  id: number;
  fazenda_id: number;
  data: string;
  usuario_id: number;
  origem: string;
  justificada: boolean;
  motivo?: string | null;
  excecao_motivo_dia?: string | null;
  observacoes?: string | null;
  created_by?: number | null;
  created_at: string;
  updated_at: string;
  usuario_nome?: string;
  rodizio_esperado_tem_folga?: boolean;
  rodizio_esperado_usuario_id?: number | null;
  rodizio_esperado_usuario_nome?: string | null;
};

export type FolgasRodizioDia = {
  data: string;
  tem_folga: boolean;
  usuario_id?: number | null;
  usuario_nome?: string | null;
};

export type FolgasEscalaListResponse = {
  linhas: EscalaFolga[];
  rodizio_por_dia: FolgasRodizioDia[];
};

export type FolgaEquidadeResumo = {
  usuario_id: number;
  usuario_nome: string;
  folgas_registradas: number;
  folgas_teoricas_auto: number;
  delta: number;
};

export type FolgaAlteracao = {
  id: number;
  fazenda_id: number;
  actor_id?: number | null;
  tipo: string;
  detalhes?: Record<string, unknown>;
  created_at: string;
};

export type FolgaAlertaDia = {
  data: string;
  quantidade_folga: number;
  motivo_alerta: string;
};

export type UsuarioVinculado = {
  id: number;
  nome: string;
  email: string;
  perfil: string;
};

export function podeGerenciarFolgas(perfil: string | undefined): boolean {
  return perfil === "ADMIN" || perfil === "DEVELOPER" || perfil === "GESTAO";
}

export async function listUsuariosVinculados(fazendaId: number): Promise<UsuarioVinculado[]> {
  const { data } = await api.get<ApiResponse<UsuarioVinculado[]>>(
    `/api/v1/fazendas/${fazendaId}/usuarios-vinculados`
  );
  return data.data ?? [];
}

export async function getFolgasConfig(fazendaId: number): Promise<FolgasEscalaConfig | null> {
  try {
    const { data } = await api.get<ApiResponse<FolgasEscalaConfig>>(
      `/api/v1/fazendas/${fazendaId}/folgas/config`
    );
    return data.data ?? null;
  } catch (e: unknown) {
    const err = e as { response?: { status?: number } };
    if (err.response?.status === 404) return null;
    throw e;
  }
}

export async function putFolgasConfig(
  fazendaId: number,
  payload: {
    data_anchor: string;
    usuario_slot_0: number;
    usuario_slot_1: number;
    usuario_slot_2: number;
  }
): Promise<FolgasEscalaConfig> {
  const { data } = await api.put<ApiResponse<FolgasEscalaConfig>>(
    `/api/v1/fazendas/${fazendaId}/folgas/config`,
    payload
  );
  if (!data.data) throw new Error("Resposta inválida");
  return data.data;
}

export async function getFolgasEscala(
  fazendaId: number,
  inicio: string,
  fim: string
): Promise<FolgasEscalaListResponse> {
  const { data } = await api.get<ApiResponse<FolgasEscalaListResponse>>(
    `/api/v1/fazendas/${fazendaId}/folgas/escala`,
    { params: { inicio, fim } }
  );
  const raw = data.data;
  if (!raw) return { linhas: [], rodizio_por_dia: [] };
  if (Array.isArray(raw)) {
    return { linhas: raw as EscalaFolga[], rodizio_por_dia: [] };
  }
  return {
    linhas: raw.linhas ?? [],
    rodizio_por_dia: raw.rodizio_por_dia ?? [],
  };
}

export async function getFolgasResumoEquidade(
  fazendaId: number,
  inicio: string,
  fim: string
): Promise<FolgaEquidadeResumo[]> {
  const { data } = await api.get<ApiResponse<FolgaEquidadeResumo[]>>(
    `/api/v1/fazendas/${fazendaId}/folgas/resumo-equidade`,
    { params: { inicio, fim } }
  );
  return data.data ?? [];
}

export async function postFolgasGerar(fazendaId: number, inicio: string, fim: string): Promise<void> {
  await api.post(`/api/v1/fazendas/${fazendaId}/folgas/gerar`, { inicio, fim });
}

export async function postFolgasAlteracao(
  fazendaId: number,
  body: {
    data: string;
    usuario_id: number;
    motivo: string;
    modo?: "substituir" | "adicionar";
    excecao_dia_motivo?: string;
  }
): Promise<void> {
  await api.post(`/api/v1/fazendas/${fazendaId}/folgas/alteracoes`, body);
}

export async function postFolgasJustificativa(
  fazendaId: number,
  body: { data: string; motivo: string }
): Promise<void> {
  await api.post(`/api/v1/fazendas/${fazendaId}/folgas/justificativas`, body);
}

export async function getFolgasAlteracoes(fazendaId: number, limit = 50): Promise<FolgaAlteracao[]> {
  const { data } = await api.get<ApiResponse<FolgaAlteracao[]>>(
    `/api/v1/fazendas/${fazendaId}/folgas/alteracoes`,
    { params: { limit } }
  );
  return data.data ?? [];
}

export async function getFolgasAlertas(
  fazendaId: number,
  inicio: string,
  fim: string
): Promise<FolgaAlertaDia[]> {
  const { data } = await api.get<ApiResponse<FolgaAlertaDia[]>>(
    `/api/v1/fazendas/${fazendaId}/folgas/alertas`,
    { params: { inicio, fim } }
  );
  return data.data ?? [];
}
