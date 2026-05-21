import api, { type ApiResponse } from "./api";

export type ConformidadeAnomalia = {
  codigo: string;
  severidade: "ALTA" | "MEDIA";
  animal_id: number;
  identificacao: string;
  descricao: string;
  entidade_tipo?: string | null;
  entidade_id?: number | null;
};

export type ConformidadeResponse = {
  fazenda_id: number;
  total: number;
  anomalias: ConformidadeAnomalia[];
};

export async function getConformidadeFazenda(
  fazendaId: number
): Promise<ConformidadeResponse | null> {
  const { data } = await api.get<ApiResponse<ConformidadeResponse>>(
    `/api/v1/fazendas/${fazendaId}/auditoria/conformidade`
  );
  return data.data ?? null;
}
