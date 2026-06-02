'use client'

import { Suspense, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { useFazendaAtiva } from '@/contexts/FazendaContext'
import { list, getMinhasFazendas } from '@/services/fazendas'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { PageContainer } from '@/components/layout/PageContainer'
import { FazendaTable } from '@/components/fazendas/FazendaTable'
import { FazendasListToolbar } from '@/components/fazendas/FazendasListToolbar'
import { EmptyFazendasState } from '@/components/fazendas/EmptyFazendasState'
import { EmptyState } from '@/components/ui/empty-state'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { getApiErrorMessage } from '@/lib/errors'
import { useFilterSync } from '@/hooks/useFilterSync'
import { formatListCountSuffix } from '@/lib/filter-url'
import { stringFilterField } from '@/lib/gestao-period-filter'
import {
  emptyFazendasFilterState,
  filterFazendas,
  hasActiveFazendasFilter,
} from '@/lib/fazendas-filter'

const fazendasFilterFields = [stringFilterField('q', 'q')]

function AdminFazendasList({
  items,
}: {
  items: import('@/services/fazendas').Fazenda[]
}) {
  const { filters, setFilters, clearFilters, hasActiveFilters } =
    useFilterSync({
      pathname: '/fazendas',
      defaults: emptyFazendasFilterState(),
      fields: fazendasFilterFields,
    })

  const filteredItems = useMemo(
    () => filterFazendas(items, filters.q),
    [items, filters.q],
  )

  const filtersActive = hasActiveFazendasFilter(filters.q)

  const titleSuffix = formatListCountSuffix({
    filtered: filteredItems.length,
    total: items.length,
    filtersActive,
  })

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>Fazendas{titleSuffix}</CardTitle>
        <Button asChild>
          <Link href="/fazendas/nova">
            <Plus className="mr-2 h-4 w-4" />
            Nova Fazenda
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <FazendasListToolbar
          values={filters}
          onChange={setFilters}
          onClear={clearFilters}
          hasActiveFilters={hasActiveFilters}
        />
        {filteredItems.length === 0 && filtersActive ? (
          <EmptyState
            title="Nenhuma fazenda encontrada"
            description="Nenhuma fazenda corresponde ao nome buscado."
            primaryAction={{
              label: 'Limpar filtros',
              onClick: clearFilters,
            }}
          />
        ) : (
          <FazendaTable items={filteredItems} />
        )}
      </CardContent>
    </Card>
  )
}

function FazendasContent() {
  const { user } = useAuth()
  const { fazendaAtiva, isReady: fazendaReady } = useFazendaAtiva()
  const isAdmin = user?.perfil === 'ADMIN' || user?.perfil === 'DEVELOPER'
  const hasRedirected = useRef(false)

  const { data: items = [], isLoading, error, refetch } = useQuery({
    queryKey: isAdmin ? ['fazendas'] : ['me', 'fazendas'],
    queryFn: isAdmin ? list : getMinhasFazendas,
  })

  useEffect(() => {
    if (isAdmin) return

    if (hasRedirected.current) return
    if (isLoading || !fazendaReady) return
    if (error) return

    if (items.length === 0) {
      hasRedirected.current = true
      window.location.href = '/onboarding'
      return
    }

    if (items.length === 1) {
      hasRedirected.current = true
      window.location.href = '/'
      return
    }

    if (items.length > 1 && !fazendaAtiva) {
      hasRedirected.current = true
      window.location.href = '/fazendas/selecionar'
      return
    }

    if (fazendaAtiva) {
      hasRedirected.current = true
      window.location.href = '/'
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
            <EmptyState
              variant="error"
              title="Não foi possível carregar os dados"
              description={getApiErrorMessage(
                error,
                'Erro ao carregar fazendas. Tente novamente.',
              )}
              primaryAction={{
                label: 'Tentar novamente',
                onClick: () => void refetch(),
              }}
            />
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
      <Suspense
        fallback={
          <Card>
            <CardContent className="py-8">
              <p className="text-muted-foreground text-center">Carregando…</p>
            </CardContent>
          </Card>
        }
      >
        <AdminFazendasList items={items} />
      </Suspense>
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
