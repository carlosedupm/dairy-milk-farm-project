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
    // Usar fetch diretamente para ter controle total sobre o tratamento de erros
    // e evitar logs desnecessários no console para 401 esperados
    const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
    const response = await fetch(`${baseURL}/api/auth/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Importante: permite envio de cookies HttpOnly
    })

    // Se retornou 401, o usuário não está autenticado (comportamento esperado)
    if (response.status === 401) {
      return null
    }

    // Se retornou erro diferente de 401, também retornar null
    if (!response.ok) {
      return null
    }

    // Se retornou sucesso, parsear e retornar os dados
    const data: ValidateResponse = await response.json()
    return data.data || null
  } catch (error: unknown) {
    // Qualquer erro também retorna null (usuário não autenticado)
    return null
  }
}

export async function register(payload: RegisterPayload): Promise<RegisterResponse['data']> {
  const { data } = await api.post<RegisterResponse>('/api/auth/register', payload)
  return data.data
}
