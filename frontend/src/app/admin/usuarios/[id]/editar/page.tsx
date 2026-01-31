'use client'

import { useRouter, useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listUsuarios, updateUsuario } from '@/services/admin'
import type { UsuarioUpdate } from '@/services/admin'
import { RequireAdminRoute } from '@/components/layout/RequireAdminRoute'
import { PageContainer } from '@/components/layout/PageContainer'
import { BackLink } from '@/components/layout/BackLink'
import { UsuarioForm } from '@/components/admin/UsuarioForm'

function AdminUsuarioEditarContent({ id }: { id: number }) {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'usuarios'],
    queryFn: () => listUsuarios({ limit: 200, offset: 0 }),
  })

  const usuario = data?.usuarios.find((u) => u.id === id) ?? null

  const updateMutation = useMutation({
    mutationFn: (payload: UsuarioUpdate) => updateUsuario(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'usuarios'] })
      router.push('/admin/usuarios')
    },
  })

  const handleSubmit = async (
    payload: UsuarioUpdate & { senha?: string; enabled?: boolean }
  ) => {
    await updateMutation.mutateAsync({
      nome: payload.nome,
      email: payload.email,
      senha: payload.senha,
      perfil: payload.perfil,
      enabled: payload.enabled,
    })
  }

  if (isLoading) {
    return <p className="text-muted-foreground">Carregando…</p>
  }

  if (error || !usuario) {
    return (
      <PageContainer variant="narrow">
        <BackLink href="/admin/usuarios">Voltar</BackLink>
        <p className="text-destructive">Usuário não encontrado.</p>
      </PageContainer>
    )
  }

  return (
    <PageContainer variant="narrow">
      <BackLink href="/admin/usuarios">Voltar</BackLink>
      <UsuarioForm
        initial={usuario}
        onSubmit={handleSubmit}
        isPending={updateMutation.isPending}
      />
    </PageContainer>
  )
}

export default function AdminUsuarioEditarPage() {
  const params = useParams()
  const id = params?.id ? parseInt(String(params.id), 10) : NaN

  if (isNaN(id)) {
    return (
      <RequireAdminRoute>
        <PageContainer variant="narrow">
          <BackLink href="/admin/usuarios">Voltar</BackLink>
          <p className="text-destructive">ID inválido.</p>
        </PageContainer>
      </RequireAdminRoute>
    )
  }

  return (
    <RequireAdminRoute>
      <AdminUsuarioEditarContent id={id} />
    </RequireAdminRoute>
  )
}
