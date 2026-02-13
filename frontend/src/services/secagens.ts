import api, { type ApiResponse } from "./api";

export type Secagem = { id: number; animal_id: number; data_secagem: string; fazenda_id: number; created_at: string; };

export type SecagemCreate = {
  animal_id: number;
  data_secagem: string;
  fazenda_id: number;
  gestacao_id?: number | null;
  data_prevista_parto?: string | null;
  protocolo?: string | null;
  motivo?: string | null;
  observacoes?: string | null;
};

export async function listByFazenda(fazendaId: number): Promise<Secagem[]> {
  const { data } = await api.get<ApiResponse<Secagem[]>>("/api/v1/secagens", { params: { fazenda_id: fazendaId } });
  return data.data ?? [];
}

export async function create(payload: SecagemCreate): Promise<Secagem> {
  const { data } = await api.post<ApiResponse<Secagem>>("/api/v1/secagens", payload);
  if (!data.data) throw new Error("Resposta invalida");
  return data.data;
}
