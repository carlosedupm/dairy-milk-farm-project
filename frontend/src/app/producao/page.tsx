'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { list } from '@/services/producao'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { PageContainer } from '@/components/layout/PageContainer'
import { ProducaoTable } from '@/components/producao/ProducaoTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

function ProducaoContent() {
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['producao'],
    queryFn: list,
  })

  return (
    <PageContainer variant="default">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Produção de Leite</CardTitle>
          <Button asChild>
            <Link href="/producao/novo">
              <Plus className="mr-2 h-4 w-4" />
              Registrar Produção
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <p className="text-muted-foreground">Carregando…</p>
          )}
          {error && (
            <p className="text-destructive">
              Erro ao carregar registros de produção. Tente novamente.
            </p>
          )}
          {!isLoading && !error && <ProducaoTable items={items} />}
        </CardContent>
      </Card>
    </PageContainer>
  )
}

export default function ProducaoPage() {
  return (
    <ProtectedRoute>
      <ProducaoContent />
    </ProtectedRoute>
  )
}
