'use client'

import Link from 'next/link'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Animal } from '@/services/animais'
import { remove, SEXO_LABELS, STATUS_SAUDE_LABELS, type Sexo, type StatusSaude } from '@/services/animais'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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

type Props = {
  items: Animal[]
  showFazenda?: boolean
}

const STATUS_VARIANT: Record<StatusSaude, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  SAUDAVEL: 'default',
  DOENTE: 'destructive',
  EM_TRATAMENTO: 'secondary',
}

export function AnimalTable({ items, showFazenda = false }: Props) {
  const queryClient = useQueryClient()
  const deleteMutation = useMutation({
    mutationFn: remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['animais'] })
    },
  })

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id)
  }

  const formatDate = (date?: string | null) => {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('pt-BR')
  }

  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Identificação</TableHead>
          <TableHead>Raça</TableHead>
          <TableHead>Sexo</TableHead>
          <TableHead>Saúde</TableHead>
          <TableHead>Nascimento</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
              Nenhum animal cadastrado.
            </TableCell>
          </TableRow>
        ) : (
          items.map((a) => (
            <TableRow key={a.id}>
              <TableCell className="font-medium">{a.identificacao}</TableCell>
              <TableCell>{a.raca ?? '—'}</TableCell>
              <TableCell>{a.sexo ? (SEXO_LABELS[a.sexo as Sexo] ?? a.sexo) : '—'}</TableCell>
              <TableCell>
                {a.status_saude ? (
                  <Badge variant={STATUS_VARIANT[a.status_saude as StatusSaude] ?? 'default'}>
                    {STATUS_SAUDE_LABELS[a.status_saude as StatusSaude] ?? a.status_saude}
                  </Badge>
                ) : (
                  '—'
                )}
              </TableCell>
              <TableCell>{formatDate(a.data_nascimento)}</TableCell>
              <TableCell className="text-right">
                <div className="flex flex-wrap justify-end gap-2">
                  <Button variant="outline" size="default" asChild>
                    <Link href={`/animais/${a.id}/editar`}>Editar</Link>
                  </Button>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="destructive" size="default">
                        Excluir
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Excluir animal</DialogTitle>
                        <DialogDescription>
                          Tem certeza que deseja excluir &quot;{a.identificacao}&quot;? Esta ação não
                          pode ser desfeita.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="outline">Cancelar</Button>
                        </DialogClose>
                        <Button
                          variant="destructive"
                          onClick={() => handleDelete(a.id)}
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
    </div>
  )
}
