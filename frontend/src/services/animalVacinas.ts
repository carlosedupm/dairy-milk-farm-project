import api, { type ApiResponse } from "./api";

export const TIPOS_VACINA = [
  "AFTOSA",
  "BRUCELOSE",
  "RAIVA",
  "CLOSTRIDIOSES",
  "IBR_BVD",
  "LEPTOSPIROSE",
  "OUTRO",
] as const;

export type TipoVacina = (typeof TIPOS_VACINA)[number];

export const TIPO_VACINA_LABELS: Record<TipoVacina, string> = {
  AFTOSA: "Aftosa",
  BRUCELOSE: "Brucelose",
  RAIVA: "Raiva",
  CLOSTRIDIOSES: "Clostridioses",
  IBR_BVD: "IBR/BVD",
  LEPTOSPIROSE: "Leptospirose",
  OUTRO: "Outra",
};

export const STATUS_VACINA = [
  "PREVISTA",
  "APLICADA",
  "ATRASADA",
  "REFORCO_VENCIDO",
] as const;

export type StatusVacina = (typeof STATUS_VACINA)[number];

export const STATUS_VACINA_LABELS: Record<StatusVacina, string> = {
  PREVISTA: "Prevista",
  APLICADA: "Aplicada",
  ATRASADA: "Atrasada",
  REFORCO_VENCIDO: "Reforço vencido",
};

export type AnimalVacinaRegistro = {
  id: number;
  animal_id: number;
  fazenda_id: number;
  tipo_vacina: TipoVacina | string;
  dose?: string | null;
  data_prevista: string;
  data_aplicacao?: string | null;
  validade_dias?: number | null;
  data_proximo_reforco?: string | null;
  lote?: string | null;
  veterinario?: string | null;
  observacoes?: string | null;
  created_by?: number | null;
  created_at: string;
  updated_at?: string | null;
  status: StatusVacina | string;
};

export type SaveAnimalVacinaPayload = {
  tipo_vacina: string;
  dose?: string | null;
  data_prevista?: string | null;
  data_aplicacao?: string | null;
  validade_dias?: number | null;
  data_proximo_reforco?: string | null;
  lote?: string | null;
  veterinario?: string | null;
  observacoes?: string | null;
};

export type AplicarAnimalVacinaPayload = {
  data_aplicacao: string;
  validade_dias?: number | null;
  data_proximo_reforco?: string | null;
};

export function animalVacinasListQueryKey(animalId: number) {
  return ["animais", animalId, "vacinas"] as const;
}

export function animalVacinaDetailQueryKey(animalId: number, vacinaId: number) {
  return ["animais", animalId, "vacinas", vacinaId] as const;
}

export async function listByAnimal(
  animalId: number
): Promise<AnimalVacinaRegistro[]> {
  const { data } = await api.get<ApiResponse<AnimalVacinaRegistro[]>>(
    `/api/v1/animais/${animalId}/vacinas`
  );
  return data.data ?? [];
}

export async function getById(
  animalId: number,
  vacinaId: number
): Promise<AnimalVacinaRegistro> {
  const { data } = await api.get<ApiResponse<AnimalVacinaRegistro>>(
    `/api/v1/animais/${animalId}/vacinas/${vacinaId}`
  );
  if (!data.data) throw new Error("Resposta inválida");
  return data.data;
}

export async function create(
  animalId: number,
  payload: SaveAnimalVacinaPayload
): Promise<AnimalVacinaRegistro> {
  const { data } = await api.post<ApiResponse<AnimalVacinaRegistro>>(
    `/api/v1/animais/${animalId}/vacinas`,
    payload
  );
  if (!data.data) throw new Error("Resposta inválida");
  return data.data;
}

export async function update(
  animalId: number,
  vacinaId: number,
  payload: SaveAnimalVacinaPayload
): Promise<AnimalVacinaRegistro> {
  const { data } = await api.put<ApiResponse<AnimalVacinaRegistro>>(
    `/api/v1/animais/${animalId}/vacinas/${vacinaId}`,
    payload
  );
  if (!data.data) throw new Error("Resposta inválida");
  return data.data;
}

export async function aplicar(
  animalId: number,
  vacinaId: number,
  payload: AplicarAnimalVacinaPayload
): Promise<AnimalVacinaRegistro> {
  const { data } = await api.patch<ApiResponse<AnimalVacinaRegistro>>(
    `/api/v1/animais/${animalId}/vacinas/${vacinaId}/aplicar`,
    payload
  );
  if (!data.data) throw new Error("Resposta inválida");
  return data.data;
}

export async function remove(animalId: number, vacinaId: number): Promise<void> {
  await api.delete(`/api/v1/animais/${animalId}/vacinas/${vacinaId}`);
}

export function tipoVacinaLabel(tipo: string): string {
  return TIPO_VACINA_LABELS[tipo as TipoVacina] ?? tipo;
}

export function statusVacinaLabel(status: string): string {
  return STATUS_VACINA_LABELS[status as StatusVacina] ?? status;
}
