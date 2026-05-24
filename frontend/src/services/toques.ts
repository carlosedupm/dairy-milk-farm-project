import api, { type ApiResponse } from "./api";

export type DiagnosticoGestacao = {
  id: number;
  animal_id: number;
  data: string;
  resultado: string;
  classificacao_operacional?: string | null;
  dias_gestacao_estimados?: number | null;
  metodo?: string | null;
  veterinario?: string | null;
  observacoes?: string | null;
  fazenda_id: number;
  created_at: string;
};

export type DiagnosticoGestacaoCreate = {
  animal_id: number;
  data: string;
  fazenda_id: number;
  classificacao_operacional?: string;
  resultado?: string;
  cobertura_id?: number | null;
  dias_gestacao_estimados?: number | null;
  metodo?: string | null;
  veterinario?: string | null;
  observacoes?: string | null;
};

export type ToqueLoteItem = {
  identificacao: string;
  data: string;
  classificacao_operacional?: string;
  resultado?: string;
  cobertura_id?: number | null;
  dias_gestacao_estimados?: number | null;
  metodo?: string | null;
  veterinario?: string | null;
  observacoes?: string | null;
};

export type ToqueLoteFalha = {
  linha: number;
  identificacao: string;
  code: string;
  message: string;
  animal_ids?: number[];
};

export type ToqueLoteResultado = {
  total: number;
  sucesso: number;
  falhas: ToqueLoteFalha[];
  toques_criados: DiagnosticoGestacao[];
};

export type ListToquesParams = {
  fazendaId: number;
  dataDe?: string;
  dataAte?: string;
};

export async function listByFazenda(
  params: ListToquesParams
): Promise<DiagnosticoGestacao[]> {
  const query: Record<string, string | number> = {
    fazenda_id: params.fazendaId,
  };
  if (params.dataDe) query.data_de = params.dataDe;
  if (params.dataAte) query.data_ate = params.dataAte;
  const { data } = await api.get<ApiResponse<DiagnosticoGestacao[]>>(
    "/api/v1/toques",
    { params: query }
  );
  return data.data ?? [];
}

export async function create(
  payload: DiagnosticoGestacaoCreate
): Promise<DiagnosticoGestacao> {
  const { data } = await api.post<ApiResponse<DiagnosticoGestacao>>(
    "/api/v1/toques",
    payload
  );
  if (!data.data) throw new Error("Resposta invalida");
  return data.data;
}

export async function createLote(payload: {
  fazenda_id: number;
  itens: ToqueLoteItem[];
}): Promise<ToqueLoteResultado> {
  const { data } = await api.post<ApiResponse<ToqueLoteResultado>>(
    "/api/v1/toques/lote",
    payload
  );
  if (!data.data) throw new Error("Resposta invalida");
  return data.data;
}
