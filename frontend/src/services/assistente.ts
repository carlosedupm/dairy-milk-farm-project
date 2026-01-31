import api, { type ApiResponse } from "./api";

export type InterpretResponse = {
  intent: string;
  payload: Record<string, unknown>;
  resumo: string;
};

export type ExecutarResponse = unknown;

export async function interpretar(texto: string): Promise<InterpretResponse> {
  const { data } = await api.post<ApiResponse<InterpretResponse>>(
    "/api/v1/assistente/interpretar",
    {
      texto: texto.trim(),
    },
  );
  if (!data.data) throw new Error("Resposta inválida");
  return data.data;
}

export async function executar(
  intent: string,
  payload: Record<string, unknown>,
): Promise<ExecutarResponse> {
  const { data } = await api.post<ApiResponse<ExecutarResponse>>(
    "/api/v1/assistente/executar",
    {
      intent,
      payload,
    },
  );
  return data.data;
}
