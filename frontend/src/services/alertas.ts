import api, { type ApiResponse } from "./api";

export const TIPOS_ALERTA = [
  "TRATAMENTO_VENCIDO",
  "PARTO_PREVISTO",
  "RESTRICAO_LEITE_ATIVA",
  "NAO_CONFORMIDADE",
  "GESTACAO_SEM_SECAGEM",
  "CIO_DETECTADO",
  "MANUAL",
] as const;

export type TipoAlerta = (typeof TIPOS_ALERTA)[number];

export const TIPO_ALERTA_LABELS: Record<TipoAlerta, string> = {
  TRATAMENTO_VENCIDO: "Tratamento vencido",
  PARTO_PREVISTO: "Parto previsto",
  RESTRICAO_LEITE_ATIVA: "Restrição de leite ativa",
  NAO_CONFORMIDADE: "Não conformidade",
  GESTACAO_SEM_SECAGEM: "Gestação sem secagem",
  CIO_DETECTADO: "Cio detectado",
  MANUAL: "Manual",
};

export const SEVERIDADES_ALERTA = [
  "CRITICA",
  "ALTA",
  "MEDIA",
  "BAIXA",
] as const;

export type SeveridadeAlerta = (typeof SEVERIDADES_ALERTA)[number];

export const SEVERIDADE_ALERTA_LABELS: Record<SeveridadeAlerta, string> = {
  CRITICA: "Crítica",
  ALTA: "Alta",
  MEDIA: "Média",
  BAIXA: "Baixa",
};

export const STATUS_ALERTA = [
  "ABERTO",
  "EM_ANDAMENTO",
  "RESOLVIDO",
  "IGNORADO",
] as const;

export type StatusAlerta = (typeof STATUS_ALERTA)[number];

export const STATUS_ALERTA_LABELS: Record<StatusAlerta, string> = {
  ABERTO: "Aberto",
  EM_ANDAMENTO: "Em andamento",
  RESOLVIDO: "Resolvido",
  IGNORADO: "Ignorado",
};

export type Alerta = {
  id: number;
  fazenda_id: number;
  animal_id?: number | null;
  tipo: TipoAlerta | string;
  severidade: SeveridadeAlerta | string;
  titulo: string;
  descricao?: string | null;
  data_prevista?: string | null;
  status: StatusAlerta | string;
  resolvido_por?: number | null;
  resolvido_em?: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
  animal_identificacao?: string | null;
  created_by_nome?: string | null;
  resolvido_por_nome?: string | null;
};

export type AlertasListParams = {
  status?: string;
  tipo?: string;
  severidade?: string;
  start?: string;
  end?: string;
  limit?: number;
  offset?: number;
};

export type AlertasListResponse = {
  alertas: Alerta[];
  total: number;
};

export function alertasListQueryKey(
  fazendaId: number,
  params?: AlertasListParams
) {
  return ["alertas", fazendaId, params ?? {}] as const;
}

export async function listAlertas(
  fazendaId: number,
  params: AlertasListParams = {}
): Promise<AlertasListResponse> {
  const { data } = await api.get<ApiResponse<AlertasListResponse>>(
    `/api/v1/fazendas/${fazendaId}/alertas`,
    { params }
  );
  return data.data ?? { alertas: [], total: 0 };
}

export async function getAlerta(
  fazendaId: number,
  alertaId: number
): Promise<Alerta> {
  const { data } = await api.get<ApiResponse<Alerta>>(
    `/api/v1/fazendas/${fazendaId}/alertas/${alertaId}`
  );
  if (!data.data) throw new Error("Resposta inválida");
  return data.data;
}

export type CreateAlertaManualPayload = {
  tipo: "MANUAL";
  titulo: string;
  descricao?: string | null;
  animal_id?: number | null;
  data_prevista?: string | null;
  severidade: SeveridadeAlerta | string;
};

export async function createAlertaManual(
  fazendaId: number,
  payload: CreateAlertaManualPayload
): Promise<Alerta> {
  const { data } = await api.post<ApiResponse<Alerta>>(
    `/api/v1/fazendas/${fazendaId}/alertas`,
    payload
  );
  if (!data.data) throw new Error("Resposta inválida");
  return data.data;
}

export async function updateAlertaStatus(
  fazendaId: number,
  alertaId: number,
  status: StatusAlerta | string
): Promise<Alerta> {
  const { data } = await api.patch<ApiResponse<Alerta>>(
    `/api/v1/fazendas/${fazendaId}/alertas/${alertaId}/status`,
    { status }
  );
  if (!data.data) throw new Error("Resposta inválida");
  return data.data;
}

export async function deleteAlerta(
  fazendaId: number,
  alertaId: number
): Promise<void> {
  await api.delete(`/api/v1/fazendas/${fazendaId}/alertas/${alertaId}`);
}
