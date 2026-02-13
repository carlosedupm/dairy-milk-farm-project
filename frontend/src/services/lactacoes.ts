import api, { type ApiResponse } from "./api";

export type Lactacao = { id: number; animal_id: number; numero_lactacao: number; data_inicio: string; fazenda_id: number; created_at: string; updated_at: string; };

export type LactacaoCreate = {
  animal_id: number;
  numero_lactacao: number;
  data_inicio: string;
  fazenda_id: number;
  parto_id?: number | null;
  status?: string | null;
};

export async function listByFazenda(fazendaId: number): Promise<Lactacao[]> {
  const { data } = await api.get<ApiResponse<Lactacao[]>>("/api/v1/lactacoes", { params: { fazenda_id: fazendaId } });
  return data.data ?? [];
}

export async function create(payload: LactacaoCreate): Promise<Lactacao> {
  const { data } = await api.post<ApiResponse<Lactacao>>("/api/v1/lactacoes", payload);
  if (!data.data) throw new Error("Resposta invalida");
  return data.data;
}
