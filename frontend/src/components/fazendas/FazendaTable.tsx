'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { useFazendaAtiva } from '@/contexts/FazendaContext'
import type { Fazenda } from '@/services/fazendas'
import { remove } from '@/services/fazendas'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Check } from 'lucide-react'
import { MobileListCard } from '@/components/layout/list/MobileListCard'
import { ListRowActionsMenu } from '@/components/layout/list/ListRowActionsMenu'
import { ResponsiveListContainer } from '@/components/layout/list/ResponsiveListContainer'
import { DeleteRecordDialog } from '@/components/layout/list/DeleteRecordDialog'

export function FazendaTable({ items }: { items: Fazenda[] }) {
  const { user } = useAuth()
  const { fazendaAtiva, setFazendaAtiva } = useFazendaAtiva()
  const router = useRouter()
  const queryClient = useQueryClient()
  const isAdmin = user?.perfil === 'ADMIN' || user?.perfil === 'DEVELOPER'
  const [deleteDialogOpenId, setDeleteDialogOpenId] = useState<number | null>(
    null
  )
  const deleteTarget = items.find((f) => f.id === deleteDialogOpenId)

  const deleteMutation = useMutation({
    mutationFn: remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fazendas'] })
      queryClient.invalidateQueries({ queryKey: ['me', 'fazendas'] })
      setDeleteDialogOpenId(null)
    },
  })

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id)
  }

  const handleSelect = async (fazenda: Fazenda) => {
    try {
      await setFazendaAtiva(fazenda)
      router.push(`/fazendas/${fazenda.id}`)
    } catch (error) {
      console.error('Erro ao selecionar fazenda:', error)
    }
  }

  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        Nenhuma fazenda cadastrada.
      </p>
    )
  }

  return (
    <>
      <ResponsiveListContainer
        mobile={items.map((f) => {
          const isActive = fazendaAtiva?.id === f.id
          const title = (
            <span className="inline-flex flex-wrap items-center gap-2">
              {f.nome}
              {isActive ? (
                <Badge variant="default" className="text-xs">
                  <Check className="h-3 w-3 mr-1" aria-hidden />
                  Ativa
                </Badge>
              ) : null}
            </span>
          )
          if (isAdmin) {
            return (
              <MobileListCard
                key={f.id}
                href={`/fazendas/${f.id}/editar`}
                title={title}
                subtitle={f.localizacao ?? '—'}
                meta={
                  <span className="text-muted-foreground">
                    {f.quantidade_vacas} vacas
                  </span>
                }
                actions={
                  <ListRowActionsMenu
                    items={[
                      {
                        label: 'Excluir',
                        variant: 'destructive',
                        onSelect: () => setDeleteDialogOpenId(f.id),
                      },
                    ]}
                  />
                }
              />
            )
          }
          return (
            <MobileListCard
              key={f.id}
              onPrimaryClick={() => handleSelect(f)}
              title={title}
              subtitle={f.localizacao ?? '—'}
              meta={
                <span className="text-muted-foreground">
                  {f.quantidade_vacas} vacas ·{' '}
                  {isActive ? 'Em uso' : 'Toque para selecionar'}
                </span>
              }
            />
          )
        })}
        desktop={
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead>Vacas</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((f) => {
                  const isActive = fazendaAtiva?.id === f.id
                  return (
                    <TableRow
                      key={f.id}
                      className={isActive ? 'bg-accent/50' : ''}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {f.nome}
                          {isActive && (
                            <Badge variant="default" className="text-xs">
                              <Check className="h-3 w-3 mr-1" />
                              Ativa
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{f.localizacao ?? '—'}</TableCell>
                      <TableCell>{f.quantidade_vacas}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {isAdmin ? (
                            <>
                              <Button variant="outline" size="sm" asChild>
                                <Link href={`/fazendas/${f.id}/editar`}>
                                  Editar
                                </Link>
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setDeleteDialogOpenId(f.id)}
                              >
                                Excluir
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant={isActive ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => handleSelect(f)}
                            >
                              {isActive ? 'Em uso' : 'Selecionar'}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        }
      />
      {isAdmin && deleteTarget ? (
        <DeleteRecordDialog
          open={deleteDialogOpenId != null}
          onOpenChange={(open) => {
            if (!open) setDeleteDialogOpenId(null)
          }}
          title="Excluir fazenda"
          description={
            <>
              Tem certeza que deseja excluir &quot;{deleteTarget.nome}&quot;?
              Esta ação não pode ser desfeita.
            </>
          }
          onConfirm={() => handleDelete(deleteTarget.id)}
          isPending={deleteMutation.isPending}
        />
      ) : null}
    </>
  )
}
