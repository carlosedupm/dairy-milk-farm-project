'use client'

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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Check } from 'lucide-react'

export function FazendaTable({ items }: { items: Fazenda[] }) {
  const { user } = useAuth()
  const { fazendaAtiva, setFazendaAtiva } = useFazendaAtiva()
  const router = useRouter()
  const queryClient = useQueryClient()
  const isAdmin = user?.perfil === 'ADMIN' || user?.perfil === 'DEVELOPER'

  const deleteMutation = useMutation({
    mutationFn: remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fazendas'] })
      queryClient.invalidateQueries({ queryKey: ['me', 'fazendas'] })
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

  return (
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
        {items.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
              Nenhuma fazenda cadastrada.
            </TableCell>
          </TableRow>
        ) : (
          items.map((f) => {
            const isActive = fazendaAtiva?.id === f.id
            return (
              <TableRow key={f.id} className={isActive ? 'bg-accent/50' : ''}>
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
                          <Link href={`/fazendas/${f.id}/editar`}>Editar</Link>
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              Excluir
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Excluir fazenda</DialogTitle>
                              <DialogDescription>
                                Tem certeza que deseja excluir &quot;{f.nome}
                                &quot;? Esta ação não pode ser desfeita.
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <DialogClose asChild>
                                <Button variant="outline">Cancelar</Button>
                              </DialogClose>
                              <Button
                                variant="destructive"
                                onClick={() => handleDelete(f.id)}
                                disabled={deleteMutation.isPending}
                              >
                                {deleteMutation.isPending
                                  ? 'Excluindo…'
                                  : 'Excluir'}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
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
          })
        )}
      </TableBody>
    </Table>
    </div>
  )
}
