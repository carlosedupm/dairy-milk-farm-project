import api, { type ApiResponse } from './api'

export type ProducaoLeite = {
  id: number
  animal_id: number
  lactacao_id?: number | null
  quantidade: number
  data_hora: string
  qualidade?: number | null
  created_at: string
}

export type ProducaoCreate = {
  animal_id: number
  quantidade: number
  data_hora?: string // ISO datetime, opcional (default: agora)
  qualidade?: number // 1-10
}

export type ProducaoUpdate = ProducaoCreate

export type ProducaoResumo = {
  total_litros: number
  media_litros: number
  total_registros: number
}

// Constantes para valores válidos de qualidade
export const QUALIDADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const
export type Qualidade = typeof QUALIDADES[number]

export const QUALIDADE_LABELS: Record<Qualidade, string> = {
  1: '1 - Péssima',
  2: '2 - Muito ruim',
  3: '3 - Ruim',
  4: '4 - Abaixo da média',
  5: '5 - Média',
  6: '6 - Acima da média',
  7: '7 - Boa',
  8: '8 - Muito boa',
  9: '9 - Excelente',
  10: '10 - Perfeita',
}

export type ProducaoListParams = {
  fazenda_id: number
  lactacao_id?: number
}

export async function list(params: ProducaoListParams): Promise<ProducaoLeite[]> {
  const { data } = await api.get<ApiResponse<ProducaoLeite[]>>('/api/v1/producao', {
    params: {
      fazenda_id: params.fazenda_id,
      ...(params.lactacao_id ? { lactacao_id: params.lactacao_id } : {}),
    },
  })
  return data.data ?? []
}

export async function get(id: number): Promise<ProducaoLeite | null> {
  const { data } = await api.get<ApiResponse<ProducaoLeite>>(`/api/v1/producao/${id}`)
  return data.data ?? null
}

export async function listByAnimal(animalId: number): Promise<ProducaoLeite[]> {
  const { data } = await api.get<ApiResponse<ProducaoLeite[]>>(`/api/v1/animais/${animalId}/producao`)
  return data.data ?? []
}

export async function listByDateRange(
  startDate: string,
  endDate: string,
  fazendaId: number,
  lactacaoId?: number,
): Promise<ProducaoLeite[]> {
  const { data } = await api.get<ApiResponse<ProducaoLeite[]>>('/api/v1/producao/filter/by-date', {
    params: {
      start: startDate,
      end: endDate,
      fazenda_id: fazendaId,
      ...(lactacaoId ? { lactacao_id: lactacaoId } : {}),
    },
  })
  return data.data ?? []
}

export async function create(payload: ProducaoCreate): Promise<ProducaoLeite> {
  const { data } = await api.post<ApiResponse<ProducaoLeite>>('/api/v1/producao', payload)
  if (!data.data) throw new Error('Resposta inválida')
  return data.data
}

export async function update(id: number, payload: ProducaoUpdate): Promise<ProducaoLeite> {
  const { data } = await api.put<ApiResponse<ProducaoLeite>>(`/api/v1/producao/${id}`, payload)
  if (!data.data) throw new Error('Resposta inválida')
  return data.data
}

export async function remove(id: number): Promise<void> {
  await api.delete(`/api/v1/producao/${id}`)
}

export async function count(fazendaId: number): Promise<number> {
  const { data } = await api.get<ApiResponse<{ count: number }>>('/api/v1/producao/count', {
    params: { fazenda_id: fazendaId },
  })
  return data.data?.count ?? 0
}

export async function getResumoByAnimal(animalId: number): Promise<ProducaoResumo> {
  const { data } = await api.get<ApiResponse<ProducaoResumo>>(`/api/v1/animais/${animalId}/producao/resumo`)
  return data.data ?? { total_litros: 0, media_litros: 0, total_registros: 0 }
}
