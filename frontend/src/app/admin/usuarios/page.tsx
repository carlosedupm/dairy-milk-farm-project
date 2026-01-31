'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { listUsuarios } from '@/services/admin'
import { RequireAdminRoute } from '@/components/layout/RequireAdminRoute'
import { PageContainer } from '@/components/layout/PageContainer'
import { BackLink } from '@/components/layout/BackLink'
import { UsuarioTable } from '@/components/admin/UsuarioTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Usuários ({total})</CardTitle>
          <Button asChild>
            <Link href="/admin/usuarios/novo">
              <Plus className="mr-2 h-4 w-4" />
              Novo Usuário
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-muted-foreground">Carregando…</p>}
          {error && (
            <p className="text-destructive">Erro ao carregar usuários. Tente novamente.</p>
          )}
          {!isLoading && !error && <UsuarioTable items={usuarios} />}
        </CardContent>
      </Card>
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
