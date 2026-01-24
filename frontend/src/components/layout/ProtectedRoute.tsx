'use client'

import { useEffect, type ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isReady } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isReady) return
    if (!isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname ?? '/')}`)
    }
  }, [isReady, isAuthenticated, router, pathname])

  if (!isReady || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">
          {!isReady ? 'Carregando…' : 'Redirecionando para login…'}
        </p>
      </div>
    )
  }

  return <>{children}</>
}
