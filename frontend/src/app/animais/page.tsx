'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { list } from '@/services/animais'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { PageContainer } from '@/components/layout/PageContainer'
import { AnimalTable } from '@/components/animais/AnimalTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

function AnimaisContent() {
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['animais'],
    queryFn: list,
  })

  return (
    <PageContainer variant="default">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Animais</CardTitle>
          <Button asChild>
            <Link href="/animais/novo">
              <Plus className="mr-2 h-4 w-4" />
              Novo Animal
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <p className="text-muted-foreground">Carregando…</p>
          )}
          {error && (
            <p className="text-destructive">
              Erro ao carregar animais. Tente novamente.
            </p>
          )}
          {!isLoading && !error && <AnimalTable items={items} />}
        </CardContent>
      </Card>
    </PageContainer>
  )
}

export default function AnimaisPage() {
  return (
    <ProtectedRoute>
      <AnimaisContent />
    </ProtectedRoute>
  )
}
