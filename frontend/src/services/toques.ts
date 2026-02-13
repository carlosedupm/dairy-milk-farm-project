import api, { type ApiResponse } from "./api";

export type DiagnosticoGestacao = {
  id: number;
  animal_id: number;
  data: string;
  resultado: string;
  fazenda_id: number;
  created_at: string;
};

export type DiagnosticoGestacaoCreate = {
  animal_id: number;
  data: string;
  resultado: string;
  fazenda_id: number;
  cobertura_id?: number | null;
  dias_gestacao_estimados?: number | null;
  metodo?: string | null;
  veterinario?: string | null;
  observacoes?: string | null;
};

export async function listByFazenda(fazendaId: number): Promise<DiagnosticoGestacao[]> {
  const { data } = await api.get<ApiResponse<DiagnosticoGestacao[]>>("/api/v1/toques", { params: { fazenda_id: fazendaId } });
  return data.data ?? [];
}

export async function create(payload: DiagnosticoGestacaoCreate): Promise<DiagnosticoGestacao> {
  const { data } = await api.post<ApiResponse<DiagnosticoGestacao>>("/api/v1/toques", payload);
  if (!data.data) throw new Error("Resposta invalida");
  return data.data;
}
