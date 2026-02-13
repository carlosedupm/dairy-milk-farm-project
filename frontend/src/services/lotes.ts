import api, { type ApiResponse } from "./api";

export type Lote = {
  id: number;
  nome: string;
  fazenda_id: number;
  tipo?: string | null;
  descricao?: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

export type LoteCreate = {
  nome: string;
  fazenda_id: number;
  tipo?: string | null;
  descricao?: string | null;
  ativo?: boolean;
};

export type LoteUpdate = {
  nome: string;
  tipo?: string | null;
  descricao?: string | null;
  ativo?: boolean;
};

export async function listByFazenda(fazendaId: number): Promise<Lote[]> {
  const { data } = await api.get<ApiResponse<Lote[]>>("/api/v1/lotes", { params: { fazenda_id: fazendaId } });
  return data.data ?? [];
}

export async function get(id: number): Promise<Lote | null> {
  const { data } = await api.get<ApiResponse<Lote>>(`/api/v1/lotes/${id}`);
  return data.data ?? null;
}

export async function create(payload: LoteCreate): Promise<Lote> {
  const { data } = await api.post<ApiResponse<Lote>>("/api/v1/lotes", payload);
  if (!data.data) throw new Error("Resposta invalida");
  return data.data;
}

export async function update(id: number, payload: LoteUpdate): Promise<Lote> {
  const { data } = await api.put<ApiResponse<Lote>>(`/api/v1/lotes/${id}`, payload);
  if (!data.data) throw new Error("Resposta invalida");
  return data.data;
}

export async function remove(id: number): Promise<void> {
  await api.delete(`/api/v1/lotes/${id}`);
}
