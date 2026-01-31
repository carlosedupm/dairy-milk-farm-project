'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { create } from '@/services/producao'
import type { ProducaoCreate } from '@/services/producao'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { PageContainer } from '@/components/layout/PageContainer'
import { BackLink } from '@/components/layout/BackLink'
import { ProducaoForm } from '@/components/producao/ProducaoForm'

function NovaProducaoContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  
  // Permite pré-selecionar fazenda e animal via query params
  const defaultFazendaId = searchParams.get('fazenda_id')
    ? Number(searchParams.get('fazenda_id'))
    : undefined
  const defaultAnimalId = searchParams.get('animal_id')
    ? Number(searchParams.get('animal_id'))
    : undefined

  const mutation = useMutation({
    mutationFn: (p: ProducaoCreate) => create(p),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['producao'] })
      router.push('/producao')
    },
  })

  return (
    <PageContainer variant="narrow">
      <div className="mb-4">
        <BackLink href="/producao" />
      </div>
      <ProducaoForm
        onSubmit={async (p) => {
          await mutation.mutateAsync(p)
        }}
        isPending={mutation.isPending}
        submitLabel="Registrar"
        defaultFazendaId={defaultFazendaId}
        defaultAnimalId={defaultAnimalId}
      />
    </PageContainer>
  )
}

export default function NovaProducaoPage() {
  return (
    <ProtectedRoute>
      <NovaProducaoContent />
    </ProtectedRoute>
  )
}
