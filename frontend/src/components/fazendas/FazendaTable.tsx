'use client'

import Link from 'next/link'
import { useMutation, useQueryClient } from '@tanstack/react-query'
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

export function FazendaTable({ items }: { items: Fazenda[] }) {
  const queryClient = useQueryClient()
  const deleteMutation = useMutation({
    mutationFn: remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fazendas'] })
    },
  })

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id)
  }

  return (
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
          items.map((f) => (
            <TableRow key={f.id}>
              <TableCell className="font-medium">{f.nome}</TableCell>
              <TableCell>{f.localizacao ?? '—'}</TableCell>
              <TableCell>{f.quantidade_vacas}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
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
                          Tem certeza que deseja excluir &quot;{f.nome}&quot;? Esta ação não
                          pode ser desfeita.
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
                          {deleteMutation.isPending ? 'Excluindo…' : 'Excluir'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}
