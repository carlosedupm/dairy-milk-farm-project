'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import * as authService from '@/services/auth'

type User = { id: number; email: string; perfil: string; nome: string }

type AuthContextValue = {
  user: User | null
  isAuthenticated: boolean
  isReady: boolean
  login: (email: string, password: string) => Promise<User | null>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function toUser(data: {
  user_id: number
  email: string
  perfil: string
  nome?: string
}): User {
  return {
    id: data.user_id,
    email: data.email,
    perfil: data.perfil,
    nome: data.nome ?? '',
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isReady, setIsReady] = useState(false)
  const checkingRef = useRef(false)

  const applySession = useCallback(async (): Promise<User | null> => {
    const userData = await authService.ensureSession()
    if (!userData) {
      setUser(null)
      return null
    }
    const next = toUser(userData)
    setUser(next)
    return next
  }, [])

  // Bootstrap: validate → refresh se necessário → validate
  useEffect(() => {
    const checkAuth = async () => {
      checkingRef.current = true
      try {
        await applySession()
      } finally {
        checkingRef.current = false
        setIsReady(true)
      }
    }
    checkAuth()
  }, [applySession])

  // Ao voltar ao app (telefone bloqueado / aba em background), renovar sessão se preciso.
  // Em falha transitória não limpa o user — o interceptor Axios trata 401 nas APIs.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return
      if (checkingRef.current) return
      checkingRef.current = true
      void (async () => {
        try {
          const userData = await authService.ensureSession()
          if (userData) {
            setUser(toUser(userData))
          }
        } finally {
          checkingRef.current = false
        }
      })()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    await authService.login(email, password)
    const full = await authService.validate()
    if (!full) return null
    const next = toUser(full)
    setUser(next)
    return next
  }, [])

  const logout = useCallback(async () => {
    await authService.logout()
    setUser(null)
    window.location.href = '/login'
  }, [])

  const value: AuthContextValue = {
    user,
    isAuthenticated: !!user,
    isReady,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
