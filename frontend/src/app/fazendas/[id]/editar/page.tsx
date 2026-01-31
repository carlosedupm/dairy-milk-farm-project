'use client'

import { useRouter, useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { get, update } from '@/services/fazendas'
import type { FazendaUpdate } from '@/services/fazendas'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { PageContainer } from '@/components/layout/PageContainer'
import { BackLink } from '@/components/layout/BackLink'
import { FazendaForm } from '@/components/fazendas/FazendaForm'

function EditarFazendaContent() {
  const params = useParams()
  const id = Number(params.id)
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: initial, isLoading, error } = useQuery({
    queryKey: ['fazendas', id],
    queryFn: () => get(id),
    enabled: !Number.isNaN(id),
  })

  const mutation = useMutation({
    mutationFn: (p: FazendaUpdate) => update(id, p),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fazendas'] })
      router.push('/fazendas')
    },
  })

  if (Number.isNaN(id)) {
    return (
      <PageContainer variant="narrow">
        <p className="text-destructive">ID inválido.</p>
        <BackLink href="/fazendas" children="Voltar" />
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
        <p className="text-destructive">Fazenda não encontrada.</p>
        <BackLink href="/fazendas" children="Voltar" />
      </PageContainer>
    )
  }

  return (
    <PageContainer variant="narrow">
      <div className="mb-4">
        <BackLink href="/fazendas" />
      </div>
      <FazendaForm
        initial={initial}
        onSubmit={async (p) => {
          await mutation.mutateAsync(p)
        }}
        isPending={mutation.isPending}
      />
    </PageContainer>
  )
}

export default function EditarFazendaPage() {
  return (
    <ProtectedRoute>
      <EditarFazendaContent />
    </ProtectedRoute>
  )
}
