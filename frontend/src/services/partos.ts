import api, { type ApiResponse } from "./api";

export type Parto = { id: number; animal_id: number; data: string; numero_crias: number; fazenda_id: number; created_at: string; };

export type PartoCreate = {
  animal_id: number;
  data: string;
  fazenda_id: number;
  gestacao_id?: number | null;
  tipo?: string | null;
  numero_crias?: number | null;
  complicacoes?: string | null;
  observacoes?: string | null;
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
