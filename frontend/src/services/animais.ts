import api, { type ApiResponse } from './api'

export type Animal = {
  id: number
  identificacao: string
  raca?: string | null
  data_nascimento?: string | null
  sexo?: string | null
  status_saude?: string | null
  fazenda_id: number
  categoria?: string | null
  status_reprodutivo?: string | null
  mae_id?: number | null
  pai_info?: string | null
  lote_id?: number | null
  peso_nascimento?: number | null
  data_entrada?: string | null
  data_saida?: string | null
  motivo_saida?: string | null
  origem_aquisicao?: OrigemAquisicao | null
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
  categoria?: string | null
  status_reprodutivo?: string | null
  lote_id?: number | null
  mae_id?: number | null
  pai_info?: string | null
  peso_nascimento?: number | null
  data_entrada?: string | null
  data_saida?: string | null
  motivo_saida?: string | null
  origem_aquisicao?: OrigemAquisicao | null
}

export type AnimalUpdate = AnimalCreate

// Origem de aquisição (nascido na propriedade vs comprado)
export const ORIGENS_AQUISICAO = ['NASCIDO', 'COMPRADO'] as const
export type OrigemAquisicao = (typeof ORIGENS_AQUISICAO)[number]

export const ORIGEM_LABELS: Record<OrigemAquisicao, string> = {
  NASCIDO: 'Nascido na propriedade',
  COMPRADO: 'Comprado',
}

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

// Categorias do animal (vaca = MATRIZ, bezerra = BEZERRA)
export const CATEGORIAS = [
  'MATRIZ',
  'NOVILHA',
  'BEZERRA',
  'BEZERRO',
  'TOURO',
  'BOI',
] as const

export type Categoria = (typeof CATEGORIAS)[number]

export const CATEGORIA_LABELS: Record<Categoria, string> = {
  MATRIZ: 'Vaca (Matriz)',
  NOVILHA: 'Novilha',
  BEZERRA: 'Bezerra',
  BEZERRO: 'Bezerro',
  TOURO: 'Touro',
  BOI: 'Boi',
}

/** Indica se o animal é bezerra (categoria BEZERRA). */
export function isBezerra(animal: Animal): boolean {
  return animal.categoria === 'BEZERRA'
}

/** Indica se o animal é vaca/matriz (categoria MATRIZ). */
export function isMatriz(animal: Animal): boolean {
  return animal.categoria === 'MATRIZ'
}

/** Indica se o animal é novilha (categoria NOVILHA). */
export function isNovilha(animal: Animal): boolean {
  return animal.categoria === 'NOVILHA'
}

/** Retorna o label legível da categoria ou "—" se não definida. */
export function getCategoriaLabel(categoria?: string | null): string {
  if (!categoria) return '—'
  return CATEGORIA_LABELS[categoria as Categoria] ?? categoria
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

export async function listByLote(loteId: number): Promise<Animal[]> {
  const { data } = await api.get<ApiResponse<Animal[]>>('/api/v1/animais/filter/by-lote', { params: { lote_id: loteId } })
  return data.data ?? []
}

export async function listByCategoria(fazendaId: number, categoria: string): Promise<Animal[]> {
  const { data } = await api.get<ApiResponse<Animal[]>>('/api/v1/animais/filter/by-categoria', { params: { fazenda_id: fazendaId, categoria } })
  return data.data ?? []
}

export async function listByStatusReprodutivo(fazendaId: number, status: string): Promise<Animal[]> {
  const { data } = await api.get<ApiResponse<Animal[]>>('/api/v1/animais/filter/by-status-reprodutivo', { params: { fazenda_id: fazendaId, status_reprodutivo: status } })
  return data.data ?? []
}

export async function movimentarLote(animalId: number, loteDestinoId: number, motivo?: string): Promise<void> {
  await api.post(`/api/v1/animais/${animalId}/movimentar-lote`, { lote_destino_id: loteDestinoId, motivo })
}
