'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { list } from '@/services/animais'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { PageContainer } from '@/components/layout/PageContainer'
import { ListCardLayout } from '@/components/layout/ListCardLayout'
import { QueryListContent } from '@/components/layout/QueryListContent'
import { AnimalTable } from '@/components/animais/AnimalTable'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

function AnimaisContent() {
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['animais'],
    queryFn: list,
  })

  return (
    <PageContainer variant="default">
      <ListCardLayout
        title="Animais"
        action={
          <Button asChild>
            <Link href="/animais/novo">
              <Plus className="mr-2 h-4 w-4" />
              Novo Animal
            </Link>
          </Button>
        }
      >
        <QueryListContent
          isLoading={isLoading}
          error={error}
          errorFallback="Erro ao carregar animais. Tente novamente."
        >
          <AnimalTable items={items} />
        </QueryListContent>
      </ListCardLayout>
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
