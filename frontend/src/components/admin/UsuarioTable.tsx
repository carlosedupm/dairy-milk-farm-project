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
import { toast } from '@/hooks/use-toast'
import { FormValidationAlert } from '@/components/ui/form-validation-alert'
import { useState } from 'react'
import { MobileListCard } from '@/components/layout/list/MobileListCard'
import { ListRowActionsMenu } from '@/components/layout/list/ListRowActionsMenu'
import { ResponsiveListContainer } from '@/components/layout/list/ResponsiveListContainer'

function perfilLabel(perfil: string): string {
  switch (perfil) {
    case 'FUNCIONARIO':
      return 'Funcionário'
    case 'GERENTE':
      return 'Gerente'
    case 'PROPRIETARIO':
      return 'Proprietário'
    case 'GESTAO':
      return 'Gestão'
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
      queryClient.invalidateQueries({
        queryKey: ['admin', 'usuarios', 'pendentes-provisao'],
      })
      setError('')
      toast.success('Status do utilizador atualizado')
    },
    onError: (err) => {
      setError(getApiErrorMessage(err, 'Erro ao alterar status.'))
      toast.error(getApiErrorMessage(err, 'Erro ao alterar status.'))
    },
  })

  const handleToggle = (id: number) => {
    setError('')
    toggleMutation.mutate(id)
  }

  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        Nenhum usuário cadastrado.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {error ? <FormValidationAlert message={error} /> : null}
      <ResponsiveListContainer
        mobile={items.map((u) => (
          <MobileListCard
            key={u.id}
            href={`/admin/usuarios/${u.id}/editar`}
            title={u.nome}
            subtitle={u.email}
            meta={
              <span
                className={
                  u.enabled
                    ? 'text-feedback-success'
                    : 'text-muted-foreground'
                }
              >
                {perfilLabel(u.perfil)} · {u.enabled ? 'Ativo' : 'Inativo'}
              </span>
            }
            actions={
              <ListRowActionsMenu
                items={[
                  {
                    label: u.enabled ? 'Desativar' : 'Ativar',
                    onSelect: () => handleToggle(u.id),
                    disabled: toggleMutation.isPending,
                  },
                ]}
              />
            }
          />
        ))}
        desktop={
          <div className="overflow-x-auto -mx-4 sm:mx-0">
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
                {items.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.nome}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{perfilLabel(u.perfil)}</TableCell>
                    <TableCell>
                      <span
                        className={
                          u.enabled
                            ? 'text-feedback-success'
                            : 'text-muted-foreground'
                        }
                      >
                        {u.enabled ? 'Ativo' : 'Inativo'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button variant="outline" size="default" asChild>
                          <Link href={`/admin/usuarios/${u.id}/editar`}>
                            Editar
                          </Link>
                        </Button>
                        <Button
                          variant={u.enabled ? 'outline' : 'default'}
                          size="default"
                          onClick={() => handleToggle(u.id)}
                          disabled={toggleMutation.isPending}
                        >
                          {u.enabled ? 'Desativar' : 'Ativar'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        }
      />
    </div>
  )
}
