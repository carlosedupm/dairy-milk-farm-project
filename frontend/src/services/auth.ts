import api from './api'

export type LoginResponse = {
  data: {
    email: string
    perfil: string
    nome?: string
  }
  message: string
  timestamp: string
}

export type ValidateResponse = {
  data: {
    email: string
    perfil: string
    user_id: number
    nome?: string
  }
  message: string
  timestamp: string
}

export type RegisterResponse = {
  data: {
    id: number
    nome: string
    email: string
  }
  message: string
  timestamp: string
}

export type RegisterPayload = {
  nome: string
  email: string
  password: string
}

export async function login(email: string, password: string): Promise<LoginResponse['data']> {
  // O token é armazenado automaticamente em cookie HttpOnly pelo backend
  const { data } = await api.post<LoginResponse>('/api/auth/login', { email, password })
  return data.data
}

export async function logout(): Promise<void> {
  // Chama o endpoint de logout que limpa o cookie
  await api.post('/api/auth/logout')
}

export async function validate(): Promise<ValidateResponse['data'] | null> {
  try {
    // Valida o token via cookie HttpOnly
    const { data } = await api.post<ValidateResponse>('/api/auth/validate', {})
    return data.data
  } catch {
    return null
  }
}

export async function register(payload: RegisterPayload): Promise<RegisterResponse['data']> {
  const { data } = await api.post<RegisterResponse>('/api/auth/register', payload)
  return data.data
}
