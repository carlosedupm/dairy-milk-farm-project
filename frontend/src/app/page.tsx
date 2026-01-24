'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function Home() {
  const { isAuthenticated, isReady } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isReady) return
    if (isAuthenticated) {
      router.replace('/fazendas')
    } else {
      router.replace('/login')
    }
  }, [isReady, isAuthenticated, router])

  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">Carregando…</p>
    </main>
  )
}
