import api, { type ApiResponse } from './api'
import type { RestricaoLeite } from './restricoesLeite'

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
  observacao_saida?: string | null
  origem_aquisicao?: OrigemAquisicao | null
  created_by?: number | null
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
  observacao_saida?: string | null
  origem_aquisicao?: OrigemAquisicao | null
}

export type AnimalUpdate = AnimalCreate

export type ProducaoResumo = {
  total_litros: number
  media_litros: number
  total_registros: number
}

export type GestacaoResumoContexto = {
  confirmada: boolean
  gestacao_id?: number | null
  data_confirmacao?: string | null
  data_prevista_parto?: string | null
  dias_gestacao: number
  meses_gestacao: number
}

export type LactacaoAtiva = {
  id: number
  animal_id: number
  numero_lactacao: number
  data_inicio: string
  data_fim?: string | null
  status?: string | null
  fazenda_id: number
}

export type CicloTimelineItem = {
  tipo: string
  data: string
  titulo: string
  detalhe?: string
  ref_id?: number
  created_by?: number | null
  registrado_por?: string
}

export type ProximaAcao = {
  codigo: string
  label: string
  href_path: string
}

export type SaidaResumo = {
  data_saida: string
  motivo_saida?: string
  motivo_label?: string
  observacao_saida?: string
  registrado_por?: string
}

export type AnimalContexto = {
  animal: Animal
  resumo_producao: ProducaoResumo
  restricao_leite_ativa?: RestricaoLeite | null
  gestacao_resumo?: GestacaoResumoContexto | null
  lactacao_ativa?: LactacaoAtiva | null
  proximas_acoes?: ProximaAcao[]
  registrado_por_cadastro?: string
  fora_do_rebanho?: boolean
  saida_resumo?: SaidaResumo | null
}

export type TimelineFilterTipo = 'todos' | 'ciclo' | 'saude' | 'alertas'

export type AnimalTimelinePage = {
  timeline: CicloTimelineItem[]
  total: number
}

export const TIMELINE_PAGE_SIZE = 20

export const ANIMAL_SEARCH_PAGE_SIZE = 20

export type AnimalSearchPage = {
  animais: Animal[]
  total: number
  limit: number
  offset: number
}

export type AnimalSearchParams = {
  offset?: number
  limit?: number
}

export function animalTimelineQueryKey(animalId: number, tipo: TimelineFilterTipo = 'todos') {
  return ['animais', animalId, 'timeline', tipo] as const
}

export function animalTimelineQueryPrefix(animalId: number) {
  return ['animais', animalId, 'timeline'] as const
}

/** Invalida timeline paginada (todos os filtros) de um animal ou de todos. */
export function invalidateAnimalTimeline(
  queryClient: { invalidateQueries: (opts: {
    queryKey?: readonly unknown[]
    predicate?: (query: { queryKey: readonly unknown[] }) => boolean
  }) => void },
  animalId?: number,
) {
  if (animalId != null) {
    queryClient.invalidateQueries({ queryKey: animalTimelineQueryPrefix(animalId) })
    return
  }
  queryClient.invalidateQueries({
    predicate: (query) =>
      query.queryKey[0] === 'animais' && query.queryKey[2] === 'timeline',
  })
}

export const MOTIVOS_SAIDA = ['MORTE', 'VENDA', 'DOACAO', 'DESCARTE'] as const
export type MotivoSaida = (typeof MOTIVOS_SAIDA)[number]

export const MOTIVO_SAIDA_LABELS: Record<MotivoSaida, string> = {
  MORTE: 'Morte',
  VENDA: 'Venda',
  DOACAO: 'Doação',
  DESCARTE: 'Descarte (saída do animal)',
}

export type RegistrarBaixaPayload = {
  data_saida: string
  motivo_saida: MotivoSaida
  observacao_saida?: string | null
}

/** Data civil local YYYY-MM-DD (alinha a BR-BAIXA-002 / CURRENT_DATE no servidor). */
function localCivilDateISO(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Extrai YYYY-MM-DD de `data_saida` (aceita ISO completo da API). */
export function dataSaidaCivilISO(dataSaida: string): string {
  return dataSaida.slice(0, 10)
}

/** Animal com data_saida no passado ou hoje (fora do rebanho operacional). */
export function isAnimalForaDoRebanho(animal: Pick<Animal, 'data_saida'>): boolean {
  if (!animal.data_saida) return false
  const saida = dataSaidaCivilISO(animal.data_saida)
  return saida <= localCivilDateISO()
}

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

/** Status reprodutivo (API / filtros). */
export const STATUS_REPRODUTIVO_OPTIONS = [
  'VAZIA',
  'SERVIDA',
  'PRENHE',
  'PARIDA',
  'SECA',
] as const

export type StatusReprodutivo = (typeof STATUS_REPRODUTIVO_OPTIONS)[number]

export const STATUS_REPRODUTIVO_LABELS: Record<StatusReprodutivo, string> = {
  VAZIA: 'Vazia',
  SERVIDA: 'Servida',
  PRENHE: 'Prenhe',
  PARIDA: 'Parida',
  SECA: 'Seca',
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

export type AnimaisPaginatedResult = {
  animais: Animal[]
  total: number
}

export type AnimaisListParams = {
  limit?: number
  offset?: number
  fazenda_id?: number
  identificacao?: string
  categoria?: string
  sexo?: string
  status_saude?: string
  lote_id?: number
  status_reprodutivo?: string
  /** true (default): só no rebanho; false: incluir baixados */
  no_rebanho?: boolean
  /** ativos | baixa | todos */
  rebanho?: string
}

function appendAnimaisListParams(
  sp: URLSearchParams,
  p: AnimaisListParams,
  options?: { includeFazendaId?: boolean }
) {
  if (p.limit != null) sp.set('limit', String(p.limit))
  if (p.offset != null) sp.set('offset', String(p.offset))
  if (options?.includeFazendaId !== false && p.fazenda_id != null) {
    sp.set('fazenda_id', String(p.fazenda_id))
  }
  if (p.identificacao?.trim()) sp.set('identificacao', p.identificacao.trim())
  if (p.categoria) sp.set('categoria', p.categoria)
  if (p.sexo) sp.set('sexo', p.sexo)
  if (p.status_saude) sp.set('status_saude', p.status_saude)
  if (p.lote_id != null && p.lote_id > 0) sp.set('lote_id', String(p.lote_id))
  if (p.status_reprodutivo) sp.set('status_reprodutivo', p.status_reprodutivo)
  if (p.rebanho) sp.set('rebanho', p.rebanho)
  else if (p.no_rebanho === false) sp.set('no_rebanho', 'false')
  else if (p.no_rebanho === true) sp.set('no_rebanho', 'true')
}

/** Listagem paginada (fazendas do usuário; `fazenda_id` opcional para filtrar). */
export async function listPaginated(
  params: AnimaisListParams = {}
): Promise<AnimaisPaginatedResult> {
  const sp = new URLSearchParams()
  appendAnimaisListParams(sp, {
    ...params,
    limit: params.limit ?? 25,
    offset: params.offset ?? 0,
  })
  const qs = sp.toString()
  const { data } = await api.get<
    ApiResponse<{ animais: Animal[]; total: number }>
  >(`/api/v1/animais${qs ? `?${qs}` : ''}`)
  const payload = data.data
  return {
    animais: payload?.animais ?? [],
    total: payload?.total ?? 0,
  }
}

export async function get(id: number): Promise<Animal | null> {
  const { data } = await api.get<ApiResponse<Animal>>(`/api/v1/animais/${id}`)
  return data.data ?? null
}

type AnimaisListPayload = Animal[] | { animais?: Animal[]; total?: number }

/** Aceita array direto ou envelope paginado `{ animais, total }` da API. */
export function coerceAnimaisList(payload: unknown): Animal[] {
  if (Array.isArray(payload)) return payload
  if (payload && typeof payload === 'object' && 'animais' in payload) {
    const inner = (payload as { animais?: unknown }).animais
    return Array.isArray(inner) ? inner : []
  }
  return []
}

export async function listByFazenda(
  fazendaId: number,
  options?: { no_rebanho?: boolean }
): Promise<Animal[]> {
  const sp = new URLSearchParams()
  // Backend trata ausência de no_rebanho como true; enviar explicitamente false para incluir baixados.
  const somenteNoRebanho = options?.no_rebanho !== false
  sp.set('no_rebanho', somenteNoRebanho ? 'true' : 'false')
  const { data } = await api.get<ApiResponse<AnimaisListPayload>>(
    `/api/v1/fazendas/${fazendaId}/animais?${sp.toString()}`,
  )
  return coerceAnimaisList(data.data)
}

export async function registrarBaixa(
  id: number,
  payload: RegistrarBaixaPayload
): Promise<Animal> {
  const { data } = await api.post<ApiResponse<Animal>>(
    `/api/v1/animais/${id}/baixa`,
    payload
  )
  if (!data.data) throw new Error('Resposta inválida')
  return data.data
}

export async function reverterBaixa(id: number): Promise<Animal> {
  const { data } = await api.post<ApiResponse<Animal>>(
    `/api/v1/animais/${id}/baixa/reverter`,
    {}
  )
  if (!data.data) throw new Error('Resposta inválida')
  return data.data
}

/** Listagem paginada por fazenda (use query `limit` na API). */
export async function listByFazendaPaginated(
  fazendaId: number,
  params: Omit<AnimaisListParams, 'fazenda_id'> = {}
): Promise<AnimaisPaginatedResult> {
  const sp = new URLSearchParams()
  appendAnimaisListParams(
    sp,
    {
      ...params,
      limit: params.limit ?? 25,
      offset: params.offset ?? 0,
    },
    { includeFazendaId: false }
  )
  const qs = sp.toString()
  const { data } = await api.get<
    ApiResponse<{ animais: Animal[]; total: number }>
  >(`/api/v1/fazendas/${fazendaId}/animais${qs ? `?${qs}` : ''}`)
  const payload = data.data
  return {
    animais: payload?.animais ?? [],
    total: payload?.total ?? 0,
  }
}

/** Animais com lactação ativa na fazenda (ordenha / descarte de leite). */
export async function listEmLactacaoByFazenda(fazendaId: number): Promise<Animal[]> {
  const { data } = await api.get<ApiResponse<AnimaisListPayload>>(
    `/api/v1/fazendas/${fazendaId}/animais/em-lactacao`,
  )
  return coerceAnimaisList(data.data)
}

export type CicloContext = 'cobertura' | 'toque' | 'parto' | 'lactacao' | 'secagem'

export async function listParaCoberturaByFazenda(fazendaId: number): Promise<Animal[]> {
  const { data } = await api.get<ApiResponse<AnimaisListPayload>>(
    `/api/v1/fazendas/${fazendaId}/animais/para-cobertura`,
  )
  return coerceAnimaisList(data.data)
}

export async function listParaToqueByFazenda(fazendaId: number): Promise<Animal[]> {
  const { data } = await api.get<ApiResponse<AnimaisListPayload>>(
    `/api/v1/fazendas/${fazendaId}/animais/para-toque`,
  )
  return coerceAnimaisList(data.data)
}

export async function listParaPartoByFazenda(fazendaId: number): Promise<Animal[]> {
  const { data } = await api.get<ApiResponse<AnimaisListPayload>>(
    `/api/v1/fazendas/${fazendaId}/animais/para-parto`,
  )
  return coerceAnimaisList(data.data)
}

export async function listParaAberturaLactacaoByFazenda(fazendaId: number): Promise<Animal[]> {
  const { data } = await api.get<ApiResponse<AnimaisListPayload>>(
    `/api/v1/fazendas/${fazendaId}/animais/para-abertura-lactacao`,
  )
  return coerceAnimaisList(data.data)
}

const CICLO_CONTEXT_FETCHERS: Record<CicloContext, (fazendaId: number) => Promise<Animal[]>> = {
  cobertura: listParaCoberturaByFazenda,
  toque: listParaToqueByFazenda,
  parto: listParaPartoByFazenda,
  lactacao: listParaAberturaLactacaoByFazenda,
  secagem: listEmLactacaoByFazenda,
}

export function listAnimaisByCicloContext(
  fazendaId: number,
  context: CicloContext,
): Promise<Animal[]> {
  return CICLO_CONTEXT_FETCHERS[context](fazendaId)
}

export const CICLO_EMPTY_MESSAGES: Record<CicloContext, string> = {
  cobertura: 'Nenhuma fêmea elegível — registre um cio primeiro',
  toque: 'Nenhuma fêmea elegível — registre uma cobertura primeiro',
  parto: 'Nenhuma fêmea elegível — confirme uma gestação primeiro',
  lactacao: 'Nenhuma fêmea elegível — abra lactação após um parto',
  secagem: 'Nenhum animal em lactação',
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

export async function searchByIdentificacao(
  identificacao: string,
  params: AnimalSearchParams = {},
): Promise<AnimalSearchPage> {
  const { data } = await api.get<
    ApiResponse<{
      animais?: Animal[]
      total?: number
      limit?: number
      offset?: number
    }>
  >('/api/v1/animais/search/by-identificacao', {
    params: {
      identificacao,
      limit: params.limit ?? ANIMAL_SEARCH_PAGE_SIZE,
      offset: params.offset ?? 0,
    },
  })
  const payload = data.data
  return {
    animais: payload?.animais ?? [],
    total: payload?.total ?? 0,
    limit: payload?.limit ?? ANIMAL_SEARCH_PAGE_SIZE,
    offset: payload?.offset ?? 0,
  }
}

export async function getContexto(id: number): Promise<AnimalContexto | null> {
  const { data } = await api.get<ApiResponse<AnimalContexto>>(`/api/v1/animais/${id}/contexto`)
  return data.data ?? null
}

export async function getTimeline(
  id: number,
  params: { limit?: number; offset?: number; tipo?: TimelineFilterTipo } = {},
): Promise<AnimalTimelinePage> {
  const { data } = await api.get<ApiResponse<AnimalTimelinePage>>(`/api/v1/animais/${id}/timeline`, {
    params: {
      limit: params.limit ?? TIMELINE_PAGE_SIZE,
      offset: params.offset ?? 0,
      tipo: params.tipo ?? 'todos',
    },
  })
  return data.data ?? { timeline: [], total: 0 }
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
