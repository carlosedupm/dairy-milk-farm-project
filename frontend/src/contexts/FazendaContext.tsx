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
import { useAuth } from './AuthContext'
import { getMinhasFazendas, type Fazenda } from '@/services/fazendas'

const STORAGE_KEY = 'ceialmilk_fazenda_ativa'

type FazendaContextValue = {
  fazendaAtiva: Fazenda | null
  isReady: boolean
  setFazendaAtiva: (fazenda: Fazenda | null) => void
  isValidating: boolean
}

const FazendaContext = createContext<FazendaContextValue | null>(null)

export function FazendaProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isReady: authReady } = useAuth()
  const [fazendaAtiva, setFazendaAtivaState] = useState<Fazenda | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [isValidating, setIsValidating] = useState(false)

  // Validar que fazenda está vinculada ao usuário
  const validateFazenda = useCallback(
    async (fazendaId: number): Promise<boolean> => {
      if (!isAuthenticated) return false
      try {
        const fazendas = await getMinhasFazendas()
        return fazendas.some((f) => f.id === fazendaId)
      } catch {
        return false
      }
    },
    [isAuthenticated]
  )

  // Carregar fazenda ativa do localStorage e validar (apenas uma vez)
  const hasLoaded = useRef(false)
  
  useEffect(() => {
    if (hasLoaded.current) return
    if (!authReady) return

    const loadFazendaAtiva = async () => {
      if (!isAuthenticated) {
        // Limpar localStorage se não autenticado
        localStorage.removeItem(STORAGE_KEY)
        setFazendaAtivaState(null)
        setIsReady(true)
        hasLoaded.current = true
        return
      }

      setIsValidating(true)
      try {
        const fazendas = await getMinhasFazendas()
        
        // Se tem apenas uma fazenda, definir automaticamente como ativa
        const savedId = localStorage.getItem(STORAGE_KEY)
        if (fazendas.length === 1 && !savedId) {
          localStorage.setItem(STORAGE_KEY, fazendas[0].id.toString())
          setFazendaAtivaState(fazendas[0])
          setIsReady(true)
          setIsValidating(false)
          hasLoaded.current = true
          return
        }

        if (savedId) {
          const fazendaId = parseInt(savedId, 10)
          if (!isNaN(fazendaId)) {
            // Validar que ainda está vinculada
            const isValid = await validateFazenda(fazendaId)
            if (isValid) {
              // Buscar dados completos da fazenda
              const fazenda = fazendas.find((f) => f.id === fazendaId)
              if (fazenda) {
                setFazendaAtivaState(fazenda)
                setIsReady(true)
                setIsValidating(false)
                hasLoaded.current = true
                return
              }
            } else {
              // Remover se não estiver mais vinculada
              localStorage.removeItem(STORAGE_KEY)
            }
          }
        }
      } catch (error) {
        console.error('Erro ao carregar fazenda ativa:', error)
        localStorage.removeItem(STORAGE_KEY)
      } finally {
        setIsReady(true)
        setIsValidating(false)
        hasLoaded.current = true
      }
    }

    loadFazendaAtiva()
  }, [authReady, isAuthenticated, validateFazenda])

  // Invalidar fazenda ativa quando usuário fizer logout
  useEffect(() => {
    if (!isAuthenticated) {
      setFazendaAtivaState(null)
      localStorage.removeItem(STORAGE_KEY)
      hasLoaded.current = false // Reset para permitir recarregar após novo login
    }
  }, [isAuthenticated])

  const setFazendaAtiva = useCallback(
    async (fazenda: Fazenda | null) => {
      if (fazenda === null) {
        localStorage.removeItem(STORAGE_KEY)
        setFazendaAtivaState(null)
        return
      }

      // Validar que fazenda está vinculada antes de salvar
      const isValid = await validateFazenda(fazenda.id)
      if (!isValid) {
        throw new Error(
          'Fazenda não encontrada ou você não tem acesso a ela'
        )
      }

      localStorage.setItem(STORAGE_KEY, fazenda.id.toString())
      setFazendaAtivaState(fazenda)
    },
    [validateFazenda]
  )

  const value: FazendaContextValue = {
    fazendaAtiva,
    isReady,
    setFazendaAtiva,
    isValidating,
  }

  return (
    <FazendaContext.Provider value={value}>{children}</FazendaContext.Provider>
  )
}

export function useFazendaAtiva() {
  const ctx = useContext(FazendaContext)
  if (!ctx) throw new Error('useFazendaAtiva must be used within FazendaProvider')
  return ctx
}
