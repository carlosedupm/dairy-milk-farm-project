'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { list } from '@/services/producao'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { PageContainer } from '@/components/layout/PageContainer'
import { ListCardLayout } from '@/components/layout/ListCardLayout'
import { QueryListContent } from '@/components/layout/QueryListContent'
import { ProducaoTable } from '@/components/producao/ProducaoTable'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

function ProducaoContent() {
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['producao'],
    queryFn: list,
  })

  return (
    <PageContainer variant="default">
      <ListCardLayout
        title="Produção de Leite"
        action={
          <Button asChild>
            <Link href="/producao/novo">
              <Plus className="mr-2 h-4 w-4" />
              Registrar Produção
            </Link>
          </Button>
        }
      >
        <QueryListContent
          isLoading={isLoading}
          error={error}
          errorFallback="Erro ao carregar registros de produção. Tente novamente."
        >
          <ProducaoTable items={items} />
        </QueryListContent>
      </ListCardLayout>
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
