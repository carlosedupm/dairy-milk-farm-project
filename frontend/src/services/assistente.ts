import api, { type ApiResponse } from "./api";

export type InterpretResponse = {
  intent: string;
  payload: Record<string, unknown>;
  resumo: string;
};

export type ExecutarResponse = unknown;

/** Resposta de executar inclui message do backend (ex.: "Fazenda criada com sucesso") para TTS */
export type ExecutarResult = {
  data?: ExecutarResponse;
  message: string;
};

export async function interpretar(
  texto: string,
  fazendaId?: number,
): Promise<InterpretResponse> {
  const { data } = await api.post<ApiResponse<InterpretResponse>>(
    "/api/v1/assistente/interpretar",
    {
      texto: texto.trim(),
      fazenda_id: fazendaId,
    },
  );
  if (!data.data) throw new Error("Resposta inválida");
  return data.data;
}

/** Backend retorna { data, message, timestamp }; expomos data e message para TTS */
interface ExecutarApiBody {
  data?: ExecutarResponse;
  message?: string;
  timestamp?: string;
}

export async function executar(
  intent: string,
  payload: Record<string, unknown>,
  fazendaId?: number,
): Promise<ExecutarResult> {
  const { data } = await api.post<ExecutarApiBody>(
    "/api/v1/assistente/executar",
    {
      intent,
      payload,
      fazenda_id: fazendaId,
    },
  );
  return {
    data: data.data,
    message: data.message ?? "Ação concluída com sucesso.",
  };
}
