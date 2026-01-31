'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { create } from '@/services/animais'
import type { AnimalCreate } from '@/services/animais'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { PageContainer } from '@/components/layout/PageContainer'
import { BackLink } from '@/components/layout/BackLink'
import { AnimalForm } from '@/components/animais/AnimalForm'

function NovoAnimalContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  
  // Permite pré-selecionar fazenda via query param ?fazenda_id=X
  const defaultFazendaId = searchParams.get('fazenda_id')
    ? Number(searchParams.get('fazenda_id'))
    : undefined

  const mutation = useMutation({
    mutationFn: (p: AnimalCreate) => create(p),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['animais'] })
      router.push('/animais')
    },
  })

  return (
    <PageContainer variant="narrow">
      <div className="mb-4">
        <BackLink href="/animais" />
      </div>
      <AnimalForm
        onSubmit={async (p) => {
          await mutation.mutateAsync(p)
        }}
        isPending={mutation.isPending}
        submitLabel="Criar"
        defaultFazendaId={defaultFazendaId}
      />
    </PageContainer>
  )
}

export default function NovoAnimalPage() {
  return (
    <ProtectedRoute>
      <NovoAnimalContent />
    </ProtectedRoute>
  )
}
