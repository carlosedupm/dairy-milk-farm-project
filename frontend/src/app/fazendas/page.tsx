'use client'

import { useQuery } from '@tanstack/react-query'
import { list } from '@/services/fazendas'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { Header } from '@/components/layout/Header'
import { FazendaTable } from '@/components/fazendas/FazendaTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function FazendasContent() {
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['fazendas'],
    queryFn: list,
  })

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Fazendas</CardTitle>
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
      </main>
    </div>
  )
}

export default function FazendasPage() {
  return (
    <ProtectedRoute>
      <FazendasContent />
    </ProtectedRoute>
  )
}
