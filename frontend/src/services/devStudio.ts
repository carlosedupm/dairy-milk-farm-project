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
  pr_number?: number | null
  pr_url?: string | null
  branch_name?: string | null
  created_at: string
  updated_at: string
}

export type CodeGenerationResponse = {
  request_id: number
  files: Record<string, string>
  explanation: string
  status: string
  pr_number?: number | null
  pr_url?: string | null
  branch_name?: string | null
}

export type UsageStats = {
  used_last_hour: number
  limit_per_hour: number
  used_today: number
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

export async function refine(
  requestId: number,
  feedback: string
): Promise<CodeGenerationResponse> {
  const { data } = await api.post<ApiResponse<CodeGenerationResponse>>(
    '/api/v1/dev-studio/refine',
    { request_id: requestId, feedback }
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

export async function getUsage(): Promise<UsageStats> {
  const { data } = await api.get<ApiResponse<UsageStats>>('/api/v1/dev-studio/usage')
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

export async function implement(requestId: number): Promise<DevStudioRequest> {
  const { data } = await api.post<ApiResponse<DevStudioRequest>>(
    `/api/v1/dev-studio/implement/${requestId}`
  )
  if (!data.data) throw new Error('Resposta inválida')
  return data.data
}
