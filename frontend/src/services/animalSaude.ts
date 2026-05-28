import api, { type ApiResponse } from "./api";

export const TIPOS_CASO_SAUDE = [
  "TRATAMENTO",
  "PREVENTIVO",
  "CIRURGIA",
  "OUTRO",
] as const;

export type TipoCasoSaude = (typeof TIPOS_CASO_SAUDE)[number];

export const TIPO_CASO_SAUDE_LABELS: Record<TipoCasoSaude, string> = {
  TRATAMENTO: "Tratamento",
  PREVENTIVO: "Preventivo",
  CIRURGIA: "Cirurgia",
  OUTRO: "Outro",
};

export const STATUS_CASO_SAUDE = ["ATIVO", "CONCLUIDO", "CANCELADO"] as const;

export type StatusCasoSaude = (typeof STATUS_CASO_SAUDE)[number];

export const STATUS_CASO_SAUDE_LABELS: Record<StatusCasoSaude, string> = {
  ATIVO: "Ativo",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

export type AnimalSaudeRegistro = {
  id: number;
  animal_id: number;
  tipo_caso: TipoCasoSaude | string;
  data_inicio: string;
  data_fim?: string | null;
  status: StatusCasoSaude | string;
  observacoes?: string | null;
  created_by?: number | null;
  created_at: string;
  updated_at?: string | null;
};

export type SaveAnimalSaudePayload = {
  tipo_caso: string;
  data_inicio: string;
  data_fim?: string | null;
  status: string;
  observacoes?: string | null;
};

export function animalSaudeListQueryKey(animalId: number) {
  return ["animais", animalId, "saude"] as const;
}

export function animalSaudeDetailQueryKey(animalId: number, saudeId: number) {
  return ["animais", animalId, "saude", saudeId] as const;
}

export async function listByAnimal(animalId: number): Promise<AnimalSaudeRegistro[]> {
  const { data } = await api.get<ApiResponse<AnimalSaudeRegistro[]>>(
    `/api/v1/animais/${animalId}/saude`
  );
  return data.data ?? [];
}

export async function getById(
  animalId: number,
  saudeId: number
): Promise<AnimalSaudeRegistro> {
  const { data } = await api.get<ApiResponse<AnimalSaudeRegistro>>(
    `/api/v1/animais/${animalId}/saude/${saudeId}`
  );
  if (!data.data) throw new Error("Resposta inválida");
  return data.data;
}

export async function create(
  animalId: number,
  payload: SaveAnimalSaudePayload
): Promise<AnimalSaudeRegistro> {
  const { data } = await api.post<ApiResponse<AnimalSaudeRegistro>>(
    `/api/v1/animais/${animalId}/saude`,
    payload
  );
  if (!data.data) throw new Error("Resposta inválida");
  return data.data;
}

export async function update(
  animalId: number,
  saudeId: number,
  payload: SaveAnimalSaudePayload
): Promise<AnimalSaudeRegistro> {
  const { data } = await api.put<ApiResponse<AnimalSaudeRegistro>>(
    `/api/v1/animais/${animalId}/saude/${saudeId}`,
    payload
  );
  if (!data.data) throw new Error("Resposta inválida");
  return data.data;
}

export async function remove(animalId: number, saudeId: number): Promise<void> {
  await api.delete(`/api/v1/animais/${animalId}/saude/${saudeId}`);
}

export function dateOnlyFromApi(value?: string | null): string {
  if (!value) return "";
  return value.slice(0, 10);
}
