'use client'

import { useRouter, useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { get, update } from '@/services/fazendas'
import type { FazendaUpdate } from '@/services/fazendas'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { FazendaForm } from '@/components/fazendas/FazendaForm'
import { Button } from '@/components/ui/button'

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
      <main className="mx-auto max-w-2xl px-4 py-6">
        <p className="text-destructive">ID inválido.</p>
        <Button variant="outline" asChild>
          <Link href="/fazendas">Voltar</Link>
        </Button>
      </main>
    )
  }

  if (isLoading || (!error && !initial)) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-6">
        <p className="text-muted-foreground">Carregando…</p>
      </main>
    )
  }

  if (error || !initial) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-6">
        <p className="text-destructive">Fazenda não encontrada.</p>
        <Button variant="outline" asChild>
          <Link href="/fazendas">Voltar</Link>
        </Button>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/fazendas">← Voltar</Link>
        </Button>
      </div>
      <FazendaForm
        initial={initial}
        onSubmit={async (p) => {
          await mutation.mutateAsync(p)
        }}
        isPending={mutation.isPending}
      />
    </main>
  )
}

export default function EditarFazendaPage() {
  return (
    <ProtectedRoute>
      <EditarFazendaContent />
    </ProtectedRoute>
  )
}
