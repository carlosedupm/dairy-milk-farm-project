import api, { type ApiResponse } from './api'

export const MOTIVOS_RESTRICAO_LEITE = [
  'TRATAMENTO_ANTIBIOTICO',
  'POS_PARTO_AMOSTRA',
  'SINTOMA_ORDENHA',
  'OUTRO',
] as const

export type MotivoRestricaoLeite = (typeof MOTIVOS_RESTRICAO_LEITE)[number]

export const MOTIVO_RESTRICAO_LEITE_LABELS: Record<MotivoRestricaoLeite, string> = {
  TRATAMENTO_ANTIBIOTICO: 'Tratamento / antibiótico',
  POS_PARTO_AMOSTRA: 'Pós-parto (amostra)',
  SINTOMA_ORDENHA: 'Sintoma na ordenha (ex.: grumos)',
  OUTRO: 'Outro',
}

export type RestricaoLeiteAtiva = {
  id: number
  animal_id: number
  identificacao: string
  motivo: MotivoRestricaoLeite | string
  inicio_em: string
  observacao?: string | null
  status: string
  created_at: string
  updated_at: string
}

export type RestricaoLeite = {
  id: number
  fazenda_id: number
  animal_id: number
  motivo: string
  inicio_em: string
  observacao?: string | null
  status: string
  liberado_em?: string | null
  liberado_observacao?: string | null
  created_at: string
  updated_at: string
}

export async function listAtivas(fazendaId: number): Promise<RestricaoLeiteAtiva[]> {
  const { data } = await api.get<ApiResponse<RestricaoLeiteAtiva[]>>(
    `/api/v1/fazendas/${fazendaId}/restricoes-leite/ativas`
  )
  return data.data ?? []
}

export type CreateRestricaoLeitePayload = {
  animal_id: number
  motivo: string
  inicio_em?: string | null
  observacao?: string | null
}

export async function createRestricao(
  fazendaId: number,
  payload: CreateRestricaoLeitePayload
): Promise<RestricaoLeite> {
  const { data } = await api.post<ApiResponse<RestricaoLeite>>(
    `/api/v1/fazendas/${fazendaId}/restricoes-leite`,
    payload
  )
  if (!data.data) throw new Error('Resposta inválida')
  return data.data
}

export type LiberarRestricaoPayload = {
  liberado_em?: string | null
  liberado_observacao?: string | null
}

export async function liberarRestricao(
  fazendaId: number,
  restricaoId: number,
  payload?: LiberarRestricaoPayload
): Promise<RestricaoLeite> {
  const { data } = await api.patch<ApiResponse<RestricaoLeite>>(
    `/api/v1/fazendas/${fazendaId}/restricoes-leite/${restricaoId}/liberar`,
    payload ?? {}
  )
  if (!data.data) throw new Error('Resposta inválida')
  return data.data
}
