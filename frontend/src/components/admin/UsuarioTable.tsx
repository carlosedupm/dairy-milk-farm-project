'use client'

import Link from 'next/link'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Usuario } from '@/services/admin'
import { toggleUsuarioEnabled } from '@/services/admin'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getApiErrorMessage } from '@/lib/errors'
import { useState } from 'react'

function perfilLabel(perfil: string): string {
  switch (perfil) {
    case 'ADMIN':
      return 'Administrador'
    case 'DEVELOPER':
      return 'Desenvolvedor'
    default:
      return 'Usuário'
  }
}

export function UsuarioTable({ items }: { items: Usuario[] }) {
  const queryClient = useQueryClient()
  const [error, setError] = useState('')

  const toggleMutation = useMutation({
    mutationFn: toggleUsuarioEnabled,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'usuarios'] })
      setError('')
    },
    onError: (err) => {
      setError(getApiErrorMessage(err, 'Erro ao alterar status.'))
    },
  })

  const handleToggle = (id: number) => {
    setError('')
    toggleMutation.mutate(id)
  }

  return (
    <div className="space-y-2">
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Perfil</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                Nenhum usuário cadastrado.
              </TableCell>
            </TableRow>
          ) : (
            items.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.nome}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{perfilLabel(u.perfil)}</TableCell>
                <TableCell>
                  <span
                    className={
                      u.enabled
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-muted-foreground'
                    }
                  >
                    {u.enabled ? 'Ativo' : 'Inativo'}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/usuarios/${u.id}/editar`}>Editar</Link>
                    </Button>
                    <Button
                      variant={u.enabled ? 'outline' : 'default'}
                      size="sm"
                      onClick={() => handleToggle(u.id)}
                      disabled={toggleMutation.isPending}
                    >
                      {u.enabled ? 'Desativar' : 'Ativar'}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
