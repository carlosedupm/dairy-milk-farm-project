import api, { type ApiResponse } from "./api";

export type ProtocoloIATF = { id: number; nome: string; fazenda_id: number; ativo: boolean; created_at: string; updated_at: string; };

export async function listByFazenda(fazendaId: number): Promise<ProtocoloIATF[]> {
  const { data } = await api.get<ApiResponse<ProtocoloIATF[]>>("/api/v1/protocolos-iatf", { params: { fazenda_id: fazendaId } });
  return data.data ?? [];
}
