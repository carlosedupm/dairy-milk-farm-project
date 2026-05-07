import api, { type ApiResponse } from "./api";

export type Cobertura = {
  id: number;
  animal_id: number;
  tipo: string;
  data: string;
  fazenda_id: number;

  cio_id?: number | null;
  touro_animal_id?: number | null;
  touro_info?: string | null;
  semen_partida?: string | null;
  tecnico?: string | null;
  protocolo_id?: number | null;
  observacoes?: string | null;
  created_at: string;
  updated_at: string;
};

export async function listByFazenda(fazendaId: number): Promise<Cobertura[]> {
  const { data } = await api.get<ApiResponse<Cobertura[]>>(
    "/api/v1/coberturas",
    { params: { fazenda_id: fazendaId } },
  );
  return data.data ?? [];
}

export type CoberturaCreate = {
  animal_id: number;
  tipo: string;
  data: string;
  fazenda_id: number;
  cio_id?: number | null;
  touro_animal_id?: number | null;
  touro_info?: string | null;
  semen_partida?: string | null;
  tecnico?: string | null;
  protocolo_id?: number | null;
  observacoes?: string | null;
};

export async function get(id: number): Promise<Cobertura | null> {
  const { data } = await api.get<ApiResponse<Cobertura>>(
    `/api/v1/coberturas/${id}`,
  );
  return data.data ?? null;
}

export async function create(payload: CoberturaCreate): Promise<Cobertura> {
  const { data } = await api.post<ApiResponse<Cobertura>>(
    "/api/v1/coberturas",
    payload,
  );
  if (!data.data) throw new Error("Resposta invalida");
  return data.data;
}

export type CoberturaUpdate = CoberturaCreate;

export async function update(
  id: number,
  payload: CoberturaUpdate,
): Promise<Cobertura> {
  const { data } = await api.put<ApiResponse<Cobertura>>(
    `/api/v1/coberturas/${id}`,
    payload,
  );
  if (!data.data) throw new Error("Resposta invalida");
  return data.data;
}

export async function remove(id: number): Promise<void> {
  await api.delete<ApiResponse<unknown>>(`/api/v1/coberturas/${id}`);
}
