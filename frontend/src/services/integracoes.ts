import api, { type ApiResponse } from "./api";

export const INTEGRATION_SCOPES = [
  { id: "animais:read", label: "Ler animais (busca e detalhe)" },
  { id: "toques:write", label: "Registar toques (unitário e lote)" },
  { id: "coberturas:read", label: "Listar coberturas por animal" },
  { id: "coberturas:write", label: "Registar coberturas (unitário e lote)" },
  { id: "saude:read", label: "Consultar casos de saúde por animal" },
  { id: "saude:write", label: "Registar casos de saúde (ex.: laboratório)" },
  { id: "alertas:read", label: "Consultar alertas da fazenda" },
] as const;

export type IntegracaoCliente = {
  id: number;
  nome: string;
  actor_user_id: number;
  key_prefix: string;
  ativo: boolean;
  revogado_em?: string | null;
  criado_por_admin_id?: number | null;
  created_at: string;
  updated_at: string;
  fazenda_ids?: number[];
  scopes?: string[];
};

export type IntegracaoChamada = {
  id: number;
  cliente_id: number;
  method: string;
  path: string;
  status_code: number;
  correlation_id?: string | null;
  idempotency_key?: string | null;
  duracao_ms: number;
  erro_resumo?: string | null;
  created_at: string;
};

export type CreateIntegracaoPayload = {
  nome: string;
  fazenda_ids: number[];
  scopes: string[];
};

export type CreateIntegracaoResponse = {
  cliente: IntegracaoCliente;
  api_key: string;
};

export async function listIntegracoes(params?: {
  limit?: number;
  offset?: number;
}): Promise<{ clientes: IntegracaoCliente[]; total: number }> {
  const qs = new URLSearchParams();
  if (params?.limit != null) qs.set("limit", String(params.limit));
  if (params?.offset != null) qs.set("offset", String(params.offset));
  const url = `/api/v1/admin/integracoes${qs.toString() ? `?${qs}` : ""}`;
  const { data } = await api.get<
    ApiResponse<{ clientes: IntegracaoCliente[]; total: number }>
  >(url);
  return data.data;
}

export async function getIntegracao(id: number): Promise<{
  cliente: IntegracaoCliente;
  chamadas_recentes: IntegracaoChamada[];
}> {
  const { data } = await api.get<
    ApiResponse<{
      cliente: IntegracaoCliente;
      chamadas_recentes: IntegracaoChamada[];
    }>
  >(`/api/v1/admin/integracoes/${id}`);
  return data.data;
}

export async function createIntegracao(
  payload: CreateIntegracaoPayload
): Promise<CreateIntegracaoResponse> {
  const { data } = await api.post<ApiResponse<CreateIntegracaoResponse>>(
    "/api/v1/admin/integracoes",
    payload
  );
  return data.data;
}

export async function updateIntegracao(
  id: number,
  payload: Partial<{
    nome: string;
    ativo: boolean;
    fazenda_ids: number[];
    scopes: string[];
  }>
): Promise<IntegracaoCliente | null> {
  const { data } = await api.patch<ApiResponse<IntegracaoCliente | null>>(
    `/api/v1/admin/integracoes/${id}`,
    payload
  );
  return data.data;
}

export async function rotacionarChaveIntegracao(
  id: number
): Promise<{ api_key: string }> {
  const { data } = await api.post<ApiResponse<{ api_key: string }>>(
    `/api/v1/admin/integracoes/${id}/rotacionar-chave`
  );
  return data.data;
}

export async function revogarIntegracao(id: number): Promise<void> {
  await api.post(`/api/v1/admin/integracoes/${id}/revogar`);
}

export async function listChamadasIntegracao(
  id: number,
  params?: { limit?: number; offset?: number }
): Promise<{ chamadas: IntegracaoChamada[] }> {
  const qs = new URLSearchParams();
  if (params?.limit != null) qs.set("limit", String(params.limit));
  if (params?.offset != null) qs.set("offset", String(params.offset));
  const url = `/api/v1/admin/integracoes/${id}/chamadas${qs.toString() ? `?${qs}` : ""}`;
  const { data } = await api.get<ApiResponse<{ chamadas: IntegracaoChamada[] }>>(
    url
  );
  return data.data;
}
