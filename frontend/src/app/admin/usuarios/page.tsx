'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { listUsuarios } from '@/services/admin'
import { RequireAdminRoute } from '@/components/layout/RequireAdminRoute'
import { PageContainer } from '@/components/layout/PageContainer'
import { BackLink } from '@/components/layout/BackLink'
import { ListCardLayout } from '@/components/layout/ListCardLayout'
import { QueryListContent } from '@/components/layout/QueryListContent'
import { UsuarioTable } from '@/components/admin/UsuarioTable'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

function AdminUsuariosContent() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'usuarios'],
    queryFn: () => listUsuarios({ limit: 50, offset: 0 }),
  })

  const usuarios = data?.usuarios ?? []
  const total = data?.total ?? 0

  return (
    <PageContainer variant="default">
      <BackLink href="/">Voltar</BackLink>
      <ListCardLayout
        title={`Usuários (${total})`}
        action={
          <Button asChild>
            <Link href="/admin/usuarios/novo">
              <Plus className="mr-2 h-4 w-4" />
              Novo Usuário
            </Link>
          </Button>
        }
      >
        <QueryListContent
          isLoading={isLoading}
          error={error}
          errorFallback="Erro ao carregar usuários. Tente novamente."
        >
          <UsuarioTable items={usuarios} />
        </QueryListContent>
      </ListCardLayout>
    </PageContainer>
  )
}

export default function AdminUsuariosPage() {
  return (
    <RequireAdminRoute>
      <AdminUsuariosContent />
    </RequireAdminRoute>
  )
}
