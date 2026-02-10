'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { AuthProvider } from '@/contexts/AuthContext'
import { AssistenteProvider } from '@/contexts/AssistenteContext'
import { FazendaProvider } from '@/contexts/FazendaContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { ServiceWorkerRegistration } from './ServiceWorkerRegistration'

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60 * 1000 },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <ServiceWorkerRegistration />
      <ThemeProvider>
        <AuthProvider>
          <AssistenteProvider>
            <FazendaProvider>{children}</FazendaProvider>
          </AssistenteProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
