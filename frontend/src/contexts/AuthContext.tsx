'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import * as authService from '@/services/auth'

type User = { email: string; perfil: string; nome: string }

type AuthContextValue = {
  user: User | null
  isAuthenticated: boolean
  isReady: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isReady, setIsReady] = useState(false)

  // Validar token ao montar o componente
  useEffect(() => {
    const checkAuth = async () => {
      const userData = await authService.validate()
      if (userData) {
        setUser({
          email: userData.email,
          perfil: userData.perfil,
          nome: userData.nome ?? '',
        })
      }
      setIsReady(true)
    }
    checkAuth()
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const userData = await authService.login(email, password)
    setUser({
      email: userData.email,
      perfil: userData.perfil,
      nome: userData.nome ?? '',
    })
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
