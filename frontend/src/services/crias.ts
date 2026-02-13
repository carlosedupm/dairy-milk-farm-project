import api, { type ApiResponse } from "./api";

export type Cria = { id: number; parto_id: number; sexo: string; condicao: string; created_at: string; };

export async function listByParto(partoId: number): Promise<Cria[]> {
  const { data } = await api.get<ApiResponse<Cria[]>>("/api/v1/crias", { params: { parto_id: partoId } });
  return data.data ?? [];
}
