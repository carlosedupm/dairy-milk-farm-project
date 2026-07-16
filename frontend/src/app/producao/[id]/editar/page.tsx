'use client'

import { useRouter, useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { get, update } from '@/services/producao'
import type { ProducaoUpdate } from '@/services/producao'
import { invalidateAnimalTimeline } from '@/services/animais'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { PageContainer } from '@/components/layout/PageContainer'
import { BackLink } from '@/components/layout/BackLink'
import { ProducaoForm } from '@/components/producao/ProducaoForm'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { canEditarProducao } from '@/config/appAccess'

function EditarProducaoContent() {
  const params = useParams()
  const id = Number(params.id)
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const readOnly = !canEditarProducao(user?.perfil)

  const { data: initial, isLoading, error } = useQuery({
    queryKey: ['producao', id],
    queryFn: () => get(id),
    enabled: !Number.isNaN(id),
  })

  const mutation = useMutation({
    mutationFn: (p: ProducaoUpdate) => update(id, p),
    onSuccess: (_data, variables) => {
      toast.success('Produção atualizada')
      queryClient.invalidateQueries({ queryKey: ['producao'] })
      queryClient.invalidateQueries({ queryKey: ['resumo-pecuario'] })
      if (variables.animal_id) {
        queryClient.invalidateQueries({
          queryKey: ['animais', variables.animal_id, 'contexto'],
        })
        invalidateAnimalTimeline(queryClient, variables.animal_id)
      }
      router.push('/producao')
    },
  })

  if (Number.isNaN(id)) {
    return (
      <PageContainer variant="narrow">
        <p className="text-destructive">ID inválido.</p>
        <BackLink href="/producao">Voltar</BackLink>
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
        <p className="text-destructive">Registro de produção não encontrado.</p>
        <BackLink href="/producao">Voltar</BackLink>
      </PageContainer>
    )
  }

  return (
    <PageContainer variant="narrow">
      <div className="mb-4">
        <BackLink href="/producao" />
      </div>
      <ProducaoForm
        initial={initial}
        readOnly={readOnly}
        onSubmit={async (p) => {
          if (readOnly) return
          await mutation.mutateAsync(p)
        }}
        isPending={mutation.isPending}
      />
    </PageContainer>
  )
}

export default function EditarProducaoPage() {
  return (
    <ProtectedRoute>
      <EditarProducaoContent />
    </ProtectedRoute>
  )
}
