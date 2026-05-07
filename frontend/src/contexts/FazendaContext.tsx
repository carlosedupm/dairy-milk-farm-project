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

  // Carregar fazenda ativa do localStorage e validar.
  // hasLoaded é por-sessão-autenticada: não é marcado quando o usuário está
  // deslogado, garantindo que após o login o carregamento ocorra.
  const hasLoaded = useRef(false)

  useEffect(() => {
    if (!authReady) return

    if (!isAuthenticated) {
      // Estado deslogado: limpar e marcar pronto, mas sem consumir hasLoaded,
      // para que ao logar (transição false → true) o carregamento dispare.
      localStorage.removeItem(STORAGE_KEY)
      setFazendaAtivaState(null)
      setIsValidating(false)
      setIsReady(true)
      hasLoaded.current = false
      return
    }

    if (hasLoaded.current) return
    hasLoaded.current = true

    const loadFazendaAtiva = async () => {
      // Início da carga autenticada: voltar a "não pronto" para evitar
      // que a UI exiba estado vazio enquanto a fazenda é resolvida.
      setIsReady(false)
      setIsValidating(true)
      try {
        const fazendas = await getMinhasFazendas()

        if (fazendas.length === 0) {
          localStorage.removeItem(STORAGE_KEY)
          setFazendaAtivaState(null)
          return
        }

        // Uma única fazenda: sempre definir como ativa (vínculo do usuário)
        if (fazendas.length === 1) {
          localStorage.setItem(STORAGE_KEY, fazendas[0].id.toString())
          setFazendaAtivaState(fazendas[0])
          return
        }

        const savedId = localStorage.getItem(STORAGE_KEY)
        if (savedId) {
          const fazendaId = parseInt(savedId, 10)
          if (!isNaN(fazendaId)) {
            const fazenda = fazendas.find((f) => f.id === fazendaId)
            if (fazenda) {
              setFazendaAtivaState(fazenda)
              return
            }
            // Salvo não está mais vinculado
            localStorage.removeItem(STORAGE_KEY)
          }
        }
      } catch (error) {
        console.error('Erro ao carregar fazenda ativa:', error)
        localStorage.removeItem(STORAGE_KEY)
      } finally {
        setIsReady(true)
        setIsValidating(false)
      }
    }

    loadFazendaAtiva()
  }, [authReady, isAuthenticated])

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
