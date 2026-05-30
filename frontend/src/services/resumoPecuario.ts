import api, { type ApiResponse } from "./api";

export type PartoPrevistoResumo = {
  animal_id: number;
  identificacao: string;
  gestacao_id: number;
  data_prevista_parto?: string | null;
};

export type ResumoPecuario = {
  prenhes_total: number;
  restricoes_ativas_total: number;
  producao_hoje_litros: number;
  producao_semana_litros: number;
  partos_proximos_7d_total: number;
  lactacao_ativa_total: number;
  partos_previstos: PartoPrevistoResumo[];
};

export async function getResumoPecuario(
  fazendaId: number,
  diasParto = 30
): Promise<ResumoPecuario | null> {
  const { data } = await api.get<ApiResponse<ResumoPecuario>>(
    `/api/v1/fazendas/${fazendaId}/resumo-pecuario`,
    { params: { dias_parto: diasParto } }
  );
  return data.data ?? null;
}
