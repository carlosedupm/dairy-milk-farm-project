'use client'

import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { UsuarioCreate, UsuarioUpdate } from '@/services/admin'
import { createUsuario } from '@/services/admin'
import { RequireAdminRoute } from '@/components/layout/RequireAdminRoute'
import { PageContainer } from '@/components/layout/PageContainer'
import { BackLink } from '@/components/layout/BackLink'
import { UsuarioForm } from '@/components/admin/UsuarioForm'

export default function AdminUsuarioNovoPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: createUsuario,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'usuarios'] })
      router.push('/admin/usuarios')
    },
  })

  const handleSubmit = async (payload: UsuarioCreate | UsuarioUpdate) => {
    const p = payload as UsuarioCreate
    if (!p.senha) throw new Error('Senha é obrigatória')
    await createMutation.mutateAsync(p)
  }

  return (
    <RequireAdminRoute>
      <PageContainer variant="narrow">
        <BackLink href="/admin/usuarios">Voltar</BackLink>
        <UsuarioForm
          onSubmit={handleSubmit}
          isPending={createMutation.isPending}
          submitLabel="Criar usuário"
        />
      </PageContainer>
    </RequireAdminRoute>
  )
}
