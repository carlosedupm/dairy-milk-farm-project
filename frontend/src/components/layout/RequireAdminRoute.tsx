'use client'

import type { ReactNode } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ProtectedRoute } from './ProtectedRoute'
import { PageContainer } from './PageContainer'

export function isAdmin(user: { perfil: string } | null): boolean {
  if (!user) return false
  return user.perfil === 'ADMIN' || user.perfil === 'DEVELOPER'
}

export function RequireAdminRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth()

  if (!isAdmin(user)) {
    return (
      <ProtectedRoute>
        <PageContainer variant="centered">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Acesso Negado</h1>
            <p className="text-muted-foreground">
              Apenas usuários com perfil ADMIN ou DEVELOPER podem acessar esta área.
            </p>
          </div>
        </PageContainer>
      </ProtectedRoute>
    )
  }

  return <ProtectedRoute>{children}</ProtectedRoute>
}
