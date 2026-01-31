'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { list } from '@/services/fazendas'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { PageContainer } from '@/components/layout/PageContainer'
import { FazendaTable } from '@/components/fazendas/FazendaTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

function FazendasContent() {
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['fazendas'],
    queryFn: list,
  })

  return (
    <PageContainer variant="default">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Fazendas</CardTitle>
          <Button asChild>
            <Link href="/fazendas/nova">
              <Plus className="mr-2 h-4 w-4" />
              Nova Fazenda
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <p className="text-muted-foreground">Carregando…</p>
          )}
          {error && (
            <p className="text-destructive">
              Erro ao carregar fazendas. Tente novamente.
            </p>
          )}
          {!isLoading && !error && <FazendaTable items={items} />}
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
