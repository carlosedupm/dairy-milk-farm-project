import api, { type ApiResponse } from "./api";

export const PRODUTOS_HORMONIO = ["LACTROPIN", "BUST", "OUTRO"] as const;

export type ProdutoHormonio = (typeof PRODUTOS_HORMONIO)[number];

export const PRODUTO_HORMONIO_LABELS: Record<ProdutoHormonio, string> = {
  LACTROPIN: "Lactropin",
  BUST: "Bust",
  OUTRO: "Outro",
};

export const MOTIVOS_ENCERRAMENTO_HORMONIO = [
  "BAIXA_PRODUCAO",
  "OUTRO",
] as const;

export type MotivoEncerramentoHormonio =
  (typeof MOTIVOS_ENCERRAMENTO_HORMONIO)[number];

export const MOTIVO_ENCERRAMENTO_LABELS: Record<
  MotivoEncerramentoHormonio,
  string
> = {
  BAIXA_PRODUCAO: "Baixa de produção",
  OUTRO: "Outro",
};

export type HormonioLactacaoAplicacao = {
  id: number;
  protocolo_id: number;
  animal_id: number;
  fazenda_id: number;
  produto: ProdutoHormonio | string;
  data_aplicacao: string;
  data_proxima_aplicacao?: string | null;
  numero_dose: number;
  lote?: string | null;
  observacoes?: string | null;
  created_by?: number | null;
  created_at: string;
  updated_at?: string | null;
};

export type HormonioLactacaoProtocolo = {
  id: number;
  animal_id: number;
  fazenda_id: number;
  lactacao_id: number;
  gestacao_id: number;
  toque_referencia_id: number;
  produto: ProdutoHormonio | string;
  status: "ATIVO" | "ENCERRADO";
  motivo_encerramento?: string | null;
  data_inicio: string;
  data_encerramento?: string | null;
  observacoes_encerramento?: string | null;
  data_prevista_parto?: string | null;
  dias_ate_teto_70?: number | null;
};

export type HormonioLactacaoPendente = {
  animal_id: number;
  animal_identificacao: string;
  lactacao_id: number;
  gestacao_id: number;
  data_prevista_parto?: string | null;
  tipo_pendencia: "PRIMEIRA_DOSE" | "DOSE_VENCIDA";
  data_proxima_aplicacao?: string | null;
  numero_dose_ultima?: number | null;
  produto_ultimo?: string | null;
};

export type SaveHormonioLactacaoPayload = {
  produto: string;
  data_aplicacao: string;
  lote?: string | null;
  observacoes?: string | null;
};

export type EncerrarHormonioProtocoloPayload = {
  motivo_encerramento: string;
  observacoes?: string | null;
  data_encerramento?: string | null;
};

export function hormoniosLactacaoListQueryKey(animalId: number) {
  return ["hormonios-lactacao", animalId] as const;
}

export function hormonioLactacaoProtocoloQueryKey(animalId: number) {
  return ["hormonios-lactacao", animalId, "protocolo"] as const;
}

export function hormoniosLactacaoPendentesQueryKey(fazendaId: number) {
  return ["hormonios-lactacao-pendentes", fazendaId] as const;
}

export async function listByAnimal(
  animalId: number,
): Promise<HormonioLactacaoAplicacao[]> {
  const { data } = await api.get<ApiResponse<HormonioLactacaoAplicacao[]>>(
    `/api/v1/animais/${animalId}/hormonios-lactacao`,
  );
  return data.data ?? [];
}

export async function getById(
  animalId: number,
  aplicacaoId: number,
): Promise<HormonioLactacaoAplicacao> {
  const { data } = await api.get<ApiResponse<HormonioLactacaoAplicacao>>(
    `/api/v1/animais/${animalId}/hormonios-lactacao/${aplicacaoId}`,
  );
  if (!data.data) throw new Error("Resposta inválida");
  return data.data;
}

export async function getProtocolo(
  animalId: number,
): Promise<HormonioLactacaoProtocolo | null> {
  const { data } = await api.get<ApiResponse<HormonioLactacaoProtocolo | null>>(
    `/api/v1/animais/${animalId}/hormonios-lactacao/protocolo`,
  );
  return data.data ?? null;
}

export async function create(
  animalId: number,
  payload: SaveHormonioLactacaoPayload,
): Promise<HormonioLactacaoAplicacao> {
  const { data } = await api.post<ApiResponse<HormonioLactacaoAplicacao>>(
    `/api/v1/animais/${animalId}/hormonios-lactacao`,
    payload,
  );
  if (!data.data) throw new Error("Resposta inválida");
  return data.data;
}

export async function update(
  animalId: number,
  aplicacaoId: number,
  payload: SaveHormonioLactacaoPayload,
): Promise<HormonioLactacaoAplicacao> {
  const { data } = await api.put<ApiResponse<HormonioLactacaoAplicacao>>(
    `/api/v1/animais/${animalId}/hormonios-lactacao/${aplicacaoId}`,
    payload,
  );
  if (!data.data) throw new Error("Resposta inválida");
  return data.data;
}

export async function remove(
  animalId: number,
  aplicacaoId: number,
): Promise<void> {
  await api.delete(
    `/api/v1/animais/${animalId}/hormonios-lactacao/${aplicacaoId}`,
  );
}

export async function encerrarProtocolo(
  animalId: number,
  payload: EncerrarHormonioProtocoloPayload,
): Promise<HormonioLactacaoProtocolo> {
  const { data } = await api.patch<ApiResponse<HormonioLactacaoProtocolo>>(
    `/api/v1/animais/${animalId}/hormonios-lactacao/protocolo/encerrar`,
    payload,
  );
  if (!data.data) throw new Error("Resposta inválida");
  return data.data;
}

export async function listPendentes(
  fazendaId: number,
): Promise<HormonioLactacaoPendente[]> {
  const { data } = await api.get<ApiResponse<HormonioLactacaoPendente[]>>(
    `/api/v1/fazendas/${fazendaId}/hormonios-lactacao/pendentes`,
  );
  return data.data ?? [];
}

export function produtoHormonioLabel(produto: string): string {
  return PRODUTO_HORMONIO_LABELS[produto as ProdutoHormonio] ?? produto;
}

export function tipoPendenciaLabel(tipo: string): string {
  return tipo === "PRIMEIRA_DOSE" ? "1ª dose pendente" : "Dose vencida";
}
