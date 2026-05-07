import api, { type ApiResponse } from "./api";

export type Parto = {
  id: number;
  animal_id: number;
  data: string;
  numero_crias: number;
  fazenda_id: number;
  created_at: string;
  gestacao_id?: number | null;
  tipo?: string | null;
  complicacoes?: string | null;
  observacoes?: string | null;
};

/** Linha de cria no POST /partos com `crias[]` (transação única com o parto). */
export type PartoCriaInput = {
  sexo: string;
  condicao: string;
  peso?: number | null;
  observacoes?: string | null;
  animal_identificacao?: string | null;
  animal_raca?: string | null;
};

export type PartoCreate = {
  animal_id: number;
  data: string;
  fazenda_id: number;
  gestacao_id?: number | null;
  tipo?: string | null;
  numero_crias?: number | null;
  complicacoes?: string | null;
  observacoes?: string | null;
  /** Se presente e não vazio, grava parto + crias numa única transação no backend. */
  crias?: PartoCriaInput[];
};

export async function listByFazenda(fazendaId: number): Promise<Parto[]> {
  const { data } = await api.get<ApiResponse<Parto[]>>("/api/v1/partos", { params: { fazenda_id: fazendaId } });
  return data.data ?? [];
}

export async function create(payload: PartoCreate): Promise<Parto> {
  const { data } = await api.post<ApiResponse<Parto>>("/api/v1/partos", payload);
  if (!data.data) throw new Error("Resposta invalida");
  return data.data;
}

export async function get(id: number): Promise<Parto> {
  const { data } = await api.get<ApiResponse<Parto>>(`/api/v1/partos/${id}`);
  if (!data.data) throw new Error("Resposta invalida");
  return data.data;
}

export async function update(id: number, payload: PartoCreate): Promise<Parto> {
  const { data } = await api.put<ApiResponse<Parto>>(`/api/v1/partos/${id}`, payload);
  if (!data.data) throw new Error("Resposta invalida");
  return data.data;
}

export async function remove(id: number): Promise<void> {
  await api.delete<ApiResponse<unknown>>(`/api/v1/partos/${id}`);
}
