import api, { type ApiResponse } from "./api";

export type Gestacao = {
  id: number;
  animal_id: number;
  cobertura_id: number;
  data_confirmacao: string;
  data_prevista_parto?: string | null;
  status: string;
  fazenda_id: number;
  created_at: string;
  updated_at: string;
};

export async function listByFazenda(fazendaId: number): Promise<Gestacao[]> {
  const { data } = await api.get<ApiResponse<Gestacao[]>>("/api/v1/gestacoes", { params: { fazenda_id: fazendaId } });
  return data.data ?? [];
}

export async function get(id: number): Promise<Gestacao | null> {
  const { data } = await api.get<ApiResponse<Gestacao>>(`/api/v1/gestacoes/${id}`);
  return data.data ?? null;
}
