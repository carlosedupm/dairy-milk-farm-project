import api from './api'

export type DevStudioRequest = {
  id: number
  user_id: number
  prompt: string
  status: string
  code_changes: {
    files?: Record<string, string>
    explanation?: string
  }
  error?: string | null
  created_at: string
  updated_at: string
}

export type CodeGenerationResponse = {
  request_id: number
  files: Record<string, string>
  explanation: string
  status: string
}

type ApiResponse<T> = { data: T }

export async function chat(prompt: string): Promise<CodeGenerationResponse> {
  const { data } = await api.post<ApiResponse<CodeGenerationResponse>>(
    '/api/v1/dev-studio/chat',
    { prompt }
  )
  if (!data.data) throw new Error('Resposta inválida')
  return data.data
}

export async function validate(requestId: number): Promise<DevStudioRequest> {
  const { data } = await api.post<ApiResponse<DevStudioRequest>>(
    `/api/v1/dev-studio/validate/${requestId}`
  )
  if (!data.data) throw new Error('Resposta inválida')
  return data.data
}

export async function getHistory(): Promise<DevStudioRequest[]> {
  const { data } = await api.get<ApiResponse<DevStudioRequest[]>>('/api/v1/dev-studio/history')
  return data.data ?? []
}

export async function getStatus(id: number): Promise<DevStudioRequest> {
  const { data } = await api.get<ApiResponse<DevStudioRequest>>(`/api/v1/dev-studio/status/${id}`)
  if (!data.data) throw new Error('Resposta inválida')
  return data.data
}
