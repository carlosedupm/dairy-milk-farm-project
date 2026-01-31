import api, { type ApiResponse } from './api'

export type Usuario = {
  id: number
  nome: string
  email: string
  perfil: string
  enabled: boolean
  created_at: string
  updated_at: string
}

export type UsuarioCreate = {
  nome: string
  email: string
  senha: string
  perfil?: string
}

export type UsuarioUpdate = {
  nome: string
  email: string
  senha?: string
  perfil?: string
  enabled?: boolean
}

export type ListUsuariosResponse = {
  usuarios: Usuario[]
  total: number
}

export async function listUsuarios(
  params?: { limit?: number; offset?: number }
): Promise<ListUsuariosResponse> {
  const searchParams = new URLSearchParams()
  if (params?.limit != null) searchParams.set('limit', String(params.limit))
  if (params?.offset != null) searchParams.set('offset', String(params.offset))
  const qs = searchParams.toString()
  const url = `/api/v1/admin/usuarios${qs ? `?${qs}` : ''}`
  const { data } = await api.get<ApiResponse<ListUsuariosResponse>>(url)
  const payload = data?.data
  if (!payload) return { usuarios: [], total: 0 }
  return payload
}

export async function createUsuario(payload: UsuarioCreate): Promise<Usuario> {
  const { data } = await api.post<ApiResponse<Usuario>>('/api/v1/admin/usuarios', payload)
  if (!data?.data) throw new Error('Resposta inválida')
  return data.data
}

export async function updateUsuario(id: number, payload: UsuarioUpdate): Promise<Usuario> {
  const { data } = await api.put<ApiResponse<Usuario>>(`/api/v1/admin/usuarios/${id}`, payload)
  if (!data?.data) throw new Error('Resposta inválida')
  return data.data
}

export async function toggleUsuarioEnabled(id: number): Promise<Usuario> {
  const { data } = await api.patch<ApiResponse<Usuario>>(
    `/api/v1/admin/usuarios/${id}/toggle-enabled`
  )
  if (!data?.data) throw new Error('Resposta inválida')
  return data.data
}
