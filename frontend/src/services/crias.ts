import api, { type ApiResponse } from "./api";

export type Cria = {
  id: number;
  parto_id: number;
  animal_id?: number | null;
  sexo: string;
  condicao: string;
  peso?: number | null;
  observacoes?: string | null;
  created_at: string;
};

export type CriaCreatePayload = {
  parto_id: number;
  sexo: string;
  condicao: string;
  peso?: number | null;
  observacoes?: string | null;
  animal_identificacao?: string | null;
  animal_raca?: string | null;
};

export async function listByParto(partoId: number): Promise<Cria[]> {
  const { data } = await api.get<ApiResponse<Cria[]>>("/api/v1/crias", { params: { parto_id: partoId } });
  return data.data ?? [];
}

export async function create(payload: CriaCreatePayload): Promise<Cria> {
  const { data } = await api.post<ApiResponse<Cria>>("/api/v1/crias", payload);
  if (!data.data) throw new Error("Resposta invalida");
  return data.data as Cria;
}
