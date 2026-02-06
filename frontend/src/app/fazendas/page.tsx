'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { useFazendaAtiva } from '@/contexts/FazendaContext'
import { list, getMinhasFazendas } from '@/services/fazendas'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { PageContainer } from '@/components/layout/PageContainer'
import { FazendaTable } from '@/components/fazendas/FazendaTable'
import { EmptyFazendasState } from '@/components/fazendas/EmptyFazendasState'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

function FazendasContent() {
  const { user } = useAuth()
  const { fazendaAtiva, isReady: fazendaReady } = useFazendaAtiva()
  const router = useRouter()
  const isAdmin = user?.perfil === 'ADMIN' || user?.perfil === 'DEVELOPER'
  const hasRedirected = useRef(false)

  // USER vê apenas fazendas vinculadas, ADMIN vê todas
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: isAdmin ? ['fazendas'] : ['me', 'fazendas'],
    queryFn: isAdmin ? list : getMinhasFazendas,
  })

  // Redirecionamento inteligente baseado no número de fazendas (apenas para USER)
  useEffect(() => {
    // ADMIN sempre vê a lista completa
    if (isAdmin) return
    
    if (hasRedirected.current) return
    if (isLoading || !fazendaReady) return
    if (error) return

    // Se não tem fazendas, redirecionar para onboarding
    if (items.length === 0) {
      hasRedirected.current = true
      window.location.href = '/onboarding'
      return
    }

    // Se tem apenas uma fazenda (USER), redirecionar para detalhes
    if (items.length === 1) {
      hasRedirected.current = true
      window.location.href = `/fazendas/${items[0].id}/animais`
      return
    }

    // Se tem múltiplas fazendas e não tem uma ativa, redirecionar para seleção
    if (items.length > 1 && !fazendaAtiva) {
      hasRedirected.current = true
      window.location.href = '/fazendas/selecionar'
      return
    }

    // Se tem fazenda ativa, redirecionar para detalhes dela
    if (fazendaAtiva) {
      hasRedirected.current = true
      window.location.href = `/fazendas/${fazendaAtiva.id}/animais`
      return
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, items.length, error, fazendaReady, fazendaAtiva?.id, isAdmin])

  if (isLoading) {
    return (
      <PageContainer variant="default">
        <Card>
          <CardContent className="py-8">
            <p className="text-muted-foreground text-center">Carregando…</p>
          </CardContent>
        </Card>
      </PageContainer>
    )
  }

  if (!isAdmin) {
    return (
      <PageContainer variant="default">
        <Card>
          <CardContent className="py-8">
            <p className="text-muted-foreground text-center">Redirecionando…</p>
          </CardContent>
        </Card>
      </PageContainer>
    )
  }

  if (error) {
    return (
      <PageContainer variant="default">
        <Card>
          <CardContent className="py-8">
            <p className="text-destructive text-center">
              Erro ao carregar fazendas. Tente novamente.
            </p>
          </CardContent>
        </Card>
      </PageContainer>
    )
  }

  // Se USER está sendo redirecionado, mostrar loading
  if (!isAdmin && hasRedirected.current && (items.length === 1 || fazendaAtiva)) {
    return (
      <PageContainer variant="default">
        <Card>
          <CardContent className="py-8">
            <p className="text-muted-foreground text-center">Redirecionando…</p>
          </CardContent>
        </Card>
      </PageContainer>
    )
  }

  if (items.length === 0) {
    return (
      <PageContainer variant="default">
        <Card>
          <CardContent className="py-8">
            <EmptyFazendasState isAdmin={isAdmin} />
          </CardContent>
        </Card>
      </PageContainer>
    )
  }

  return (
    <PageContainer variant="default">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>
            {isAdmin ? 'Fazendas' : 'Minhas Fazendas'}
          </CardTitle>
          {isAdmin && (
            <Button asChild>
              <Link href="/fazendas/nova">
                <Plus className="mr-2 h-4 w-4" />
                Nova Fazenda
              </Link>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <FazendaTable items={items} />
        </CardContent>
      </Card>
    </PageContainer>
  )
}

export default function FazendasPage() {
  return (
    <ProtectedRoute>
      <FazendasContent />
    </ProtectedRoute>
  )
}
