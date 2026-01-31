import api, { type ApiResponse } from './api'

export type Animal = {
  id: number
  identificacao: string
  raca?: string | null
  data_nascimento?: string | null
  sexo?: string | null
  status_saude?: string | null
  fazenda_id: number
  created_at: string
  updated_at: string
}

export type AnimalCreate = {
  fazenda_id: number
  identificacao: string
  raca?: string | null
  data_nascimento?: string | null
  sexo?: string | null
  status_saude?: string | null
}

export type AnimalUpdate = AnimalCreate

// Constantes para valores válidos
export const SEXOS = ['M', 'F'] as const
export const STATUS_SAUDE_OPTIONS = ['SAUDAVEL', 'DOENTE', 'EM_TRATAMENTO'] as const

export type Sexo = typeof SEXOS[number]
export type StatusSaude = typeof STATUS_SAUDE_OPTIONS[number]

export const SEXO_LABELS: Record<Sexo, string> = {
  M: 'Macho',
  F: 'Fêmea',
}

export const STATUS_SAUDE_LABELS: Record<StatusSaude, string> = {
  SAUDAVEL: 'Saudável',
  DOENTE: 'Doente',
  EM_TRATAMENTO: 'Em Tratamento',
}

export async function list(): Promise<Animal[]> {
  const { data } = await api.get<ApiResponse<Animal[]>>('/api/v1/animais')
  return data.data ?? []
}

export async function get(id: number): Promise<Animal | null> {
  const { data } = await api.get<ApiResponse<Animal>>(`/api/v1/animais/${id}`)
  return data.data ?? null
}

export async function listByFazenda(fazendaId: number): Promise<Animal[]> {
  const { data } = await api.get<ApiResponse<Animal[]>>(`/api/v1/fazendas/${fazendaId}/animais`)
  return data.data ?? []
}

export async function create(payload: AnimalCreate): Promise<Animal> {
  const { data } = await api.post<ApiResponse<Animal>>('/api/v1/animais', payload)
  if (!data.data) throw new Error('Resposta inválida')
  return data.data
}

export async function update(id: number, payload: AnimalUpdate): Promise<Animal> {
  const { data } = await api.put<ApiResponse<Animal>>(`/api/v1/animais/${id}`, payload)
  if (!data.data) throw new Error('Resposta inválida')
  return data.data
}

export async function remove(id: number): Promise<void> {
  await api.delete(`/api/v1/animais/${id}`)
}

export async function count(): Promise<number> {
  const { data } = await api.get<ApiResponse<{ count: number }>>('/api/v1/animais/count')
  return data.data?.count ?? 0
}

export async function countByFazenda(fazendaId: number): Promise<number> {
  const { data } = await api.get<ApiResponse<{ count: number }>>(`/api/v1/fazendas/${fazendaId}/animais/count`)
  return data.data?.count ?? 0
}
