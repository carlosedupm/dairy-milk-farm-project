'use client'

import { useRouter, useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { get, update } from '@/services/animais'
import type { AnimalUpdate } from '@/services/animais'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { PageContainer } from '@/components/layout/PageContainer'
import { BackLink } from '@/components/layout/BackLink'
import { AnimalEditarBloqueadoGuard } from '@/components/animais/AnimalEditarBloqueadoGuard'
import { AnimalForm } from '@/components/animais/AnimalForm'
import { toast } from '@/hooks/use-toast'

function EditarAnimalContent() {
  const params = useParams()
  const id = Number(params.id)
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: initial, isLoading, error } = useQuery({
    queryKey: ['animais', id],
    queryFn: () => get(id),
    enabled: !Number.isNaN(id),
  })

  const mutation = useMutation({
    mutationFn: (p: AnimalUpdate) => update(id, p),
    onSuccess: () => {
      toast.success('Animal atualizado')
      queryClient.invalidateQueries({ queryKey: ['animais'] })
      router.push('/animais')
    },
  })

  if (Number.isNaN(id)) {
    return (
      <PageContainer variant="narrow">
        <p className="text-destructive">ID inválido.</p>
        <BackLink href="/animais">Voltar</BackLink>
      </PageContainer>
    )
  }

  if (isLoading || (!error && !initial)) {
    return (
      <PageContainer variant="narrow">
        <p className="text-muted-foreground">Carregando…</p>
      </PageContainer>
    )
  }

  if (error || !initial) {
    return (
      <PageContainer variant="narrow">
        <p className="text-destructive">Animal não encontrado.</p>
        <BackLink href="/animais">Voltar</BackLink>
      </PageContainer>
    )
  }

  return (
    <AnimalEditarBloqueadoGuard
      animal={initial}
      backHref={`/animais/${id}`}
    >
      <PageContainer variant="narrow">
        <div className="mb-4">
          <BackLink href={`/animais/${id}`} />
        </div>
        <AnimalForm
          initial={initial}
          onSubmit={async (p) => {
            await mutation.mutateAsync(p)
          }}
          isPending={mutation.isPending}
        />
      </PageContainer>
    </AnimalEditarBloqueadoGuard>
  )
}

export default function EditarAnimalPage() {
  return (
    <ProtectedRoute>
      <EditarAnimalContent />
    </ProtectedRoute>
  )
}
