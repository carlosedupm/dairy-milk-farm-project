import api, { type ApiResponse } from "./api";

export type Fazenda = {
  id: number;
  nome: string;
  localizacao?: string | null;
  quantidade_vacas: number;
  fundacao?: string | null;
  created_at: string;
  updated_at: string;
};

export type FazendaCreate = {
  nome: string;
  localizacao?: string | null;
  fundacao?: string | null;
};

export type FazendaUpdate = FazendaCreate;

export async function list(): Promise<Fazenda[]> {
  const { data } = await api.get<ApiResponse<Fazenda[]>>("/api/v1/fazendas");
  return data.data ?? [];
}

export async function get(id: number): Promise<Fazenda | null> {
  const { data } = await api.get<ApiResponse<Fazenda>>(
    `/api/v1/fazendas/${id}`
  );
  return data.data ?? null;
}

export async function create(payload: FazendaCreate): Promise<Fazenda> {
  const { data } = await api.post<ApiResponse<Fazenda>>(
    "/api/v1/fazendas",
    payload
  );
  if (!data.data) throw new Error("Resposta inválida");
  return data.data;
}

export async function update(
  id: number,
  payload: FazendaUpdate
): Promise<Fazenda> {
  const { data } = await api.put<ApiResponse<Fazenda>>(
    `/api/v1/fazendas/${id}`,
    payload
  );
  if (!data.data) throw new Error("Resposta inválida");
  return data.data;
}

export async function remove(id: number): Promise<void> {
  await api.delete(`/api/v1/fazendas/${id}`);
}

/** Fazendas vinculadas ao usuário logado (minhas fazendas). */
export async function getMinhasFazendas(): Promise<Fazenda[]> {
  const { data } = await api.get<ApiResponse<Fazenda[]>>("/api/v1/me/fazendas");
  return data.data ?? [];
}
