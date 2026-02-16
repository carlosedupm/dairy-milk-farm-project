import api, { type ApiResponse } from "./api";

export type Cio = {
  id: number;
  animal_id: number;
  data_detectado: string;
  metodo_deteccao?: string | null;
  intensidade?: string | null;
  observacoes?: string | null;
  usuario_id?: number | null;
  fazenda_id: number;
  created_at: string;
};

export type CioCreate = {
  animal_id: number;
  data_detectado: string;
  metodo_deteccao?: string | null;
  intensidade?: string | null;
  observacoes?: string | null;
  fazenda_id: number;
};

export async function listByFazenda(fazendaId: number): Promise<Cio[]> {
  const { data } = await api.get<ApiResponse<Cio[]>>("/api/v1/cios", { params: { fazenda_id: fazendaId } });
  return data.data ?? [];
}

export async function listByAnimal(animalId: number): Promise<Cio[]> {
  const { data } = await api.get<ApiResponse<Cio[]>>(`/api/v1/cios/by-animal/${animalId}`);
  return data.data ?? [];
}

export async function get(id: number): Promise<Cio | null> {
  const { data } = await api.get<ApiResponse<Cio>>(`/api/v1/cios/${id}`);
  return data.data ?? null;
}

export type CioUpdate = CioCreate;

export async function create(payload: CioCreate): Promise<Cio> {
  const { data } = await api.post<ApiResponse<Cio>>("/api/v1/cios", payload);
  if (!data.data) throw new Error("Resposta invalida");
  return data.data;
}

export async function update(id: number, payload: CioUpdate): Promise<Cio> {
  const { data } = await api.put<ApiResponse<Cio>>(`/api/v1/cios/${id}`, payload);
  if (!data.data) throw new Error("Resposta invalida");
  return data.data;
}

export async function remove(id: number): Promise<void> {
  await api.delete(`/api/v1/cios/${id}`);
}
